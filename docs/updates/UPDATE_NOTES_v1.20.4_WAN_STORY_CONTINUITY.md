# v1.20.4 — Wan Sequential Story Continuity Repair

- Fixed Wan sequential-story conditioning detection for current ComfyUI node names (`WanVaceToVideo` vs legacy `WanVACEToVideo`).
- Added native `WanImageToVideo` detection for genuine Wan I2V models/workflows.
- Corrected VAE discovery for the modern `UNETLoader` + `VAELoader` Wan graph.
- A Wan T2V-only installation no longer renders Scene 1 and then aborts at Scene 2. It continues with a clearly logged T2V fallback and preserves the generated scenes.
- When a compatible Wan I2V/VACE path is available, the story runner uses it automatically for final-frame conditioning.
- Added `referenceMode` metadata so the UI/job audit can distinguish true I2V/VACE conditioning from the T2V fallback.
