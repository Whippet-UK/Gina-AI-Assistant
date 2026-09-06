# Update Notes — v1.17.75

## AudioCraft local-cache and dashboard fix

### Problem
The Music Studio Download button stored a Hugging Face snapshot in a direct local folder while the Generate path asked Transformers/AudioCraft to resolve the model by repo ID again. That allowed the Generate button to perform a second network download even when the UI said the model was cached. The shared job inspector also polled `/api/jobs/:id/workflow` for `music_studio` jobs even though they are Python jobs, producing repeated 404s.

### Fix
- Download and generation now share `C:\Gina_AI\models\audio` as the Hugging Face cache root.
- MusicGen generation is explicitly local-only.
- AudioGen uses the official AudioCraft runtime and is explicitly identified as text-to-sound/SFX/atmosphere.
- AudioCraft download/generation jobs are serialized through one exclusive lane.
- Music Studio exposes live model/load/synthesis/output telemetry.
- External Python jobs return a valid workflow-inspection envelope instead of 404.

### Validation
- `python -m py_compile scripts/music_generator.py scripts/download_audiocraft.py` passes.
- TypeScript full-project compilation could not be completed in this extracted ZIP because dependencies/node_modules are not installed in the inspection environment.
