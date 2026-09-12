#!/usr/bin/env python3
"""
Gina AI Factory — AudioCraft / MusicGen & Stem Separation CLI Engine
Location: scripts/music_generator.py

Supports:
1. Text-to-Music & Lyrics-to-Song via AudioCraft / MusicGen (Small 300M & Medium 1.5B)
2. Melody conditioning & AI Song Cover generation
3. Audio Continuation / Extension from timestamps
4. Audio Inpainting & Segment Regeneration
5. Vocal Removal & Stem Separation (Voice Isolator)
"""

import os
import sys
import json
import time
import argparse
import traceback
from pathlib import Path

def get_device():
    import torch
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"



def save_wav_pcm16(output_path, audio_tensor, sampling_rate):
    """Write a standard PCM-16 WAV without relying on torchaudio's optional backend dispatcher.

    Some torchaudio Windows installs have no registered save backend even though
    model inference works. MusicGen/AudioGen already return normalized float audio,
    so the stdlib wave writer is a reliable local-only fallback.
    """
    import wave
    import numpy as np
    import torch

    audio = audio_tensor.detach().cpu().to(torch.float32) if hasattr(audio_tensor, "detach") else audio_tensor
    if audio.dim() == 1:
        audio = audio.unsqueeze(0)
    # [channels, samples] -> [samples, channels]
    audio = audio.clamp(-1.0, 1.0).transpose(0, 1).contiguous().numpy()
    pcm = (audio * 32767.0).round().astype(np.int16).tobytes()
    channels = int(audio.shape[1]) if audio.ndim == 2 else 1
    with wave.open(str(output_path), "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(int(sampling_rate))
        wf.writeframes(pcm)

def load_audio_tensor(path):
    import torchaudio
    waveform, sr = torchaudio.load(path)
    import torch
    return waveform.to(dtype=torch.float32), sr

def concat_audio_segments(segments):
    import torch
    if not segments:
        raise RuntimeError("No audio segments were produced.")
    max_channels = max(int(x.shape[0]) for x in segments)
    normalized = []
    for x in segments:
        if x.shape[0] < max_channels:
            x = x.repeat(max_channels, 1)
        normalized.append(x)
    return torch.cat(normalized, dim=1)

def resample_audio(waveform, source_sr, target_sr):
    if source_sr == target_sr:
        return waveform
    import torchaudio
    return torchaudio.functional.resample(waveform, source_sr, target_sr)

def apply_audio_mode(args, generated, generated_sr):
    """Apply real audio-editing semantics around the AI-generated segment."""
    mode = args.mode
    ref = str(args.audio_ref or "").strip()
    if not ref or mode not in {"song_cover", "extend", "edit"}:
        return generated, generated_sr
    if not os.path.isfile(ref):
        raise RuntimeError(f"Audio reference does not exist: {ref}")
    source, source_sr = load_audio_tensor(ref)
    source = resample_audio(source, source_sr, generated_sr)
    generated = resample_audio(generated, generated_sr, generated_sr)
    if generated.shape[0] != source.shape[0]:
        if generated.shape[0] == 1:
            generated = generated.repeat(source.shape[0], 1)
        elif source.shape[0] == 1:
            source = source.repeat(generated.shape[0], 1)
    if mode == "extend":
        split = max(0, min(source.shape[1], int(float(args.split_start or 0) * generated_sr)))
        base = source[:, :split] if split > 0 else source
        return concat_audio_segments([base, generated]), generated_sr
    if mode == "edit":
        start = max(0, min(source.shape[1], int(float(args.split_start or 0) * generated_sr)))
        end_seconds = float(args.edit_end or 0)
        end = max(start, min(source.shape[1], int(end_seconds * generated_sr))) if end_seconds > 0 else start
        tail = source[:, end:]
        return concat_audio_segments([source[:, :start], generated, tail]), generated_sr
    # Song cover: preserve a quiet amount of the reference performance as a
    # melodic/vocal guide while the newly synthesized track supplies the cover.
    length = min(source.shape[1], generated.shape[1])
    mixed = generated[:, :length] * 0.88 + source[:, :length] * 0.12
    if generated.shape[1] > length:
        mixed = concat_audio_segments([mixed, generated[:, length:]])
    return mixed.clamp(-1.0, 1.0), generated_sr

def generate_music(args):
    print(f"[MusicGen Engine] Initializing generation mode: {args.mode}...")
    import torch
    import torchaudio

    device = get_device()
    print(f"[MusicGen Engine] Target compute device: {device}")
    if device == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        total_vram_mb = torch.cuda.get_device_properties(0).total_memory / (1024 * 1024)
        free_vram_mb = torch.cuda.memory_reserved(0) / (1024 * 1024)
        print(f"[MusicGen Engine] GPU: {gpu_name} (Total: {total_vram_mb:.0f}MB, Allocated: {free_vram_mb:.0f}MB)")

    # Model resolution
    model_id = args.model if args.model else "facebook/musicgen-small"
    model_cache_dir = args.cache_dir if args.cache_dir else "C:\\Gina_AI\\models\\audio"
    local_model_path = args.model_path or os.path.join(model_cache_dir, model_id.replace("/", "_"))
    if not os.path.isdir(local_model_path):
        raise RuntimeError(f"Local model directory does not exist: {local_model_path}. Generate will not download models.")
    os.makedirs(model_cache_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(args.output_path)), exist_ok=True)

    # Combine style and lyrics into a rich conditioning prompt
    prompt_components = []
    if args.song_name:
        prompt_components.append(f"Title: {args.song_name}")
    if args.style:
        prompt_components.append(args.style)
    if args.moods:
        prompt_components.append(f"Mood: {args.moods}")
    if args.tempo:
        prompt_components.append(f"Tempo: {args.tempo}")
    if args.negative_style:
        prompt_components.append(f"Avoid: {args.negative_style}")
    if args.lyrics and not args.no_vocals:
        clean_lyrics = args.lyrics.replace('\n', ' ').strip()
        prompt_components.append(f"Lyrics theme: {clean_lyrics[:300]}")
    elif args.no_vocals:
        prompt_components.append("instrumental backing track without vocals")

    if args.mode == "song_cover":
        prompt_components.append("AI cover re-imagination with a new arrangement inspired by the supplied reference track")
    elif args.mode == "extend":
        prompt_components.append("seamless continuation matching the supplied reference track's mood and arrangement")
    elif args.mode == "edit":
        prompt_components.append("replacement section matching the supplied reference track's style and energy")
    full_prompt = ", ".join(prompt_components) if prompt_components else "ambient electronic synthwave melody"
    print(f"[MusicGen Engine] Compiled Prompt: \"{full_prompt}\"")
    print(f"[Audio Lane] SEQUENTIAL=TRUE | CONCURRENCY=1 | NETWORK=DISABLED")
    print(f"[Audio Lane] Local model path: {local_model_path}")
    print(f"[MusicGen Engine] Target Duration: {args.duration}s | Guidance Scale: {args.guidance_scale} | Temp: {args.temperature}")

    # Audio synthesis pipeline
    success = False
    if not os.path.isdir(local_model_path):
        raise RuntimeError(f"Managed model path does not exist: {local_model_path}. Generate never downloads models.")
    model_is_audiogen = model_id == "facebook/audiogen-medium"
    # Gina's managed model directory is authoritative. Generation is explicitly
    # offline and receives the resolved local path; it must never fall back to
    # facebook/<repo-id> network resolution.
    os.environ["AUDIOCRAFT_CACHE_DIR"] = model_cache_dir
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    try:
        local_weights = [
            f for f in os.listdir(local_model_path)
            if os.path.isfile(os.path.join(local_model_path, f))
            and f.lower().endswith((".safetensors", ".bin", ".pt"))
            and os.path.getsize(os.path.join(local_model_path, f)) > 200 * 1024 * 1024
        ]
        print(f"[Audio Lane] Weight files: {', '.join(local_weights) if local_weights else 'NONE'}")
    except Exception:
        pass

    try:
        if model_is_audiogen:
            print(f"[AudioGen Engine] Loading local AudioGen Medium 1.5B from '{local_model_path}' (offline/local-only)...")
            from audiocraft.models import AudioGen
            model = AudioGen.get_pretrained(local_model_path, device=device)
            chunks = []
            remaining = max(1.0, float(args.duration))
            chunk_index = 0
            start_t = time.time()
            while remaining > 0.01:
                chunk_duration = min(30.0, remaining)
                model.set_generation_params(
                    duration=chunk_duration,
                    temperature=float(args.temperature),
                    cfg_coef=float(args.guidance_scale),
                )
                chunk_index += 1
                print(f"[AudioGen Engine] Model loaded. Generating chunk {chunk_index} ({chunk_duration:.1f}s)...")
                with torch.inference_mode():
                    wav = model.generate([full_prompt])
                chunk = wav[0].detach().cpu().to(torch.float32)
                if chunk.dim() == 1:
                    chunk = chunk.unsqueeze(0)
                chunks.append(chunk)
                remaining -= chunk_duration
            audio_tensor = concat_audio_segments(chunks)
            print(f"[AudioGen Engine] Synthesis completed in {time.time() - start_t:.2f}s! Sample rate: {model.sample_rate}Hz")
            audio_tensor, output_sr = apply_audio_mode(args, audio_tensor, model.sample_rate)
            save_wav_pcm16(args.output_path, audio_tensor, output_sr)
            print(f"[AudioGen Engine] Saved SFX/atmosphere master audio (PCM16 WAV): {args.output_path}")
            success = True
            if device == "cuda":
                del model
                del wav
                torch.cuda.empty_cache()
        else:
            from transformers import AutoProcessor, MusicgenForConditionalGeneration
            hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or None
            print(f"[MusicGen Engine] Loading local MusicGen '{model_id}' from '{local_model_path}' (offline/local-only)...")
            processor = AutoProcessor.from_pretrained(
                local_model_path, local_files_only=True
            )
            print("[MusicGen Engine] Processor ready. Loading neural weights into VRAM...")
            model = MusicgenForConditionalGeneration.from_pretrained(
                local_model_path,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                local_files_only=True
            ).to(device)

            inputs = processor(
                text=[full_prompt],
                padding=True,
                return_tensors="pt"
            ).to(device)

            # MusicGen is memory-safe when long requests are split into <=30s
            # sequential chunks. This also makes the UI's 8-minute duration real
            # instead of reporting a long duration for a 30s tensor.
            tokens_per_sec = 50
            remaining = max(1.0, float(args.duration))
            chunks = []
            chunk_index = 0
            start_t = time.time()
            while remaining > 0.01:
                chunk_duration = min(30.0, remaining)
                max_tokens = max(100, int(chunk_duration * tokens_per_sec))
                chunk_index += 1
                print(f"[MusicGen Engine] Generating chunk {chunk_index} ({chunk_duration:.1f}s, max_tokens={max_tokens})...")
                with torch.inference_mode():
                    audio_values = model.generate(
                        **inputs,
                        do_sample=True,
                        guidance_scale=float(args.guidance_scale),
                        max_new_tokens=max_tokens,
                        temperature=float(args.temperature)
                    )
                chunks.append(audio_values[0, 0].cpu().to(torch.float32))
                remaining -= chunk_duration

            sampling_rate = model.config.audio_encoder.sampling_rate
            audio_tensor = concat_audio_segments([c.unsqueeze(0) if c.dim() == 1 else c for c in chunks])
            target_samples = int(float(args.duration) * sampling_rate)
            audio_tensor = audio_tensor[:, :target_samples]
            audio_tensor, sampling_rate = apply_audio_mode(args, audio_tensor, sampling_rate)
            print(f"[MusicGen Engine] Synthesis completed in {time.time() - start_t:.2f}s! Sample rate: {sampling_rate}Hz")
            save_wav_pcm16(args.output_path, audio_tensor, sampling_rate)
            print(f"[MusicGen Engine] Saved master audio (PCM16 WAV): {args.output_path}")
            success = True

            if device == "cuda":
                del model
                del processor
                del inputs
                del audio_values
                torch.cuda.empty_cache()

    except Exception as e:
        print(f"[{ 'AudioGen' if model_is_audiogen else 'MusicGen' } Engine] Local generation error: {e}")
        traceback.print_exc()
        # Do NOT fall back to a synthetic fake track. A model/cache failure must be
        # visible to the dashboard so the user knows the requested model did not run.
        success = False

    output_meta = {
        "ok": success,
        "output_path": args.output_path,
        "duration": args.duration,
        "prompt": full_prompt,
        "model": model_id
    }
    print(f"JSON_RESULT:{json.dumps(output_meta)}")
    return success

def separate_stems(args):
    """Voice remover & stem separator using high-speed audio spectral filtering / torchaudio"""
    print(f"[Stem Separator] Processing input: {args.input_path}")
    import torch
    import torchaudio

    os.makedirs(args.output_dir, exist_ok=True)
    base_name = Path(args.input_path).stem
    vocals_path = os.path.join(args.output_dir, f"{base_name}_vocals.wav")
    instrumental_path = os.path.join(args.output_dir, f"{base_name}_instrumental.wav")

    waveform, sr = torchaudio.load(args.input_path)
    
    # Stereo to mid-side vocal extraction / phase cancellation
    if waveform.shape[0] >= 2:
        left = waveform[0:1]
        right = waveform[1:2]
        # Mid = center panned (typically lead vocals + bass)
        mid = (left + right) * 0.5
        # Side = wide stereo (typically guitars, synths, stereo reverbs)
        side = (left - right) * 0.5
        
        # High pass / bandpass center for vocals (200Hz to 4000Hz)
        import torchaudio.functional as F
        vocals_mono = F.bandpass_biquad(mid, sr, central_freq=1500.0, Q=0.8)
        vocals = torch.cat([vocals_mono, vocals_mono], dim=0)
        
        # Instrumental is original minus isolated vocals
        instrumental = waveform - (vocals * 0.75)
    else:
        # Mono file band filtering
        import torchaudio.functional as F
        vocals = F.bandpass_biquad(waveform, sr, central_freq=1500.0, Q=0.8)
        instrumental = waveform - (vocals * 0.7)

    torchaudio.save(vocals_path, vocals, sr)
    torchaudio.save(instrumental_path, instrumental, sr)
    print(f"[Stem Separator] Vocals saved: {vocals_path}")
    print(f"[Stem Separator] Instrumental saved: {instrumental_path}")

    res = {
        "ok": True,
        "vocals_path": vocals_path,
        "instrumental_path": instrumental_path
    }
    print(f"JSON_RESULT:{json.dumps(res)}")

def main():
    parser = argparse.ArgumentParser(description="Gina AI Factory MusicGen & Stem Engine")
    subparsers = parser.add_subparsers(dest="command")

    gen_parser = subparsers.add_parser("generate")
    gen_parser.add_argument("--mode", type=str, default="text_to_song", choices=["text_to_song", "lyrics_to_song", "song_cover", "extend", "edit"])
    gen_parser.add_argument("--song_name", type=str, default="")
    gen_parser.add_argument("--style", type=str, default="")
    gen_parser.add_argument("--moods", type=str, default="")
    gen_parser.add_argument("--tempo", type=str, default="")
    gen_parser.add_argument("--lyrics", type=str, default="")
    gen_parser.add_argument("--negative_style", type=str, default="")
    gen_parser.add_argument("--vocal_type", type=str, default="Surprise Me")
    gen_parser.add_argument("--no_vocals", action="store_true")
    gen_parser.add_argument("--duration", type=float, default=15.0)
    gen_parser.add_argument("--model", type=str, default="facebook/musicgen-small")
    gen_parser.add_argument("--guidance_scale", type=float, default=3.0)
    gen_parser.add_argument("--temperature", type=float, default=1.0)
    gen_parser.add_argument("--cache_dir", type=str, default="C:\\Gina_AI\\models\\audio")
    gen_parser.add_argument("--model_path", type=str, default="", help="Authoritative Gina-managed local model directory; never download from Hub during generation")
    gen_parser.add_argument("--output_path", type=str, required=True)
    gen_parser.add_argument("--audio_ref", type=str, default="")
    gen_parser.add_argument("--split_start", type=float, default=0.0)
    gen_parser.add_argument("--edit_end", type=float, default=0.0)

    stem_parser = subparsers.add_parser("separate")
    stem_parser.add_argument("--input_path", type=str, required=True)
    stem_parser.add_argument("--output_dir", type=str, required=True)

    args = parser.parse_args()

    if args.command == "generate":
        ok = generate_music(args)
        sys.exit(0 if ok else 1)
    elif args.command == "separate":
        separate_stems(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
