# Gina AI Factory v1.20.7 — Broader Code Review & Autonomy Hardening

## Scope
Static cross-surface review of the current project snapshot across Music/ACE-Step, Autonomous Agent/Repair Loop, AIDA64, Image Creation, Video, GIF Studio, StreamInject, Assets, Jobs, and Local AI.

## Findings and fixes

### 1. Autonomous repair loop was a validation loop, not a repair loop
`server/agent/AutonomousRepairLoop.ts` constructed a repair prompt but never sent it to the local LLM or wrote a repair. Failed validation therefore repeated unchanged until the cycle limit. The repair stage now requests one constrained JSON file replacement from the local LLM, validates the target is an existing file inside the workspace, applies it, and relies on the next validation cycle as the gate.

### 2. Job cancellation could cancel unrelated ComfyUI work
`/api/jobs/:id/cancel` previously called ComfyUI `/queue` with `{clear:true}`, which clears the entire pending queue. The route now deletes only the selected prompt ID and interrupts ComfyUI only for a running selected job. AudioCraft generation/stem subprocesses are also tracked by job ID and can be terminated locally.

### 3. Duplicate Image Studio input surface
`src/components/gina-image/GinaImageInput1.tsx` duplicated the exported `GinaImageInput`, `InputImageMode`, and `InputImageTab` definitions while the active application imports `GinaImageInput.tsx`. The unused duplicate was removed to eliminate an abandoned parallel implementation.

### 4. Retired video vocabulary remained in active parser metadata
`server/comfy/WorkflowParser.ts` still advertised LTX sampler/loader classes despite Wan 2.1 being the active video lane. Those bindings were removed. Current `metadata.json` capability names were also reconciled from stale Gemini/Gemma/LTX identifiers to the current local-first/Qwen/Wan vocabulary. Historical changelog/update notes remain historical.

### 5. Autonomous context map contained stale implementation paths
`server/agent/ProjectMapManager.ts` referenced removed `CreateStudio`, `GinaImageCanvas`, AIDA64 editor and StreamInject suite files, and its generated map version was hard-coded to an older release. Canonical targets now match the actual tree, the map reads the active version, and the Definition of Done gate verifies every target exists.

### 6. Autonomous workspace file access was not path-bounded
`AutonomousAgentEngine.readFile()` and `writeFile()` joined model-supplied paths directly to the workspace root. They now reject absolute paths and traversal segments and require the resolved target to remain inside the assigned workspace.

### 7. ACE-Step default port disagreed with the Windows launcher
The backend default was `127.0.0.1:8001` while the supplied launcher and Start Factory configuration use `127.0.0.1:8101`. Both backend defaults now use 8101, while `ACESTEP_API_URL` remains the explicit override.

### 8. Cross-suite UI drift found in Video and Image Creation
Video Studio was still submitting the temporal frame count as `batch_size` even though the server safety gate forces batch size to 1. Image Creation progress copy always said FLUX.1 Lite even for Juggernaut/SDXL jobs. Both are now reconciled.

### 9. Music long-duration generation remains structurally sequential
The MusicGen/AudioGen path correctly chunks long requests into bounded <=30-second generation blocks and serializes the audio lane, but independently generated blocks are concatenated rather than acoustically crossfaded/continuity-conditioned. This is a known quality limitation rather than a false completion state, and remains a candidate for a dedicated Music Suite follow-up. ACE-Step uses its documented asynchronous `release_task`/`query_result` workflow and has no documented task-cancellation endpoint in the current API reference.

## Acceptance boundaries

The repair loop also rejects protected project-contract files, caps replacement size, and restores its own edits when validation or the final integrity gate fails. This prevents an unsuccessful autonomous repair attempt from leaving the workspace in a worse state.

The review environment can statically validate code structure and project consistency, but it cannot truthfully claim live Windows GPU, FFmpeg, ComfyUI, or ACE-Step acceptance. Those remain explicit external acceptance tests.
