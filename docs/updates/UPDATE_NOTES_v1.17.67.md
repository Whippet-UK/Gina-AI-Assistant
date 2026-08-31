# Gina AI Factory v1.17.67 — Sequential Story Completion Fix

## Issue
GIF Studio Sequential Story could reach the end of an LTX scene and stop progressing even though ComfyUI had completed the child prompt.

## Root cause
The story runner waited only for Gina's in-process `JobManager` completion event. If the ComfyUI WebSocket completion message was missed during reconnect/load, the child job remained waiting indefinitely.

## Fix
Each sequential LTX child now has a `/history/<prompt_id>` polling fallback. Successful ComfyUI history releases the child and advances to the next scene; history-reported execution errors fail the child and parent cleanly.

## VRAM
The previous v1.17.66 fix remains active: temporal frame count is separate from `batch_size`, and LTX story children force `batch_size=1` for the RTX 3070 Ti 8GB target.
