# Gina AI Factory v1.17.64 — GIF Studio Sequential Story Controls

## Added
- GIF Studio **Single Clip / Sequential Story** generation mode selector.
- Multi-scene story timeline with add, duplicate, delete, reorder-ready scene structure and active-scene editing.
- Per-scene title, duration, prompt, transition, seed mode, character continuity and previous-frame reference controls.
- Story-level final-frame handoff, character/environment/camera continuity switches, automatic scene generation preference, and RIFE mode.
- Automatic total-duration calculation from scene durations.
- Generation telemetry now exposes the selected generation mode.
- Story configuration is attached to generation parameters so the backend has the complete scene plan available.
- Corrected GIF job audit metadata to use the built `effectiveLoopCount` value rather than an out-of-scope variable.

## Notes
The UI now exposes the controls needed for true sequential story orchestration. The existing LTX workflow remains the execution engine; the story plan is passed as structured generation metadata so it can be wired to per-scene final-frame/reference orchestration without changing the working single-clip pipeline.
