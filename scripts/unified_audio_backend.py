#!/usr/bin/env python3
"""Unified local Bark + XTTS v2 audio backend.

Input is one JSON object on stdin. Output is one JSON object on stdout.
Models are downloaded by their native libraries on first use and remain local thereafter.
"""
from __future__ import annotations
import json
import math
import os
import random
import re
import sys
import tempfile
import warnings
from fractions import Fraction
from pathlib import Path
from typing import Any

# Set critical environment variables before any ML package imports
os.environ.setdefault("COQUI_TOS_AGREED", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("SUNO_USE_SMALL_MODELS", "True")
os.environ.setdefault("SUNO_OFFLOAD_CPU", "True")

# Suppress known benign deprecation and hub rate warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=r".*torch\.nn\.utils\.weight_norm.*deprecated.*")
warnings.filterwarnings("ignore", message=r".*torch\.cuda\.amp\.autocast.*")
warnings.filterwarnings("ignore", message=r".*unauthenticated requests to the HF Hub.*")

class FallbackBeamSearchScorer:
    """Fallback BeamSearchScorer satisfying XTTS GPT layer requirements when modern transformers omits it."""
    def __init__(self, batch_size: int = 1, max_length: int = 512, num_beams: int = 1, device: str = "cpu",
                 length_penalty: float = 1.0, do_early_stopping: bool = False, num_beam_hyps_to_keep: int = 1,
                 num_beam_groups: int = 1, **kwargs) -> None:
        self.batch_size = batch_size
        self.num_beams = num_beams
        self.device = device
        self.length_penalty = length_penalty
        self.do_early_stopping = do_early_stopping
        self.num_beam_hyps_to_keep = num_beam_hyps_to_keep
        self.num_beam_groups = num_beam_groups
        self._beam_hyps = [[] for _ in range(max(1, batch_size))]
        self._done = [False for _ in range(max(1, batch_size))]

    def is_done(self) -> bool:
        return all(self._done)

    def process(self, input_ids, next_scores, next_tokens, next_indices, **kwargs):
        return {
            "next_beam_scores": next_scores,
            "next_beam_tokens": next_tokens,
            "next_beam_indices": next_indices,
        }

    def finalize(self, input_ids, final_beam_scores, **kwargs):
        return input_ids


class FallbackLogitsWarper:
    """Fallback LogitsWarper for XTTS sequence generation."""
    def __init__(self, *args, **kwargs) -> None:
        pass

    def __call__(self, input_ids, scores):
        return scores


def apply_transformers_shim() -> None:
    """Ensure transformers exports BeamSearchScorer and LogitsWarper for XTTS GPT layers."""
    try:
        import transformers
    except Exception:
        return

    bss = getattr(transformers, "BeamSearchScorer", None)
    if bss is None:
        for mod_path in ("transformers.generation.beam_search", "transformers.generation", "transformers.generation.utils"):
            try:
                m = __import__(mod_path, fromlist=["BeamSearchScorer"])
                bss = getattr(m, "BeamSearchScorer", None)
                if bss is not None:
                    break
            except Exception:
                continue
    if bss is None:
        bss = FallbackBeamSearchScorer

    lw = getattr(transformers, "LogitsWarper", None)
    if lw is None:
        for mod_path in ("transformers.generation.logits_process", "transformers.generation", "transformers.generation.utils"):
            try:
                m = __import__(mod_path, fromlist=["LogitsWarper"])
                lw = getattr(m, "LogitsWarper", None)
                if lw is not None:
                    break
            except Exception:
                continue
    if lw is None:
        lw = FallbackLogitsWarper

    try:
        setattr(transformers, "BeamSearchScorer", bss)
        setattr(transformers, "LogitsWarper", lw)
        if hasattr(transformers, "_extra_objects") and isinstance(transformers._extra_objects, dict):
            transformers._extra_objects["BeamSearchScorer"] = bss
            transformers._extra_objects["LogitsWarper"] = lw
        for gen_mod_name in ("transformers.generation", "transformers.generation.utils", "transformers.generation.beam_search"):
            try:
                gmod = sys.modules.get(gen_mod_name)
                if gmod is None:
                    gmod = __import__(gen_mod_name, fromlist=["BeamSearchScorer"])
                if not hasattr(gmod, "BeamSearchScorer"):
                    setattr(gmod, "BeamSearchScorer", bss)
                if not hasattr(gmod, "LogitsWarper"):
                    setattr(gmod, "LogitsWarper", lw)
            except Exception:
                pass
    except Exception:
        pass


def apply_pytorch_utils_shim() -> None:
    """Ensure transformers.pytorch_utils exports isin_mps_friendly."""
    try:
        import transformers.pytorch_utils as ptu
        if not hasattr(ptu, "isin_mps_friendly"):
            import torch

            def isin_mps_friendly(elements, test_elements):
                if not torch.is_tensor(test_elements):
                    test_elements = torch.tensor(test_elements, device=elements.device)
                if elements.device.type == "mps":
                    return (elements[..., None] == test_elements.reshape(-1)).any(-1)
                return torch.isin(elements, test_elements)

            ptu.isin_mps_friendly = isin_mps_friendly
    except Exception:
        pass

apply_transformers_shim()
apply_pytorch_utils_shim()

ROOT = Path(os.environ.get("GINA_ROOT", r"C:\Gina_AI"))
OUTPUT_ROOT = ROOT / "media" / "unified_audio"
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

TAG_RE = re.compile(r"\[[^\]]*\]")
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


def emit_progress(stage: str, percent: int, message: str, **extra: Any) -> None:
    """Emit one machine-readable progress event without disturbing final JSON."""
    event = {"type": "progress", "stage": stage, "percent": max(0, min(100, int(percent))), "message": message}
    event.update({k: v for k, v in extra.items() if v is not None})
    print(json.dumps(event, ensure_ascii=False), flush=True)


def clamp(value: Any, low: float, high: float, default: float) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, n))


BARK_TAG_MAP = {
    r"\[applaud[s]?\]": "[applause]",
    r"\[clapping\]": "[applause]",
    r"\[cheer(ing|s)?\]": "[applause]",
    r"\[laughter in background\]": "[laughter]",
    r"\[giggle[s]?\]": "[laughter]",
    r"\[chuckle[s]?\]": "[laughter]",
    r"\[gasping\]": "[gasps]",
    r"\[gasp\]": "[gasps]",
    r"\[sighing\]": "[sighs]",
    r"\[sigh\]": "[sighs]",
    r"\[whisper(ing)?\]": "[whispers]",
    r"\[cough(ing)?\]": "[clears throat]",
    r"\[throat[- ]clear(ing)?\]": "[clears throat]",
    r"\[clear(s)?[- ]throat\]": "[clears throat]",
    r"\[singing\]": "♪",
    r"\[song\]": "♪",
}


def clean_text(text: str, engine: str, strip_tags: bool) -> str:
    value = str(text or "").strip()
    if engine.lower() in {"xtts", "xtts_v2", "xtts v2"} and strip_tags:
        value = TAG_RE.sub("", value)
    elif engine.lower() in {"bark", "suno_bark"}:
        # Standardize non-verbal tags to Bark's exact native token vocabulary
        for pattern, replacement in BARK_TAG_MAP.items():
            value = re.sub(pattern, replacement, value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", value).strip()


def choose_device(torch_module: Any) -> str:
    requested = os.environ.get("GINA_AUDIO_DEVICE", "auto").lower()
    if requested in {"cpu", "cuda"}:
        return requested if requested != "cuda" or torch_module.cuda.is_available() else "cpu"
    if not torch_module.cuda.is_available():
        return "cpu"
    try:
        free, total = torch_module.cuda.mem_get_info()
        # Keep a conservative reserve for the 8GB Gina VRAM cage and ComfyUI/LLM coexistence.
        if free >= 2.4 * 1024**3 and total >= 6 * 1024**3:
            return "cuda"
    except Exception:
        pass
    return "cpu"



def _resample_time_domain(samples, target_len: int):
    import numpy as np
    from scipy.signal import resample_poly
    target_len = max(1, int(target_len))
    if len(samples) == target_len:
        return samples.astype(np.float32, copy=False)
    ratio = Fraction(target_len, max(1, len(samples))).limit_denominator(1000)
    out = resample_poly(samples, ratio.numerator, ratio.denominator).astype(np.float32, copy=False)
    if len(out) != target_len:
        x_old = np.linspace(0.0, 1.0, len(out), endpoint=False)
        x_new = np.linspace(0.0, 1.0, target_len, endpoint=False)
        out = np.interp(x_new, x_old, out).astype(np.float32)
    return out


def pitch_shift_time_domain(samples, semitones: float):
    import numpy as np
    if abs(float(semitones)) < 1e-6 or len(samples) < 32:
        return samples.astype(np.float32, copy=False)
    ratio = 2.0 ** (float(semitones) / 12.0)
    # First resample changes the fundamental pitch; the second algebraic
    # time-domain resample restores the original duration without retaining
    # the playback-rate change.
    shifted_len = max(1, int(round(len(samples) / ratio)))
    shifted = _resample_time_domain(samples, shifted_len)
    return _resample_time_domain(shifted, len(samples))


def _phase_vocoder_time_stretch(samples, rate: float, sample_rate: int):
    import numpy as np
    from scipy.signal import stft, istft
    if abs(float(rate) - 1.0) < 1e-6 or len(samples) < 256:
        return samples.astype(np.float32, copy=False)
    nperseg = min(2048, max(512, 2 ** int(np.floor(np.log2(max(512, min(2048, len(samples))))))))
    noverlap = nperseg // 2
    hop = nperseg - noverlap
    _, _, z = stft(samples, fs=sample_rate, window='hann', nperseg=nperseg, noverlap=noverlap, boundary='zeros')
    magnitude = np.abs(z)
    phase = np.angle(z)
    omega = 2.0 * np.pi * np.arange(z.shape[0]) / nperseg
    time_steps = np.arange(0, z.shape[1], float(rate), dtype=np.float64)
    out = np.zeros((z.shape[0], len(time_steps)), dtype=np.complex128)
    phase_acc = phase[:, 0].copy()
    last_phase = phase[:, 0].copy()
    for col, step in enumerate(time_steps):
        idx = int(np.floor(step))
        frac = step - idx
        if idx >= z.shape[1] - 1:
            idx = z.shape[1] - 1
            frac = 0.0
        next_idx = min(idx + 1, z.shape[1] - 1)
        mag = (1.0 - frac) * magnitude[:, idx] + frac * magnitude[:, next_idx]
        current_phase = phase[:, idx]
        delta = current_phase - last_phase - omega * hop
        delta = (delta + np.pi) % (2.0 * np.pi) - np.pi
        true_freq = omega + delta / hop
        phase_acc += true_freq * hop
        out[:, col] = mag * np.exp(1j * phase_acc)
        last_phase = current_phase
    _, stretched = istft(out, fs=sample_rate, window='hann', nperseg=nperseg, noverlap=noverlap, input_onesided=True, boundary=True)
    return stretched.astype(np.float32, copy=False)


def formant_shift_spectral(samples, sample_rate: int, shift: float):
    import numpy as np
    from scipy.signal import stft, istft
    shift = float(shift)
    if abs(shift - 1.0) < 1e-6 or len(samples) < 256:
        return samples.astype(np.float32, copy=False)
    nperseg = min(2048, max(512, 2 ** int(np.floor(np.log2(max(512, min(2048, len(samples))))))))
    noverlap = nperseg // 2
    freqs, _, z = stft(samples, fs=sample_rate, window='hann', nperseg=nperseg, noverlap=noverlap, boundary='zeros')
    magnitude = np.abs(z)
    phase = np.angle(z)
    log_mag = np.log(np.maximum(magnitude, 1e-7))
    # Smooth the log spectral envelope along frequency, then warp the
    # envelope's frequency coordinate independently from harmonic phase.
    from scipy.ndimage import gaussian_filter1d
    envelope = gaussian_filter1d(log_mag, sigma=8, axis=0, mode='nearest')
    target_freq = np.clip(freqs / shift, freqs[0], freqs[-1])
    warped = np.empty_like(envelope)
    for frame in range(envelope.shape[1]):
        warped[:, frame] = np.interp(target_freq, freqs, envelope[:, frame])
    residual = log_mag - envelope
    shifted_log_mag = warped + residual
    shifted_mag = np.exp(shifted_log_mag)
    shifted = shifted_mag * np.exp(1j * phase)
    _, out = istft(shifted, fs=sample_rate, window='hann', nperseg=nperseg, noverlap=noverlap, input_onesided=True, boundary=True)
    out = out.astype(np.float32, copy=False)
    if len(out) != len(samples):
        out = _resample_time_domain(out, len(samples))
    return out


def apply_physical_manipulation(wav_path: Path, pitch_shift_semitones: float, formant_shift: float, speed_factor: float) -> None:
    import numpy as np
    from scipy.io import wavfile
    sample_rate, raw = wavfile.read(str(wav_path))
    if raw.ndim == 1:
        channels = [raw.astype(np.float32) / (32768.0 if raw.dtype.kind in 'iu' else 1.0)]
    else:
        scale = 32768.0 if raw.dtype.kind in 'iu' else 1.0
        channels = [raw[:, i].astype(np.float32) / scale for i in range(raw.shape[1])]
    processed = []
    for channel in channels:
        x = pitch_shift_time_domain(channel, pitch_shift_semitones)
        x = formant_shift_spectral(x, int(sample_rate), formant_shift)
        x = _phase_vocoder_time_stretch(x, speed_factor, int(sample_rate))
        processed.append(x)
    max_len = max(len(x) for x in processed)
    stacked = np.zeros((max_len, len(processed)), dtype=np.float32)
    for i, x in enumerate(processed):
        stacked[:len(x), i] = x
    peak = float(np.max(np.abs(stacked))) if stacked.size else 0.0
    if peak > 0.98:
        stacked *= 0.98 / peak
    output = np.clip(stacked * 32767.0, -32768, 32767).astype(np.int16)
    if output.shape[1] == 1:
        output = output[:, 0]
    wavfile.write(str(wav_path), int(sample_rate), output)


def apply_audio_postprocess(wav_path: Path, output_format: str, normalize: bool, trim_silence: bool, pitch_shift_semitones: float, formant_shift: float, speed_factor: float, target_path: Path) -> None:
    from pydub import AudioSegment
    from pydub.silence import detect_leading_silence

    apply_physical_manipulation(wav_path, pitch_shift_semitones, formant_shift, speed_factor)
    audio = AudioSegment.from_file(wav_path, format="wav")
    if trim_silence and len(audio) > 0:
        start = detect_leading_silence(audio, silence_threshold=-42, chunk_size=10)
        end = detect_leading_silence(audio.reverse(), silence_threshold=-42, chunk_size=10)
        left = min(start, max(0, len(audio) - 10))
        right = min(end, max(0, len(audio) - left - 10))
        audio = audio[left:len(audio) - right if right else len(audio)]
    if normalize and len(audio) > 0:
        change = -14.0 - audio.dBFS
        if math.isfinite(change):
            audio = audio.apply_gain(max(-12.0, min(12.0, change)))
    target_path.parent.mkdir(parents=True, exist_ok=True)
    fmt = output_format.lower()
    codec = "libmp3lame" if fmt == "mp3" else None
    audio.export(str(target_path), format=fmt, codec=codec)


def bark_generate(text: str, options: dict[str, Any], output_wav: Path, progress_base: int = 0, progress_span: int = 100, row_index: int | None = None, total_rows: int | None = None) -> None:
    # Suno's official package supports small-model mode, important on Gina's 8GB GPU.
    os.environ.setdefault("SUNO_USE_SMALL_MODELS", "True")
    os.environ.setdefault("SUNO_OFFLOAD_CPU", "True")
    import numpy as np
    import torch

    # PyTorch 2.6 changed torch.load() to default to weights_only=True.
    # Bark's official checkpoints contain objects (including NumPy scalar
    # types) that require the legacy unpickler. Bark is only used here with
    # its trusted official Suno checkpoints, so explicitly opt out of the
    # safe default for this one-shot Bark process rather than weakening
    # torch.load globally for the rest of Gina.
    original_torch_load = torch.load

    def bark_torch_load(*args: Any, **kwargs: Any):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        try:
            return original_torch_load(*args, **kwargs)
        except TypeError as exc:
            # Older PyTorch releases do not accept weights_only. Keep this
            # compatibility fallback narrowly scoped to that older signature.
            if "weights_only" in str(exc) and "unexpected keyword" in str(exc).lower():
                kwargs.pop("weights_only", None)
                return original_torch_load(*args, **kwargs)
            raise

    torch.load = bark_torch_load
    try:
        from bark import SAMPLE_RATE, generate_audio, preload_models
        from scipy.io.wavfile import write as write_wav
    
        try:
            from bark.generation import ALLOWED_PROMPTS
        except Exception:
            ALLOWED_PROMPTS = set()
    
        seed = int(options.get("seed", -1))
        locked = bool(options.get("seed_locked", False))
        if seed < 0 or not locked:
            seed = random.randint(0, 2**31 - 1)
        random.seed(seed)
        np.random.seed(seed % (2**32 - 1))
        try:
            torch.manual_seed(seed)
        except Exception:
            pass
        emit_progress("LOADING BARK", progress_base + int(progress_span * 0.15), "Loading Bark audio models…", engine="bark", row=row_index, total_rows=total_rows)
        preload_models()
        emit_progress("GENERATING BARK", progress_base + int(progress_span * 0.35), "Generating Bark speech / non-verbal audio…", engine="bark", row=row_index, total_rows=total_rows)
        temperature = clamp(options.get("temperature"), 0.1, 1.2, 0.7)
        voice = str(options.get("voice_preset") or "v2/en_speaker_6").strip()

        # Check if text is purely non-verbal tags or if user requested pure acoustic/SFX generation
        non_tag_text = TAG_RE.sub("", text).strip()
        is_pure_nonverbal = len(re.sub(r"[^\w]", "", non_tag_text)) == 0
        wants_unconditioned = (
            voice.lower() in {"none", "unconditioned", "pure_sfx", "sfx", "ambient", "no_speaker", "acoustic"}
            or options.get("pure_sfx") is True
            or options.get("clean_nonverbal") is True
            or (is_pure_nonverbal and options.get("force_voice") is not True)
        )

        history_prompt: str | None = None
        prompt_desc = "unconditioned pure SFX"
        if not wants_unconditioned:
            # In hybrid timelines a row can be set to Bark while inheriting a voice
            # that was actually picked for XTTS (e.g. "Ana Florence") -- those names
            # aren't valid Bark history prompts and Bark has no fallback of its own,
            # it just raises. Validate before calling generate_audio() so a mismatched
            # voice degrades to Bark's default speaker instead of failing the row.
            if not voice.startswith("v2/") and not os.path.isfile(voice) and not voice.endswith(".npz"):
                if re.match(r"^[a-z]{2}_speaker_\d+$", voice):
                    voice = f"v2/{voice}"

            is_valid_bark_prompt = (
                voice in ALLOWED_PROMPTS
                or voice.startswith("v2/")
                or os.path.isfile(voice)
                or voice.endswith(".npz")
            )
            if not is_valid_bark_prompt:
                print(
                    f"[Unified Audio] '{voice}' is not a Bark voice preset "
                    f"(it looks like an XTTS speaker name) -- falling back to v2/en_speaker_6 for this row.",
                    file=sys.stderr,
                )
                voice = "v2/en_speaker_6"
            history_prompt = voice
            prompt_desc = voice

        emit_progress("GENERATING BARK", progress_base + int(progress_span * 0.35), f"Generating Bark speech / audio ({prompt_desc})…", engine="bark", row=row_index, total_rows=total_rows)
        audio = generate_audio(text, history_prompt=history_prompt, text_temp=temperature, waveform_temp=temperature)
        emit_progress("WRITING BARK", progress_base + int(progress_span * 0.82), "Writing Bark waveform…", engine="bark", row=row_index, total_rows=total_rows)
        write_wav(str(output_wav), SAMPLE_RATE, audio)
    
    finally:
        # Do not leave the relaxed loader in the long-lived server process.
        torch.load = original_torch_load

def xtts_generate(text: str, options: dict[str, Any], output_wav: Path, progress_base: int = 0, progress_span: int = 100, row_index: int | None = None, total_rows: int | None = None) -> None:
    import torch
    from TTS.api import TTS

    device = choose_device(torch)
    emit_progress("LOADING XTTS", progress_base + int(progress_span * 0.15), "Loading XTTS v2 voice model…", engine="xtts_v2", row=row_index, total_rows=total_rows)
    use_gpu = (device == "cuda")
    try:
        model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=use_gpu)
    except TypeError:
        model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        if hasattr(model, "to") and not use_gpu and device != "cpu":
            try:
                model.to(device)
            except Exception:
                pass

    language = str(options.get("language") or "en").lower().strip()
    lang_map = {
        "english": "en", "spanish": "es", "french": "fr", "german": "de",
        "italian": "it", "portuguese": "pt", "polish": "pl", "turkish": "tr",
        "russian": "ru", "dutch": "nl", "czech": "cs", "arabic": "ar",
        "chinese": "zh-cn", "japanese": "ja", "hungarian": "hu", "korean": "ko", "hindi": "hi"
    }
    language = lang_map.get(language, language)

    speaker_wav = options.get("speaker_wav")
    speaker = options.get("speaker")

    avail_speakers = []
    if hasattr(model, "speakers") and model.speakers:
        avail_speakers = list(model.speakers)
    elif hasattr(model, "synthesizer") and hasattr(model.synthesizer, "tts_speakers") and model.synthesizer.tts_speakers:
        avail_speakers = list(model.synthesizer.tts_speakers)

    if speaker_wav:
        speaker_wav = str(speaker_wav)
        if not os.path.isfile(speaker_wav):
            raise FileNotFoundError(f"XTTS voice reference was not found: {speaker_wav}")
    elif speaker:
        speaker_str = str(speaker).strip()
        if avail_speakers:
            if speaker_str not in avail_speakers:
                match = next((s for s in avail_speakers if s.lower() == speaker_str.lower() or s.lower().replace(" ", "_") == speaker_str.lower().replace(" ", "_")), None)
                if match:
                    speaker = match
                else:
                    print(f"[Unified Audio] Speaker '{speaker_str}' not in XTTS speakers list. Falling back to '{avail_speakers[0]}'.", file=sys.stderr)
                    speaker = avail_speakers[0]
            else:
                speaker = speaker_str
    else:
        if avail_speakers:
            speaker = avail_speakers[0]
        else:
            speaker = "Ana Florence"

    kwargs: dict[str, Any] = {
        "text": text,
        "file_path": str(output_wav),
        "language": language,
        "split_sentences": bool(options.get("auto_split_chunks", True)),
        "temperature": clamp(options.get("temperature"), 0.1, 1.2, 0.7),
        "repetition_penalty": clamp(options.get("repetition_penalty"), 1.0, 3.0, 2.0),
        "length_penalty": clamp(options.get("length_penalty"), -1.0, 1.0, 0.0),
    }
    if speaker_wav:
        kwargs["speaker_wav"] = speaker_wav
    else:
        kwargs["speaker"] = speaker
    emit_progress("GENERATING XTTS", progress_base + int(progress_span * 0.38), "Generating the main spoken voice with XTTS v2…", engine="xtts_v2", row=row_index, total_rows=total_rows)
    try:
        model.tts_to_file(**kwargs)
    except TypeError:
        kwargs.pop("repetition_penalty", None)
        kwargs.pop("length_penalty", None)
        try:
            model.tts_to_file(**kwargs)
        except TypeError:
            kwargs.pop("temperature", None)
            model.tts_to_file(**kwargs)
    emit_progress("WRITING XTTS", progress_base + int(progress_span * 0.82), "XTTS voice render complete; writing waveform…", engine="xtts_v2", row=row_index, total_rows=total_rows)


def synthesize_row(row: dict[str, Any], global_options: dict[str, Any], workdir: Path, index: int, total_rows: int = 1) -> Path:
    engine = str(row.get("engine") or global_options.get("engine") or "bark").lower().replace(" ", "_")
    options = {**global_options, **row}
    text = clean_text(row.get("text", ""), engine, bool(global_options.get("strip_tags_on_xtts", True)))
    if not text:
        raise ValueError(f"Timeline row {index + 1} contains no synthesizable text.")
    wav = workdir / f"row_{index:04d}.wav"
    if engine in {"bark", "bark_v2"}:
        bark_generate(text, options, wav, progress_base=int(index * 100 / total_rows), progress_span=max(1, int(100 / total_rows)), row_index=index + 1, total_rows=total_rows)
    elif engine in {"xtts", "xtts_v2"}:
        xtts_generate(text, options, wav, progress_base=int(index * 100 / total_rows), progress_span=max(1, int(100 / total_rows)), row_index=index + 1, total_rows=total_rows)
    else:
        raise ValueError(f"Unsupported audio engine '{engine}'. Use Bark or XTTS v2.")
    if not wav.exists() or wav.stat().st_size == 0:
        raise RuntimeError(f"Audio engine '{engine}' returned an empty file for timeline row {index + 1}.")
    return wav


def main(payload: dict[str, Any]) -> dict[str, Any]:
    engine = str(payload.get("engine") or "bark").lower().replace(" ", "_")
    mode = str(payload.get("mode") or payload.get("pipeline_mode") or "standard").lower().replace(" ", "_")
    output_format = str(payload.get("output_format") or "wav").lower()
    if output_format not in {"wav", "mp3", "flac"}:
        raise ValueError("output_format must be WAV, MP3 or FLAC")
    options = {
        **payload,
        "engine": engine,
        "temperature": clamp(payload.get("temperature"), 0.1, 1.2, 0.7),
        "repetition_penalty": clamp(payload.get("repetition_penalty"), 1.0, 3.0, 2.0),
        "length_penalty": clamp(payload.get("length_penalty"), -1.0, 1.0, 0.0),
        "seed": int(payload.get("seed", -1)),
        "seed_locked": bool(payload.get("seed_locked", False)),
        "normalize": bool(payload.get("normalize", True)),
        "trim_silence": bool(payload.get("trim_silence", True)),
        "pitch_shift_semitones": clamp(payload.get("pitch_shift_semitones"), -12.0, 12.0, 0.0),
        "formant_shift": clamp(payload.get("formant_shift"), 0.5, 1.5, 1.0),
        "speed_factor": clamp(payload.get("speed_factor"), 0.5, 2.0, 1.0),
    }
    text = clean_text(payload.get("text", ""), engine, bool(options.get("strip_tags_on_xtts", True)))
    timeline = payload.get("timeline") if isinstance(payload.get("timeline"), list) else []
    workdir = Path(tempfile.mkdtemp(prefix="gina_audio_"))
    try:
        emit_progress("QUEUED", 2, "Audio generation started…", engine=engine, mode=mode)
        from pydub import AudioSegment
        emit_progress("PREPARING", 8, "Preparing local audio pipeline…", engine=engine, mode=mode)
        pieces: list[Path] = []
        if mode in {"hybrid", "stitched", "hybrid_stitched", "hybrid/stitched"}:
            if not timeline:
                raise ValueError("Hybrid/Stitched mode requires at least one timeline row.")
            total_rows = len(timeline)
            for index, row in enumerate(timeline):
                emit_progress("TIMELINE", int(index * 100 / total_rows), f"Processing timeline row {index + 1} of {total_rows}…", engine=str(row.get("engine") or engine), row=index + 1, total_rows=total_rows)
                pieces.append(synthesize_row(dict(row), options, workdir, index, total_rows))
            combined = AudioSegment.empty()
            gap_ms = max(0, min(5000, int(payload.get("row_gap_ms", 120))))
            for index, piece in enumerate(pieces):
                combined += AudioSegment.from_wav(piece)
                if index < len(pieces) - 1 and gap_ms:
                    combined += AudioSegment.silent(duration=gap_ms)
            emit_progress("STITCHING", 88, "Stitching XTTS speech and Bark non-verbal rows…", engine=engine, mode=mode)
            source_wav = workdir / "stitched.wav"
            combined.export(str(source_wav), format="wav")
        else:
            if not text:
                raise ValueError("Standard mode requires text.")
            source_wav = synthesize_row({"text": text, **options}, options, workdir, 0, 1)

        emit_progress("POST-PROCESSING", 92, "Applying final audio manipulation and export…", engine=engine, mode=mode)
        filename = f"gina_audio_{int(__import__('time').time() * 1000)}.{output_format}"
        target = OUTPUT_ROOT / filename
        apply_audio_postprocess(source_wav, output_format, bool(options["normalize"]), bool(options["trim_silence"]), float(options["pitch_shift_semitones"]), float(options["formant_shift"]), float(options["speed_factor"]), target)
        emit_progress("COMPLETE", 100, "Audio generation complete.", engine=engine, mode=mode, url=f"/media/unified-audio/{filename}")
        return {
            "ok": True,
            "engine": engine,
            "mode": mode,
            "format": output_format,
            "path": str(target),
            "url": f"/media/unified-audio/{filename}",
            "bytes": target.stat().st_size,
            "seed": options["seed"],
        }
    finally:
        for child in workdir.glob("*"):
            try:
                child.unlink()
            except OSError:
                pass
        try:
            workdir.rmdir()
        except OSError:
            pass


if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            raise ValueError("No input payload received on stdin.")
        payload = json.loads(raw_input)
        result = main(payload)
        print(json.dumps(result, ensure_ascii=False), flush=True)
    except Exception as exc:
        import traceback
        err_payload = {
            "ok": False,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(err_payload, ensure_ascii=False), flush=True)
        sys.stdout.flush()
        sys.stderr.flush()
        raise SystemExit(1)
