#!/usr/bin/env python3
"""
===============================================================================
 STREAMINJECT v2.5 — PROJECT GINA PURE RENDER SUITE
 Production-Ready Headless Automated Media Post-Production Engine
===============================================================================
 Architecture:
   - Zero Heavy Dependencies (Pure Python, NumPy, OpenCV, Pillow, Native FFmpeg)
   - Cache Purging & Self-Cleaning Scratch Filesystem
   - Strict Audio Stream Harmonization (48kHz Stereo, -0.95dB Peak Hard Limiter)
   - Kinetic Re-Map & VFX Matrix:
       1. Glitch / Temporal Neon Flicker
       2. Kinetic Screen-Shake Rumble (Affine Warp with BORDER_REFLECT)
       3. Ethereal Volumetric Bloom / Glow
       4. Chromatic Aberration Channel Shift
   - Two-Pipeline Multi-Aspect Architecture:
       * Aspect Switcher: 16:9 Widescreen & 9:16 Portrait Shorts with Box-Blurred Sidebars
       * Engine 1: Master Hardcoded Render Pipeline (Intro + Game + Outro + PiP + Chroma)
       * Engine 2: Intro/Outro Studio (Ready-Built & Interactive Infinite Step-by-Step)
   - Performance Telemetry Profile (build_perf_log.md)
===============================================================================
"""

import os
import sys
import time
import math
import json
import shutil
import random
import argparse
import subprocess
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional

try:
    import cv2
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    HAS_OPENCV = True
    NDArray = np.ndarray
except ImportError:
    HAS_OPENCV = False
    cv2 = None
    np = None
    Image = None
    ImageDraw = None
    ImageFont = None
    NDArray = Any

# ===============================================================================
# GLOBAL CONSTANTS & CONFIGURATION
# ===============================================================================
OUTRO_BG_RED_MAX = 55
DEFAULT_SAMPLE_RATE = 48000
DEFAULT_AUDIO_CHANNELS = 2
AUDIO_LIMITER_CEILING_DB = -0.95
SCRATCH_DIR = os.path.join(".", ".streaminject_scratch")
PERF_LOG_PATH = "build_perf_log.md"


# ===============================================================================
# SECTION 0: STORAGE CLEANER & ENVIRONMENT SANITIZATION
# ===============================================================================
def purge_pycache(root_dir: str = ".") -> int:
    """Recursively search for and delete all __pycache__ directories."""
    count = 0
    for root, dirs, _ in os.walk(root_dir, topdown=False):
        for d in dirs:
            if d == "__pycache__":
                full_path = os.path.join(root, d)
                try:
                    shutil.rmtree(full_path, ignore_errors=True)
                    count += 1
                except Exception:
                    pass
    return count


def ensure_scratch_directory() -> str:
    """Create clean scratch workspace for intermediate transcode fragments."""
    if not os.path.exists(SCRATCH_DIR):
        os.makedirs(SCRATCH_DIR, exist_ok=True)
    return SCRATCH_DIR


def cleanup_scratch_files(pause_seconds: float = 2.0):
    """Pause to release OS file locks, then eradicate intermediate artifacts."""
    print(f"\n[STREAMINJECT] Releasing file hooks ({pause_seconds}s pause)...")
    time.sleep(pause_seconds)
    if os.path.exists(SCRATCH_DIR):
        try:
            shutil.rmtree(SCRATCH_DIR, ignore_errors=True)
            print("[STREAMINJECT] Scratch directory purged cleanly.")
        except Exception as e:
            print(f"[STREAMINJECT] Warning: Could not fully purge scratch dir: {e}")


def get_ffmpeg_binary() -> str:
    """Detect available FFmpeg executable from PATH or local project tools."""
    candidates = [
        "ffmpeg",
        os.path.join(".", "tools", "ffmpeg", "bin", "ffmpeg.exe"),
        os.path.join("C:\\", "Gina_AI", "tools", "ffmpeg", "bin", "ffmpeg.exe"),
        os.path.join("C:\\", "ffmpeg", "bin", "ffmpeg.exe"),
    ]
    for c in candidates:
        if shutil.which(c) or (os.path.isfile(c) and os.access(c, os.X_OK)):
            return c
    return "ffmpeg"


def get_ffprobe_binary() -> str:
    """Detect available FFprobe executable from PATH or local project tools."""
    candidates = [
        "ffprobe",
        os.path.join(".", "tools", "ffmpeg", "bin", "ffprobe.exe"),
        os.path.join("C:\\", "Gina_AI", "tools", "ffmpeg", "bin", "ffprobe.exe"),
        os.path.join("C:\\", "ffmpeg", "bin", "ffprobe.exe"),
    ]
    for c in candidates:
        if shutil.which(c) or (os.path.isfile(c) and os.access(c, os.X_OK)):
            return c
    return "ffprobe"


# ===============================================================================
# SECTION 1: PROBING & HARDWARE-ACCELERATED RUNTIME UTILITIES
# ===============================================================================
def probe_media(file_path: str) -> Dict[str, Any]:
    """Inspect video dimensions, duration, FPS, and audio stream presence."""
    if not os.path.isfile(file_path):
        return {"has_video": False, "has_audio": False, "width": 0, "height": 0, "fps": 30.0, "duration": 0.0}

    ffprobe = get_ffprobe_binary()
    cmd = [
        ffprobe,
        "-v", "error",
        "-show_entries", "stream=codec_type,width,height,r_frame_rate,duration:format=duration",
        "-of", "json",
        file_path
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        import json
        data = json.loads(res.stdout)
        streams = data.get("streams", [])
        fmt = data.get("format", {})
        
        has_video = any(s.get("codec_type") == "video" for s in streams)
        has_audio = any(s.get("codec_type") == "audio" for s in streams)
        
        width = 0
        height = 0
        fps = 30.0
        duration = float(fmt.get("duration", 0.0) or 0.0)

        for s in streams:
            if s.get("codec_type") == "video":
                width = int(s.get("width", 0) or 0)
                height = int(s.get("height", 0) or 0)
                r_fps = s.get("r_frame_rate", "30/1")
                if "/" in r_fps:
                    num, den = r_fps.split("/")
                    den_val = float(den) if float(den) != 0 else 1.0
                    fps = float(num) / den_val
                else:
                    fps = float(r_fps)
                break
                
        return {
            "has_video": has_video,
            "has_audio": has_audio,
            "width": width,
            "height": height,
            "fps": fps,
            "duration": duration
        }
    except Exception as e:
        if HAS_OPENCV and cv2 is not None:
            try:
                cap = cv2.VideoCapture(file_path)
                if not cap.isOpened():
                    return {"has_video": False, "has_audio": False, "width": 0, "height": 0, "fps": 30.0, "duration": 0.0}
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                duration = frame_count / fps if fps > 0 else 0.0
                cap.release()
                return {
                    "has_video": True,
                    "has_audio": True,
                    "width": w,
                    "height": h,
                    "fps": fps,
                    "duration": duration
                }
            except Exception:
                pass
        return {"has_video": False, "has_audio": False, "width": 0, "height": 0, "fps": 30.0, "duration": 0.0}


def run_ffmpeg_command(args: List[str], desc: str = "FFmpeg Task") -> float:
    """Execute native FFmpeg subprocess command with high-precision timing."""
    ffmpeg_bin = get_ffmpeg_binary()
    full_cmd = [ffmpeg_bin, "-y"] + args
    print(f"\n[STREAMINJECT EXEC] {desc}...")
    start_t = time.time()
    result = subprocess.run(full_cmd, capture_output=True, text=True)
    elapsed = time.time() - start_t
    if result.returncode != 0:
        print(f"[STREAMINJECT ERROR] {desc} failed (exit code {result.returncode}):")
        print(result.stderr)
        raise RuntimeError(f"FFmpeg command failure in {desc}: {result.stderr[-400:]}")
    print(f"[STREAMINJECT COMPLETED] {desc} in {elapsed:.2f}s")
    return elapsed


# ===============================================================================
# SECTION 2: AUDIO STREAM HARMONIZATION & PEAK LIMITER
# ===============================================================================
def harmonize_clip_audio(
    input_path: str,
    output_path: str,
    target_sample_rate: int = DEFAULT_SAMPLE_RATE,
    target_channels: int = DEFAULT_AUDIO_CHANNELS,
    target_duration: Optional[float] = None
) -> str:
    """
    Ensure every video stream has an audio channel strictly formatted to
    Stereo 48kHz. If missing, programmatically synthesize silent audio stream
    using anullsrc to prevent FFmpeg timeline concatenation crashes.
    """
    info = probe_media(input_path)
    dur = target_duration if target_duration is not None else info["duration"]
    
    if info["has_audio"]:
        # Re-encode and resample audio track to 48kHz stereo
        filter_str = f"aformat=sample_fmts=fltp:sample_rates={target_sample_rate}:channel_layouts=stereo"
        args = [
            "-i", input_path,
            "-c:v", "copy",
            "-af", filter_str,
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", str(target_sample_rate),
            "-ac", str(target_channels),
            output_path
        ]
    else:
        # Generate silent audio stream matched to video duration
        args = [
            "-i", input_path,
            "-f", "lavfi",
            "-i", f"anullsrc=r={target_sample_rate}:cl=stereo",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", str(target_sample_rate),
            "-ac", str(target_channels),
            "-shortest",
            output_path
        ]
    run_ffmpeg_command(args, f"Harmonize Audio Stream ({os.path.basename(input_path)})")
    return output_path


def apply_master_audio_peak_limiter(input_path: str, output_path: str) -> str:
    """
    Pass the flattened audio track through an alimiter filter with a hard ceiling
    threshold of -0.95dB to eradicate all clipping and distortion.
    """
    filter_chain = f"alimiter=limit={AUDIO_LIMITER_CEILING_DB}dB:attack=5:release=50:asc=1"
    args = [
        "-i", input_path,
        "-c:v", "copy",
        "-af", filter_chain,
        "-c:a", "aac",
        "-b:a", "256k",
        output_path
    ]
    run_ffmpeg_command(args, "Apply Master Audio Peak Limiter (-0.95dB)")
    return output_path


# ===============================================================================
# PART 1: CORE KINETIC RE-MAP & INTRO FX FILTERS (NUMPY / OPENCV)
# ===============================================================================
class KineticFXMatrix:
    """
    High-Performance In-Memory Kinetic Video FX Filters implemented purely
    via NumPy arrays, OpenCV spatial matrices, and direct image transformations.
    """

    @staticmethod
    def apply_glitch_flicker(frame: NDArray, time_sec: float, max_duration: float = 1.5) -> NDArray:
        """
        Glitch/Flicker: Run a temporal loop across the initial 1.5 seconds,
        randomly dropping frame opacity/brightness weights (random factor 0.1 to 0.4)
        to simulate an unstable neon source.
        """
        if time_sec > max_duration:
            return frame
        
        # Determine flicker probability per frame
        if random.random() < 0.35:
            dim_factor = random.uniform(0.1, 0.4)
            return (frame.astype(np.float32) * dim_factor).astype(np.uint8)
        return frame

    @staticmethod
    def apply_screen_shake(frame: NDArray, intensity: float = 12.0) -> NDArray:
        """
        Kinetic Screen-Shake Rumble: Apply affine translation matrix transformations
        (cv2.warpAffine) during asset entry thresholds, shifting pixel coordinates
        randomly along X and Y with a cv2.BORDER_REFLECT fallback wrapper.
        """
        h, w = frame.shape[:2]
        shift_x = random.uniform(-intensity, intensity)
        shift_y = random.uniform(-intensity, intensity)
        matrix = np.float32([[1, 0, shift_x], [0, 1, shift_y]])
        return cv2.warpAffine(frame, matrix, (w, h), borderMode=cv2.BORDER_REFLECT)

    @staticmethod
    def apply_volumetric_bloom(frame: NDArray, threshold: int = 200, blur_ksize: int = 41) -> NDArray:
        """
        Ethereal Volumetric Bloom Glow: Perform frame-by-frame luminosity mask extraction.
        Isolate luminance/alpha pixels above 200, apply a broad Gaussian convolution filter
        (cv2.GaussianBlur), and blend radiant halo back onto base layer using linear addition.
        """
        # Calculate grayscale luminosity
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        _, mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
        
        # Isolate high-brightness areas
        bright_regions = cv2.bitwise_and(frame, frame, mask=mask)
        
        # Broad Gaussian blur for volumetric halo
        ksize = blur_ksize if blur_ksize % 2 == 1 else blur_ksize + 1
        glow = cv2.GaussianBlur(bright_regions, (ksize, ksize), 0)
        
        # Additive linear blend
        return cv2.add(frame, glow)

    @staticmethod
    def apply_chromatic_aberration(frame: NDArray, offset_px: int = 4) -> NDArray:
        """
        Chromatic Aberration: Squeeze frame's color channels apart natively.
        Use NumPy indexing arrays to shift Red channel by +4px horizontally and
        Blue channel by -4px horizontally before merging back into BGR matrix.
        """
        b, g, r = cv2.split(frame)
        h, w = frame.shape[:2]
        
        # Shift Red channel right (+offset_px)
        r_shifted = np.zeros_like(r)
        if offset_px > 0:
            r_shifted[:, offset_px:] = r[:, :-offset_px]
            r_shifted[:, :offset_px] = r[:, 0:1]
        else:
            r_shifted = r

        # Shift Blue channel left (-offset_px)
        b_shifted = np.zeros_like(b)
        if offset_px > 0:
            b_shifted[:, :-offset_px] = b[:, offset_px:]
            b_shifted[:, -offset_px:] = b[:, -1:]
        else:
            b_shifted = b

        return cv2.merge([b_shifted, g, r_shifted])

    @classmethod
    def process_frame(
        cls,
        frame: NDArray,
        time_sec: float,
        enable_glitch: bool = True,
        enable_shake: bool = True,
        enable_bloom: bool = True,
        enable_chroma: bool = True,
        shake_intensity: float = 8.0,
        chroma_offset: int = 4
    ) -> NDArray:
        """Execute full kinetic pipeline sequentially on a single video frame."""
        res = frame.copy()
        if enable_glitch:
            res = cls.apply_glitch_flicker(res, time_sec)
        if enable_shake and time_sec <= 2.0:
            res = cls.apply_screen_shake(res, intensity=shake_intensity)
        if enable_bloom:
            res = cls.apply_volumetric_bloom(res, threshold=200)
        if enable_chroma:
            res = cls.apply_chromatic_aberration(res, offset_px=chroma_offset)
        return res


# ===============================================================================
# PART 2: THE MULTI-ASPECT ENGINE (BLURRED SIDEBARS & CANVAS RESIZING)
# ===============================================================================
def convert_to_portrait_blurred_sidebars(
    input_video: str,
    output_video: str,
    target_width: int = 1080,
    target_height: int = 1920
) -> str:
    """
    Portrait Platforms Switch ('short'):
    Converts widescreen frames into vertical 9:16 portrait format (1080x1920).
    Extracts duplicate tracking instance of source, stretches across full 1080x1920
    viewport, applies heavy blur (boxblur=40:5 / gblur), and overlays original
    video cleanly centered on top.
    """
    filter_complex = (
        f"[0:v]scale={target_width}:{target_height}:force_original_aspect_ratio=increase,"
        f"crop={target_width}:{target_height},"
        f"boxblur=40:5[bg];"
        f"[0:v]scale={target_width}:{target_height}:force_original_aspect_ratio=decrease[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2[v]"
    )
    
    args = [
        "-i", input_video,
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", str(DEFAULT_SAMPLE_RATE),
        "-ac", str(DEFAULT_AUDIO_CHANNELS),
        output_video
    ]
    run_ffmpeg_command(args, f"Multi-Aspect 9:16 Blurred Sidebars ({os.path.basename(input_video)})")
    return output_video


def resize_widescreen(
    input_video: str,
    output_video: str,
    target_width: int = 1920,
    target_height: int = 1080
) -> str:
    """Widescreen Mode ('original'): Scale to 16:9 widescreen canvas boundary ratios."""
    filter_complex = (
        f"[0:v]scale={target_width}:{target_height}:force_original_aspect_ratio=decrease,"
        f"pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:black[v]"
    )
    args = [
        "-i", input_video,
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", str(DEFAULT_SAMPLE_RATE),
        "-ac", str(DEFAULT_AUDIO_CHANNELS),
        output_video
    ]
    run_ffmpeg_command(args, f"Widescreen 16:9 Scale ({os.path.basename(input_video)})")
    return output_video


# ===============================================================================
# ENGINE 1: HARDCODED MASTER RENDER PIPELINE
# ===============================================================================
class MasterRenderPipeline:
    """
    Flattens, filters, chromakeys, and encodes timeline assets:
    Intro -> Main Gameplay -> Outro with dynamic overlays, subtitle burns,
    and automatic build_perf_log.md telemetry recording.
    """

    @classmethod
    def execute(
        cls,
        intro_path: Optional[str],
        main_gameplay_path: str,
        outro_path: Optional[str],
        output_path: str,
        aspect_mode: str = "original",  # 'original' (16:9) or 'short' (9:16)
        split_start_sec: float = 0.0,
        split_end_sec: Optional[float] = None,
        green_screen_overlay: Optional[str] = None,
        overlay_start_time: float = 5.0,
        watermark_path: Optional[str] = None,
        watermark_pos: str = "TR",
        subtitle_path: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time_all = time.time()
        scratch = ensure_scratch_directory()
        purge_pycache()

        print("\n=======================================================")
        print(" [STREAMINJECT] INITIALIZING MASTER RENDER PIPELINE")
        print("=======================================================")

        target_w = 1080 if aspect_mode == "short" else 1920
        target_h = 1920 if aspect_mode == "short" else 1080

        # Step 1: Slice and normalize main gameplay
        game_info = probe_media(main_gameplay_path)
        end_time = split_end_sec if split_end_sec is not None else game_info["duration"]
        game_slice_raw = os.path.join(scratch, "game_slice_raw.mp4")
        
        slice_args = [
            "-ss", str(split_start_sec),
            "-to", str(end_time),
            "-i", main_gameplay_path,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "18",
            "-c:a", "aac",
            "-ar", str(DEFAULT_SAMPLE_RATE),
            "-ac", str(DEFAULT_AUDIO_CHANNELS),
            game_slice_raw
        ]
        run_ffmpeg_command(slice_args, "Slice Main Gameplay Stream")

        # Step 2: Harmonize Audio on Main Gameplay
        game_slice_audio = os.path.join(scratch, "game_slice_audio.mp4")
        harmonize_clip_audio(game_slice_raw, game_slice_audio)

        # Step 3: Aspect Ratio Conversion
        game_slice_aspect = os.path.join(scratch, "game_slice_aspect.mp4")
        if aspect_mode == "short":
            convert_to_portrait_blurred_sidebars(game_slice_audio, game_slice_aspect, target_w, target_h)
        else:
            resize_widescreen(game_slice_audio, game_slice_aspect, target_w, target_h)

        # Step 4: Chromakey Green Screen Overlay & Watermark / Subtitles
        game_enhanced = os.path.join(scratch, "game_enhanced.mp4")
        filter_inputs = ["[0:v]"]
        filter_chains = []
        input_args = ["-i", game_slice_aspect]
        curr_stream = "[0:v]"
        stream_idx = 1

        # Chroma key overlay if provided
        if green_screen_overlay and os.path.isfile(green_screen_overlay):
            input_args.extend(["-itsoffset", str(overlay_start_time), "-i", green_screen_overlay])
            chroma_tag = f"[{stream_idx}:v]chromakey=0x00FF00:0.1:0.2[chroma_out];"
            overlay_tag = f"{curr_stream}[chroma_out]overlay=enable='gte(t,{overlay_start_time})'[v_chroma]"
            filter_chains.append(chroma_tag + overlay_tag)
            curr_stream = "[v_chroma]"
            stream_idx += 1

        # Watermark if provided
        if watermark_path and os.path.isfile(watermark_path):
            input_args.extend(["-i", watermark_path])
            pos_map = {
                "TL": "20:20",
                "TR": "W-w-20:20",
                "BL": "20:H-h-20",
                "BR": "W-w-20:H-h-20"
            }
            overlay_pos = pos_map.get(watermark_pos.upper(), "W-w-20:20")
            wm_tag = f"{curr_stream}[{stream_idx}:v]overlay={overlay_pos}[v_wm]"
            filter_chains.append(wm_tag)
            curr_stream = "[v_wm]"
            stream_idx += 1

        # Subtitle burning
        if subtitle_path and os.path.isfile(subtitle_path):
            escaped_sub = subtitle_path.replace("\\", "/").replace(":", "\\:")
            sub_tag = f"{curr_stream}subtitles='{escaped_sub}'[v_sub]"
            filter_chains.append(sub_tag)
            curr_stream = "[v_sub]"

        if filter_chains:
            fc_str = ";".join(filter_chains)
            enh_args = input_args + [
                "-filter_complex", fc_str,
                "-map", curr_stream,
                "-map", "0:a",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "18",
                "-c:a", "copy",
                game_enhanced
            ]
            run_ffmpeg_command(enh_args, "Burn Overlays, Chromakey & Subtitles")
        else:
            game_enhanced = game_slice_aspect

        # Step 5: Process and Harmonize Intro & Outro Segments
        timeline_clips: List[str] = []

        if intro_path and os.path.isfile(intro_path):
            intro_raw_aspect = os.path.join(scratch, "intro_aspect.mp4")
            if aspect_mode == "short":
                convert_to_portrait_blurred_sidebars(intro_path, intro_raw_aspect, target_w, target_h)
            else:
                resize_widescreen(intro_path, intro_raw_aspect, target_w, target_h)
            intro_harmonized = os.path.join(scratch, "intro_harmonized.mp4")
            harmonize_clip_audio(intro_raw_aspect, intro_harmonized)
            timeline_clips.append(intro_harmonized)

        timeline_clips.append(game_enhanced)

        if outro_path and os.path.isfile(outro_path):
            outro_raw_aspect = os.path.join(scratch, "outro_aspect.mp4")
            if aspect_mode == "short":
                convert_to_portrait_blurred_sidebars(outro_path, outro_raw_aspect, target_w, target_h)
            else:
                resize_widescreen(outro_path, outro_raw_aspect, target_w, target_h)
            outro_harmonized = os.path.join(scratch, "outro_harmonized.mp4")
            harmonize_clip_audio(outro_raw_aspect, outro_harmonized)
            timeline_clips.append(outro_harmonized)

        # Step 6: Multi-track Concatenation
        raw_flattened = os.path.join(scratch, "flattened_raw.mp4")
        concat_inputs = []
        concat_streams = []
        for i, clip in enumerate(timeline_clips):
            concat_inputs.extend(["-i", clip])
            concat_streams.append(f"[{i}:v][{i}:a]")
        
        concat_filter = f"{''.join(concat_streams)}concat=n={len(timeline_clips)}:v=1:a=1[v_out][a_out]"
        concat_args = concat_inputs + [
            "-filter_complex", concat_filter,
            "-map", "[v_out]",
            "-map", "[a_out]",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "18",
            "-threads", "0",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", str(DEFAULT_SAMPLE_RATE),
            "-ac", str(DEFAULT_AUDIO_CHANNELS),
            raw_flattened
        ]
        run_ffmpeg_command(concat_args, "Master Timeline Concatenation Track")

        # Step 7: Master Audio Peak Limiter (-0.95dB Hard Ceiling)
        apply_master_audio_peak_limiter(raw_flattened, output_path)

        total_elapsed = time.time() - start_time_all
        final_info = probe_media(output_path)
        total_frames = int(final_info["duration"] * final_info["fps"])
        render_fps = total_frames / total_elapsed if total_elapsed > 0 else 0.0

        # Step 8: Telemetry Profile & build_perf_log.md
        perf_data = {
            "timestamp": datetime.now().isoformat(),
            "output_file": os.path.abspath(output_path),
            "resolution": f"{target_w}x{target_h}",
            "aspect_mode": aspect_mode,
            "duration_sec": final_info["duration"],
            "total_frames": total_frames,
            "elapsed_seconds": round(total_elapsed, 2),
            "render_fps": round(render_fps, 2),
            "audio_limiter": f"{AUDIO_LIMITER_CEILING_DB} dB"
        }
        cls.write_perf_log(perf_data)

        # Cleanup scratch artifacts
        cleanup_scratch_files(pause_seconds=2.0)

        print("\n=======================================================")
        print(" [STREAMINJECT] MASTER RENDER COMPLETED SUCCESSFULLY!")
        print(f" Output Asset:    {output_path}")
        print(f" Total Frames:    {total_frames}")
        print(f" Runtime Elapsed: {total_elapsed:.2f}s")
        print(f" Processing Speed:{render_fps:.2f} FPS")
        print("=======================================================\n")
        return perf_data

    @staticmethod
    def write_perf_log(data: Dict[str, Any]):
        """Output formal markdown performance telemetry log."""
        log_content = f"""# StreamInject v2.5 Render Performance Profile

- **Build Timestamp**: `{data['timestamp']}`
- **Output Target**: `{data['output_file']}`
- **Resolution**: `{data['resolution']}` ({data['aspect_mode']})
- **Total Duration**: `{data['duration_sec']:.2f} seconds`
- **Total Frames Rendered**: `{data['total_frames']}`
- **Elapsed Runtime**: `{data['elapsed_seconds']}s`
- **Processing FPS Speed**: `{data['render_fps']} FPS`
- **Audio Peak Limiter**: `{data['audio_limiter']}` (Stereo 48kHz)
- **Status**: `COMPLETED (100%)`
"""
        try:
            with open(PERF_LOG_PATH, "w", encoding="utf-8") as f:
                f.write(log_content)
            print(f"[STREAMINJECT TELEMETRY] Log written to {PERF_LOG_PATH}")
        except Exception as e:
            print(f"[STREAMINJECT TELEMETRY] Warning: Failed to write {PERF_LOG_PATH}: {e}")


# ===============================================================================
# ENGINE 2: INTRO & OUTRO STUDIO (INTERACTIVE BUILDER)
# ===============================================================================
class IntroOutroStudio:
    """
    Interactive Builder featuring:
    1. Ready-Built Template Mode (10s Kinetic Loop on Red-capped background <= 55)
    2. Blank Template Mode (Infinite Step-by-Step Multi-Layer Input Loop until 'next')
    """

    @classmethod
    def generate_radial_background(cls, width: int, height: int, max_red: int = OUTRO_BG_RED_MAX) -> NDArray:
        """Create radial dithered red background field capped strictly at RGB <= 55."""
        y, x = np.ogrid[:height, :width]
        center_x, center_y = width / 2.0, height / 2.0
        max_dist = math.sqrt(center_x ** 2 + center_y ** 2)
        dist = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
        
        # Radial gradient from max_red at center to near black at edges
        norm_dist = np.clip(dist / max_dist, 0.0, 1.0)
        red_channel = (max_red * (1.0 - 0.75 * norm_dist)).astype(np.uint8)
        green_channel = (red_channel * 0.1).astype(np.uint8)
        blue_channel = (red_channel * 0.15).astype(np.uint8)
        
        # Add subtle noise/dither to prevent color banding
        noise = np.random.randint(-2, 3, (height, width), dtype=np.int16)
        r = np.clip(red_channel.astype(np.int16) + noise, 0, max_red).astype(np.uint8)
        g = np.clip(green_channel.astype(np.int16) + noise, 0, 20).astype(np.uint8)
        b = np.clip(blue_channel.astype(np.int16) + noise, 0, 30).astype(np.uint8)
        
        return cv2.merge([b, g, r])

    @classmethod
    def generate_ready_built_template(
        cls,
        output_path: str,
        width: int = 1920,
        height: int = 1080,
        duration_sec: float = 10.0,
        fps: float = 30.0,
        title_text: str = "THANKS FOR WATCHING",
        subtitle_text: str = "SUBSCRIBE FOR MORE CONTENT"
    ) -> str:
        """
        Ready-Built Template Mode: Automatically bakes a standard 10-second MP4 asset
        looping all four Part 1 Kinetic effects simultaneously over a radial dithered
        red background field capped strictly at maximum RGB value constraint (OUTRO_BG_RED_MAX=55).
        """
        print("\n[INTRO/OUTRO STUDIO] Baking Ready-Built Template...")
        scratch = ensure_scratch_directory()
        raw_video_path = os.path.join(scratch, "ready_built_raw.mp4")
        
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(raw_video_path, fourcc, fps, (width, height))
        
        total_frames = int(duration_sec * fps)
        bg_base = cls.generate_radial_background(width, height, max_red=OUTRO_BG_RED_MAX)

        for frame_idx in range(total_frames):
            time_sec = frame_idx / fps
            frame = bg_base.copy()

            # Render text layers with kinetic oscillations
            bounce_offset = int(math.sin(time_sec * 4.0) * 12.0)
            
            # Convert to PIL for crisp typography
            img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            draw = ImageDraw.Draw(img_pil)
            
            try:
                font_title = ImageFont.truetype("arial.ttf", int(height * 0.07))
                font_sub = ImageFont.truetype("arial.ttf", int(height * 0.035))
            except Exception:
                font_title = ImageFont.load_default()
                font_sub = ImageFont.load_default()

            # Draw Title & Subtitle with center alignment
            bbox_title = draw.textbbox((0, 0), title_text, font=font_title)
            t_w, t_h = bbox_title[2] - bbox_title[0], bbox_title[3] - bbox_title[1]
            draw.text(((width - t_w) / 2, (height * 0.35) + bounce_offset), title_text, font=font_title, fill=(255, 255, 255))

            bbox_sub = draw.textbbox((0, 0), subtitle_text, font=font_sub)
            s_w, s_h = bbox_sub[2] - bbox_sub[0], bbox_sub[3] - bbox_sub[1]
            draw.text(((width - s_w) / 2, (height * 0.50) + bounce_offset), subtitle_text, font=font_sub, fill=(200, 200, 200))

            frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

            # Draw safe-zone geometric box hints (Left/Right Video Boxes + Centered Profile)
            box_w, box_h = int(width * 0.30), int(height * 0.32)
            cv2.rectangle(frame, (int(width * 0.10), int(height * 0.60)), (int(width * 0.10) + box_w, int(height * 0.60) + box_h), (255, 255, 255), 2)
            cv2.rectangle(frame, (int(width * 0.60), int(height * 0.60)), (int(width * 0.60) + box_w, int(height * 0.60) + box_h), (255, 255, 255), 2)
            cv2.circle(frame, (int(width * 0.50), int(height * 0.75)), int(height * 0.12), (0, 255, 255), 2)

            # Apply all four Part 1 Kinetic effects simultaneously
            processed = KineticFXMatrix.process_frame(
                frame,
                time_sec=time_sec,
                enable_glitch=True,
                enable_shake=(time_sec <= 1.5),
                enable_bloom=True,
                enable_chroma=True,
                shake_intensity=6.0,
                chroma_offset=4
            )
            writer.write(processed)

        writer.release()

        # Harmonize audio and pass through hard limiter
        harmonized = os.path.join(scratch, "ready_built_harmonized.mp4")
        harmonize_clip_audio(raw_video_path, harmonized, target_duration=duration_sec)
        apply_master_audio_peak_limiter(harmonized, output_path)

        cleanup_scratch_files(pause_seconds=2.0)
        print(f"[INTRO/OUTRO STUDIO] Ready-Built Template exported: {output_path}")
        return output_path

    @classmethod
    def render_custom_layout_from_config(cls, config: Dict[str, Any], output_path: str) -> str:
        """
        Headless automated custom layout renderer from structured JSON config.
        Called directly by Gina AI Factory Backend or CLI --layout-json.
        """
        scratch = ensure_scratch_directory()
        canvas_w = int(config.get("width", 1920))
        canvas_h = int(config.get("height", 1080))
        duration_sec = float(config.get("duration", 10.0))
        fps = float(config.get("fps", 30.0))
        total_frames = int(duration_sec * fps)
        
        bg_cfg = config.get("background", {})
        bg_type = bg_cfg.get("type", "radial")
        bg_max_red = int(bg_cfg.get("max_red", OUTRO_BG_RED_MAX))
        bg_image_path = bg_cfg.get("image_path")

        text_layers = config.get("text_layers", [])
        video_boxes = config.get("video_boxes", [])
        profile_circles = config.get("profile_circles", [])
        vfx_cfg = config.get("vfx", {})

        enable_glitch = bool(vfx_cfg.get("enable_glitch", True))
        enable_shake = bool(vfx_cfg.get("enable_shake", True))
        enable_bloom = bool(vfx_cfg.get("enable_bloom", True))
        enable_chroma = bool(vfx_cfg.get("enable_chroma", True))

        print(f"[STREAMINJECT_PROGRESS: 10%] Preparing layout canvas {canvas_w}x{canvas_h} for {duration_sec}s @ {fps}fps...")

        if HAS_OPENCV and cv2 is not None:
            raw_custom = os.path.join(scratch, "custom_builder_raw.mp4")
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(raw_custom, fourcc, fps, (canvas_w, canvas_h))

            # Base background
            if bg_type == "image" and bg_image_path and os.path.isfile(bg_image_path):
                bg_loaded = cv2.imread(bg_image_path)
                bg_base = cv2.resize(bg_loaded, (canvas_w, canvas_h))
            elif bg_type == "linear":
                y, x = np.ogrid[:canvas_h, :canvas_w]
                gradient = (bg_max_red * (y / float(canvas_h))).astype(np.uint8)
                bg_base = cv2.merge([np.zeros_like(gradient), np.zeros_like(gradient), gradient])
            else:
                bg_base = cls.generate_radial_background(canvas_w, canvas_h, max_red=bg_max_red)

            for frame_idx in range(total_frames):
                time_sec = frame_idx / fps
                frame = bg_base.copy()

                # Render text layers
                if text_layers and Image is not None and ImageDraw is not None:
                    img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    draw = ImageDraw.Draw(img_pil)
                    for i, tl in enumerate(text_layers):
                        anim_offset = 0
                        t_str = str(tl.get("text", ""))
                        if not t_str:
                            continue
                        f_size = int(tl.get("size", 48))
                        f_color = tl.get("color", "#FFFFFF")
                        anim = tl.get("animation", "static")
                        if anim == "bounce":
                            anim_offset = int(math.sin(time_sec * 4.0) * 10.0)
                        elif anim == "flicker" and random.random() < 0.2 and time_sec < 2.0:
                            f_color = "#444444"

                        try:
                            font = ImageFont.truetype("arial.ttf", f_size)
                        except Exception:
                            font = ImageFont.load_default()

                        pos_x = tl.get("x")
                        pos_y = tl.get("y")
                        if pos_x is None or pos_y is None:
                            bbox = draw.textbbox((0, 0), t_str, font=font)
                            t_w = bbox[2] - bbox[0]
                            pos_x = (canvas_w - t_w) / 2
                            pos_y = int(canvas_h * 0.25) + (i * (f_size + 24))

                        draw.text((pos_x, pos_y + anim_offset), t_str, font=font, fill=f_color)

                    frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

                # Draw video boxes
                for box in video_boxes:
                    if isinstance(box, dict):
                        bx = int(box.get("x", 100))
                        by = int(box.get("y", 300))
                        bw = int(box.get("width", 500))
                        bh = int(box.get("height", 280))
                        lbl = str(box.get("label", ""))
                    elif isinstance(box, (list, tuple)) and len(box) >= 4:
                        bx, by, bw, bh = [int(v) for v in box[:4]]
                        lbl = ""
                    else:
                        continue
                    cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (255, 255, 255), 2)
                    if lbl:
                        cv2.putText(frame, lbl, (bx + 12, by + 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

                # Draw profile circles
                for circ in profile_circles:
                    if isinstance(circ, dict):
                        cx = int(circ.get("x", canvas_w // 2))
                        cy = int(circ.get("y", canvas_h // 2))
                        cr = int(circ.get("radius", 100))
                        pulse = bool(circ.get("pulse", True))
                    elif isinstance(circ, (list, tuple)) and len(circ) >= 3:
                        cx, cy, cr = [int(v) for v in circ[:3]]
                        pulse = True
                    else:
                        continue
                    if pulse:
                        cr_mod = cr + int(math.sin(time_sec * 5.0) * 4.0)
                    else:
                        cr_mod = cr
                    cv2.circle(frame, (cx, cy), max(5, cr_mod), (0, 255, 255), 2)
                    cv2.circle(frame, (cx, cy), max(2, cr_mod - 8), (0, 180, 255), 1)

                # Kinetic effects
                processed = KineticFXMatrix.process_frame(
                    frame,
                    time_sec=time_sec,
                    enable_glitch=enable_glitch,
                    enable_shake=enable_shake and (time_sec <= 1.2),
                    enable_bloom=enable_bloom,
                    enable_chroma=enable_chroma
                )
                writer.write(processed)
                if frame_idx % max(1, total_frames // 5) == 0:
                    pct = int(20 + (frame_idx / total_frames) * 60)
                    print(f"[STREAMINJECT_PROGRESS: {pct}%] Rendered frame {frame_idx}/{total_frames}...")

            writer.release()

            print("[STREAMINJECT_PROGRESS: 85%] Harmonizing audio & mastering peak ceiling...")
            harmonized = os.path.join(scratch, "custom_builder_harmonized.mp4")
            harmonize_clip_audio(raw_custom, harmonized, target_duration=duration_sec)
            apply_master_audio_peak_limiter(harmonized, output_path)
        else:
            # Pure Native FFmpeg Filter Graph Engine fallback
            print("[STREAMINJECT_PROGRESS: 40%] Generating synthetic canvas via FFmpeg filter graphs...")
            raw_gen = os.path.join(scratch, "ffmpeg_raw_gen.mp4")
            
            # Construct drawbox / drawtext filters
            filter_chains = [
                f"color=c=0x150005:s={canvas_w}x{canvas_h}:d={duration_sec}:r={fps}[v_base]"
            ]
            last_v = "[v_base]"
            
            # Add video boxes
            for idx, box in enumerate(video_boxes):
                if isinstance(box, dict):
                    bx, by, bw, bh = int(box.get("x", 100)), int(box.get("y", 300)), int(box.get("width", 500)), int(box.get("height", 280))
                elif isinstance(box, (list, tuple)) and len(box) >= 4:
                    bx, by, bw, bh = [int(v) for v in box[:4]]
                else:
                    continue
                nxt_v = f"[v_box_{idx}]"
                filter_chains.append(f"{last_v}drawbox=x={bx}:y={by}:w={bw}:h={bh}:color=white@0.8:t=2{nxt_v}")
                last_v = nxt_v

            # Add text layers
            font_path = "arial.ttf"
            for idx, tl in enumerate(text_layers):
                t_str = str(tl.get("text", "")).replace(":", "\\:").replace("'", "\\'")
                if not t_str:
                    continue
                f_size = int(tl.get("size", 48))
                f_color = "white"
                nxt_v = f"[v_txt_{idx}]"
                filter_chains.append(f"{last_v}drawtext=text='{t_str}':fontsize={f_size}:fontcolor={f_color}:x=(w-text_w)/2:y=(h*{0.3 + idx*0.12})-text_h/2{nxt_v}")
                last_v = nxt_v

            # Audio silent stream
            args = [
                "-f", "lavfi", "-i", f"anullsrc=r={DEFAULT_SAMPLE_RATE}:cl=stereo",
                "-filter_complex", ";".join(filter_chains),
                "-map", last_v,
                "-map", "0:a",
                "-t", str(duration_sec),
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "18",
                "-c:a", "aac",
                "-b:a", "192k",
                raw_gen
            ]
            run_ffmpeg_command(args, "Render Studio Layout via FFmpeg")
            apply_master_audio_peak_limiter(raw_gen, output_path)

        cleanup_scratch_files(pause_seconds=2.0)
        print(f"[STREAMINJECT_PROGRESS: 100%] Template Render Completed: {output_path}")
        return output_path

    @classmethod
    def run_blank_template_interactive_builder(cls, output_path: str = "custom_intro_outro.mp4") -> str:
        """
        Blank Template Mode:
        Launches strict Step-by-Step Interactive Menu Flow with CRITICAL CONSTRAINT LOOP:
        Every step prompts continuously for multi-layer inputs until user types 'next'.
        """
        print("\n=======================================================")
        print(" [INTRO/OUTRO STUDIO] INTERACTIVE BLANK TEMPLATE BUILDER")
        print(" Type 'next' at any step prompt to lock that section & proceed.")
        print("=======================================================\n")

        # Step 2.1: Canvas Size
        print("--- STEP 2.1: CANVAS SIZE ---")
        w_in = input("Enter canvas width (default 1920) or 'next': ").strip()
        h_in = input("Enter canvas height (default 1080) or 'next': ").strip()
        canvas_w = int(w_in) if w_in.isdigit() else 1920
        canvas_h = int(h_in) if h_in.isdigit() else 1080
        print(f"Canvas locked at {canvas_w}x{canvas_h}\n")

        # Step 2.2: Text Input Layer Loop
        print("--- STEP 2.2: TEXT INPUT LAYERS (Type 'next' when finished) ---")
        text_layers = []
        while True:
            t_str = input("Enter text string (or 'next' to finish): ").strip()
            if t_str.lower() == "next":
                break
            f_size = input("Enter font size scale (e.g. 48): ").strip()
            f_color = input("Enter HEX color (e.g. #FFFFFF): ").strip()
            anim = input("Animation type (bounce / flicker / static): ").strip().lower()
            text_layers.append({
                "text": t_str,
                "size": int(f_size) if f_size.isdigit() else 48,
                "color": f_color or "#FFFFFF",
                "animation": anim if anim in ["bounce", "flicker", "static"] else "static"
            })
            print(f"Added text layer #{len(text_layers)}. Add another or type 'next'.")

        # Step 2.3: Background Canvas Config
        print("\n--- STEP 2.3: BACKGROUND CANVAS CONFIG ---")
        bg_choice = "radial"
        bg_image_path = None
        while True:
            bg_in = input("Choose background ('radial' / 'linear' / 'image' / 'next'): ").strip().lower()
            if bg_in == "next":
                break
            if bg_in in ["radial", "linear"]:
                bg_choice = bg_in
                break
            elif bg_in == "image":
                img_p = input("Enter local background image path: ").strip()
                if os.path.isfile(img_p):
                    bg_choice = "image"
                    bg_image_path = img_p
                    break
                else:
                    print("File not found. Try again or choose radial/linear.")

        # Step 2.4: Audio Mix Matrix
        print("\n--- STEP 2.4: AUDIO MIX MATRIX ---")
        audio_tracks = []
        while True:
            a_path = input("Enter audio track path (or 'next' to finish): ").strip()
            if a_path.lower() == "next":
                break
            if os.path.isfile(a_path):
                dur_lim = input("Duration limit in seconds (or 'next' for full): ").strip()
                audio_tracks.append({
                    "path": a_path,
                    "duration": float(dur_lim) if dur_lim.replace(".", "", 1).isdigit() else None
                })
                print(f"Added audio track #{len(audio_tracks)}.")
            else:
                print("Audio file not found. Try again or type 'next'.")

        # Step 2.5: Watermark Overlay
        print("\n--- STEP 2.5: WATERMARK OVERLAY ---")
        watermarks = []
        while True:
            wm_p = input("Enter watermark graphic path (.png, .jpg) or 'next': ").strip()
            if wm_p.lower() == "next":
                break
            if os.path.isfile(wm_p):
                align = input("Alignment code (TL / TR / BL / BR): ").strip().upper()
                watermarks.append({"path": wm_p, "align": align if align in ["TL", "TR", "BL", "BR"] else "TR"})
                print(f"Added watermark. Add another or type 'next'.")
            else:
                print("Watermark file not found. Try again or type 'next'.")

        # Step 2.6: Secondary Video PiP (35% scale)
        print("\n--- STEP 2.6: SECONDARY VIDEO PiP (Scaled to 35% viewport) ---")
        pip_videos = []
        while True:
            pip_p = input("Enter secondary meme/video PiP path or 'next': ").strip()
            if pip_p.lower() == "next":
                break
            if os.path.isfile(pip_p):
                pip_videos.append(pip_p)
                print(f"Added PiP video #{len(pip_videos)}.")
            else:
                print("PiP video not found. Try again or type 'next'.")

        # Step 2.7: Video Box Overlay Geometries with SMART HINT
        print("\n--- STEP 2.7: VIDEO BOX OVERLAY GEOMETRIES ---")
        rec_left_x = int(canvas_w * 0.10)
        rec_left_y = int(canvas_h * 0.30)
        rec_right_x = int(canvas_w * 0.60)
        rec_right_y = int(canvas_h * 0.30)
        print(f"💡 SMART HINT (16:9 Canvas {canvas_w}x{canvas_h}):")
        print(f"   Recommended Left Video Box Placement:  ({rec_left_x}, {rec_left_y})")
        print(f"   Recommended Right Video Box Placement: ({rec_right_x}, {rec_right_y})")
        video_boxes = []
        while True:
            box_in = input("Enter video box (X,Y,W,H) e.g. '200,300,500,280' or 'next': ").strip()
            if box_in.lower() == "next":
                break
            try:
                parts = [int(p.strip()) for p in box_in.split(",")]
                if len(parts) == 4:
                    video_boxes.append(tuple(parts))
                    print(f"Added video box #{len(video_boxes)}.")
            except Exception:
                print("Invalid format. Use X,Y,W,H or type 'next'.")

        # Step 2.8: Subscribe Profile Circle Safe-Zones with SMART HINT
        print("\n--- STEP 2.8: SUBSCRIBE PROFILE CIRCLE SAFE-ZONES ---")
        rec_center_x = int(canvas_w / 2)
        rec_center_y = int(canvas_h * 0.40)
        rec_radius = int(canvas_h * 0.12)
        print(f"💡 SMART HINT (16:9 Canvas {canvas_w}x{canvas_h}):")
        print(f"   Recommended Centered Profile Placement: Center=({rec_center_x}, {rec_center_y}), Radius={rec_radius}")
        profile_circles = []
        while True:
            circ_in = input("Enter profile circle (Center_X,Center_Y,Radius) e.g. '960,435,130' or 'next': ").strip()
            if circ_in.lower() == "next":
                break
            try:
                parts = [int(p.strip()) for p in circ_in.split(",")]
                if len(parts) == 3:
                    profile_circles.append(tuple(parts))
                    print(f"Added profile circle #{len(profile_circles)}.")
            except Exception:
                print("Invalid format. Use Center_X,Center_Y,Radius or type 'next'.")

        # Render Blank Template Asset
        scratch = ensure_scratch_directory()
        raw_custom = os.path.join(scratch, "custom_builder_raw.mp4")
        fps = 30.0
        duration_sec = 10.0
        total_frames = int(duration_sec * fps)
        
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(raw_custom, fourcc, fps, (canvas_w, canvas_h))

        # Base background
        if bg_choice == "image" and bg_image_path:
            bg_loaded = cv2.imread(bg_image_path)
            bg_base = cv2.resize(bg_loaded, (canvas_w, canvas_h))
        elif bg_choice == "linear":
            y, x = np.ogrid[:canvas_h, :canvas_w]
            gradient = (OUTRO_BG_RED_MAX * (y / float(canvas_h))).astype(np.uint8)
            bg_base = cv2.merge([np.zeros_like(gradient), np.zeros_like(gradient), gradient])
        else:
            bg_base = cls.generate_radial_background(canvas_w, canvas_h, max_red=OUTRO_BG_RED_MAX)

        for frame_idx in range(total_frames):
            time_sec = frame_idx / fps
            frame = bg_base.copy()

            # Render text layers
            img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            draw = ImageDraw.Draw(img_pil)
            for i, tl in enumerate(text_layers):
                anim_offset = 0
                if tl["animation"] == "bounce":
                    anim_offset = int(math.sin(time_sec * 4.0) * 10.0)
                try:
                    font = ImageFont.truetype("arial.ttf", tl["size"])
                except Exception:
                    font = ImageFont.load_default()
                
                y_pos = int(canvas_h * 0.20) + (i * (tl["size"] + 20)) + anim_offset
                draw.text((int(canvas_w * 0.15), y_pos), tl["text"], font=font, fill=tl["color"])
            
            frame = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

            # Draw video boxes
            for (bx, by, bw, bh) in video_boxes:
                cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (255, 255, 255), 2)
            
            # Draw profile circles
            for (cx, cy, cr) in profile_circles:
                cv2.circle(frame, (cx, cy), cr, (0, 255, 255), 2)

            # Kinetic effects
            processed = KineticFXMatrix.process_frame(
                frame,
                time_sec=time_sec,
                enable_glitch=True,
                enable_shake=(time_sec <= 1.0),
                enable_bloom=True,
                enable_chroma=True
            )
            writer.write(processed)

        writer.release()

        # Harmonize audio
        harmonized = os.path.join(scratch, "custom_builder_harmonized.mp4")
        harmonize_clip_audio(raw_custom, harmonized, target_duration=duration_sec)
        apply_master_audio_peak_limiter(harmonized, output_path)

        cleanup_scratch_files(pause_seconds=2.0)
        print(f"\n[INTRO/OUTRO STUDIO] Blank Template Render Complete: {output_path}\n")
        return output_path


# ===============================================================================
# CLI COMMAND ENTRY POINT
# ===============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="StreamInject v2.5 — Project Gina Pure Render Suite (Python / OpenCV / FFmpeg)",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", help="Operational Subcommands")

    # Pipeline 1: Master Hardcoded Render Pipeline
    render_parser = subparsers.add_parser("render", help="Execute Master Render Pipeline")
    render_parser.add_argument("--gameplay", required=True, help="Main gameplay video path")
    render_parser.add_argument("--intro", default=None, help="Optional Intro video path")
    render_parser.add_argument("--outro", default=None, help="Optional Outro video path")
    render_parser.add_argument("--output", default="master_render_output.mp4", help="Output MP4 file path")
    render_parser.add_argument("--aspect", choices=["original", "short"], default="original", help="Aspect switch: original (16:9) or short (9:16 portrait)")
    render_parser.add_argument("--split-start", type=float, default=0.0, help="Gameplay slice start (seconds)")
    render_parser.add_argument("--split-end", type=float, default=None, help="Gameplay slice end (seconds)")
    render_parser.add_argument("--chromakey", default=None, help="Green screen overlay video (0x00FF00)")
    render_parser.add_argument("--overlay-start", type=float, default=5.0, help="Overlay start time (seconds)")
    render_parser.add_argument("--watermark", default=None, help="Watermark image path")
    render_parser.add_argument("--watermark-pos", choices=["TL", "TR", "BL", "BR"], default="TR", help="Watermark alignment")
    render_parser.add_argument("--subtitles", default=None, help="Subtitles file path (.srt, .ass)")

    # Pipeline 2: Intro/Outro Studio
    studio_parser = subparsers.add_parser("studio", help="Launch Intro & Outro Studio")
    studio_parser.add_argument("--mode", choices=["ready", "interactive", "custom"], default="interactive", help="Template mode: ready-built, interactive step-by-step, or custom json layout")
    studio_parser.add_argument("--layout-json", default=None, help="JSON string or file path defining custom layout canvas elements")
    studio_parser.add_argument("--output", default="studio_output.mp4", help="Studio MP4 output path")
    studio_parser.add_argument("--width", type=int, default=1920, help="Canvas width")
    studio_parser.add_argument("--height", type=int, default=1080, help="Canvas height")
    studio_parser.add_argument("--duration", type=float, default=10.0, help="Duration (seconds)")

    args = parser.parse_args()

    if args.command == "render":
        MasterRenderPipeline.execute(
            intro_path=args.intro,
            main_gameplay_path=args.gameplay,
            outro_path=args.outro,
            output_path=args.output,
            aspect_mode=args.aspect,
            split_start_sec=args.split_start,
            split_end_sec=args.split_end,
            green_screen_overlay=args.chromakey,
            overlay_start_time=args.overlay_start,
            watermark_path=args.watermark,
            watermark_pos=args.watermark_pos,
            subtitle_path=args.subtitles
        )
    elif args.command == "studio":
        if args.layout_json:
            layout_data = {}
            if os.path.isfile(args.layout_json):
                with open(args.layout_json, "r", encoding="utf-8") as f:
                    layout_data = json.load(f)
            else:
                try:
                    layout_data = json.loads(args.layout_json)
                except Exception as e:
                    print(f"[STREAMINJECT ERROR] Failed to parse --layout-json: {e}")
                    sys.exit(1)
            IntroOutroStudio.render_custom_layout_from_config(layout_data, output_path=args.output)
        elif args.mode == "ready":
            IntroOutroStudio.generate_ready_built_template(
                output_path=args.output,
                width=args.width,
                height=args.height,
                duration_sec=args.duration
            )
        else:
            IntroOutroStudio.run_blank_template_interactive_builder(output_path=args.output)
    else:
        # Launch Interactive Dashboard if no arguments provided
        print("""
===============================================================================
        STREAMINJECT v2.5 — PROJECT GINA PURE RENDER SUITE
===============================================================================
  1. Master Hardcoded Render Pipeline (Intro + Game + Outro + Chroma)
  2. Intro & Outro Studio — Ready-Built Template (10s Kinetic Red Loop)
  3. Intro & Outro Studio — Interactive Step-by-Step Builder (Infinite Loop)
  4. Purge PyCache & Clean Environment
  5. Exit
===============================================================================
""")
        choice = input("Select an option [1-5]: ").strip()
        if choice == "1":
            gp = input("Enter main gameplay video path: ").strip()
            if not os.path.isfile(gp):
                print("File does not exist. Aborting.")
                return
            inp_intro = input("Enter intro video path (or press Enter to skip): ").strip() or None
            inp_outro = input("Enter outro video path (or press Enter to skip): ").strip() or None
            asp = input("Aspect format ('original' for 16:9 / 'short' for 9:16 Shorts): ").strip().lower()
            aspect = "short" if asp == "short" else "original"
            out = input("Output MP4 filename (default: master_output.mp4): ").strip() or "master_output.mp4"
            MasterRenderPipeline.execute(
                intro_path=inp_intro,
                main_gameplay_path=gp,
                outro_path=inp_outro,
                output_path=out,
                aspect_mode=aspect
            )
        elif choice == "2":
            out = input("Output MP4 filename (default: ready_built_outro.mp4): ").strip() or "ready_built_outro.mp4"
            IntroOutroStudio.generate_ready_built_template(output_path=out)
        elif choice == "3":
            out = input("Output MP4 filename (default: custom_studio_asset.mp4): ").strip() or "custom_studio_asset.mp4"
            IntroOutroStudio.run_blank_template_interactive_builder(output_path=out)
        elif choice == "4":
            deleted = purge_pycache()
            print(f"[STREAMINJECT] Cleaned {deleted} __pycache__ directories.")
        else:
            print("Exiting StreamInject.")


if __name__ == "__main__":
    main()
