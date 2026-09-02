#!/usr/bin/env python3
"""
Gina AI Factory — MoviePy Multimedia Video/Audio Stitching & Mastering Engine
Location: scripts/media_stitcher.py

Stitches and renders video clips (LTX-Video / GIF Studio MP4s / images) with 
synchronized AI music, background audio tracks, volume leveling, audio fades, 
and video looping/trimming using MoviePy and FFmpeg.
"""

import os
import sys
import json
import argparse
import traceback
from pathlib import Path

def stitch_media(args):
    print(f"[MediaStitcher] Starting stitching job...")
    print(f"[MediaStitcher] Video Input: {args.video_path}")
    print(f"[MediaStitcher] Audio Input: {args.audio_path}")
    print(f"[MediaStitcher] Output Target: {args.output_path}")

    video_path = os.path.abspath(args.video_path)
    audio_path = os.path.abspath(args.audio_path)
    output_path = os.path.abspath(args.output_path)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if not os.path.exists(video_path):
        print(f"[MediaStitcher] ERROR: Video file not found: {video_path}")
        sys.exit(1)

    if not os.path.exists(audio_path):
        print(f"[MediaStitcher] ERROR: Audio file not found: {audio_path}")
        sys.exit(1)

    audio_volume = float(args.audio_volume)
    video_volume = float(args.video_volume)
    fade_in_sec = float(args.fade_in)
    fade_out_sec = float(args.fade_out)
    loop_video = args.loop_video
    sync_mode = args.sync_mode # 'match_video', 'match_audio', 'custom'
    target_duration = float(args.duration) if args.duration else 0.0

    success = False
    error_msg = ""
    out_duration = 0.0

    # Try MoviePy first
    try:
        print("[MediaStitcher] Attempting stitch via MoviePy...")
        import moviepy.editor as mp

        video_clip = mp.VideoFileClip(video_path)
        audio_clip = mp.AudioFileClip(audio_path)

        # Apply audio adjustments
        if audio_volume != 1.0:
            audio_clip = audio_clip.volumex(audio_volume)
        if fade_in_sec > 0:
            audio_clip = audio_clip.audio_fadein(fade_in_sec)
        if fade_out_sec > 0:
            audio_clip = audio_clip.audio_fadeout(fade_out_sec)

        # Determine target duration
        if sync_mode == "match_video":
            final_duration = video_clip.duration
            if audio_clip.duration < final_duration:
                # Loop audio if needed
                audio_clip = mp.afx.audio_loop(audio_clip, duration=final_duration)
            else:
                audio_clip = audio_clip.subclip(0, final_duration)
        elif sync_mode == "match_audio":
            final_duration = audio_clip.duration
            if video_clip.duration < final_duration:
                if loop_video:
                    video_clip = mp.vfx.loop(video_clip, duration=final_duration)
                else:
                    video_clip = video_clip.set_duration(final_duration)
            else:
                video_clip = video_clip.subclip(0, final_duration)
        elif sync_mode == "custom" and target_duration > 0:
            final_duration = target_duration
            if video_clip.duration < final_duration:
                if loop_video:
                    video_clip = mp.vfx.loop(video_clip, duration=final_duration)
                else:
                    video_clip = video_clip.set_duration(final_duration)
            else:
                video_clip = video_clip.subclip(0, final_duration)
            if audio_clip.duration < final_duration:
                audio_clip = mp.afx.audio_loop(audio_clip, duration=final_duration)
            else:
                audio_clip = audio_clip.subclip(0, final_duration)
        else:
            final_duration = min(video_clip.duration, audio_clip.duration)
            video_clip = video_clip.subclip(0, final_duration)
            audio_clip = audio_clip.subclip(0, final_duration)

        # Mix existing video audio if requested and present
        if video_clip.audio and video_volume > 0:
            orig_audio = video_clip.audio.volumex(video_volume)
            composite_audio = mp.CompositeAudioClip([orig_audio, audio_clip])
            final_video = video_clip.set_audio(composite_audio)
        else:
            final_video = video_clip.set_audio(audio_clip)

        # Export video
        final_video.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile="temp-audio.m4a",
            remove_temp=True,
            preset="fast",
            ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
        )

        video_clip.close()
        audio_clip.close()
        final_video.close()

        success = True
        out_duration = final_duration
        print(f"[MediaStitcher] MoviePy stitch completed successfully! Output: {output_path}")

    except Exception as e:
        print(f"[MediaStitcher] MoviePy execution notice / fallback: {e}")
        traceback.print_exc()

        # Fallback to direct FFmpeg CLI if moviepy is not yet installed or encountered an issue
        try:
            print("[MediaStitcher] Executing high-performance direct FFmpeg fallback...")
            import subprocess

            # Probe durations
            def get_length(filename):
                result = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                         "format=duration", "-of",
                                         "default=noprint_wrappers=1:nokey=1", filename],
                                        stdout=subprocess.PIPE,
                                        stderr=subprocess.STDOUT)
                return float(result.stdout)

            try:
                v_dur = get_length(video_path)
            except:
                v_dur = 5.0
            try:
                a_dur = get_length(audio_path)
            except:
                a_dur = 15.0

            if sync_mode == "match_video":
                out_duration = v_dur
            elif sync_mode == "match_audio":
                out_duration = a_dur
            elif sync_mode == "custom" and target_duration > 0:
                out_duration = target_duration
            else:
                out_duration = min(v_dur, a_dur)

            # Build FFmpeg command with looping and audio volume filtering
            ffmpeg_cmd = [
                "ffmpeg", "-y",
                "-stream_loop", "-1" if loop_video else "0",
                "-i", video_path,
                "-stream_loop", "-1",
                "-i", audio_path,
                "-t", str(out_duration),
                "-filter_complex", f"[1:a]volume={audio_volume},afade=t=in:ss=0:d={fade_in_sec},afade=t=out:st={max(0, out_duration - fade_out_sec)}:d={fade_out_sec}[a]",
                "-map", "0:v:0",
                "-map", "[a]",
                "-c:v", "libx264",
                "-c:a", "aac",
                "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-shortest",
                output_path
            ]

            res = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and os.path.exists(output_path):
                success = True
                print(f"[MediaStitcher] FFmpeg fallback stitched video successfully: {output_path}")
            else:
                error_msg = res.stderr or "FFmpeg execution failed"
                print(f"[MediaStitcher] FFmpeg error: {error_msg}")

        except Exception as ffmpeg_err:
            error_msg = str(ffmpeg_err)
            print(f"[MediaStitcher] FFmpeg fallback failed: {ffmpeg_err}")

    result_json = {
        "ok": success,
        "outputPath": output_path,
        "outputUrl": f"/media/stitched/{os.path.basename(output_path)}",
        "duration": out_duration,
        "error": error_msg if not success else None
    }
    print(f"JSON_RESULT:{json.dumps(result_json)}")

def main():
    parser = argparse.ArgumentParser(description="Gina AI Factory MoviePy Multimedia Stitcher")
    parser.add_argument("--video_path", type=str, required=True, help="Path to input video file")
    parser.add_argument("--audio_path", type=str, required=True, help="Path to input audio track")
    parser.add_argument("--output_path", type=str, required=True, help="Path for rendered stitched MP4")
    parser.add_argument("--audio_volume", type=float, default=1.0, help="Audio volume multiplier (0.0 to 2.0)")
    parser.add_argument("--video_volume", type=float, default=0.0, help="Original video audio volume (0.0 to 1.0)")
    parser.add_argument("--fade_in", type=float, default=0.5, help="Audio fade-in seconds")
    parser.add_argument("--fade_out", type=float, default=1.0, help="Audio fade-out seconds")
    parser.add_argument("--loop_video", action="store_true", help="Loop video if shorter than audio")
    parser.add_argument("--sync_mode", type=str, default="match_video", choices=["match_video", "match_audio", "custom", "shortest"])
    parser.add_argument("--duration", type=float, default=0.0, help="Target custom duration in seconds")

    args = parser.parse_args()
    stitch_media(args)

if __name__ == "__main__":
    main()
