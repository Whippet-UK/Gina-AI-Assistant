# Project Update Backlog

## Core Context & Guidelines
- Always implement clean error checking across both client and server files.
- Test your modifications locally before marking them complete.

## 🟩 Open Requests
- [ ] **Infrastructure: Mount and Validate `wan2.1_vace_1.3B_fp16.safetensors`**
  - **Context:** The file has been manually downloaded to the `models/checkpoints` directory but must be indexed by the server instance.
  - **Action Required:** Restart the server container via `Start_Factory.bat` to rebuild the ComfyUI checkpoint manifest mapping. Verify the dropdown selector registers the VACE footprint.
  - **Smoke Test Requirement:** Execute a micro-generation (1.0s target duration, 12 frames raw baseline) using the existing Whippet character image slot anchor to confirm CUDA/bfloat16 tensor allocation succeeds without causing a VRAM out-of-memory crash.
  

## 🟨 External Acceptance Testing (not an open coding request)
- [ ] v1.20.4 — Run the GIF Studio frame-sequence fix on the live Windows/FFmpeg installation: upload a multi-frame batch, run the workflow, and confirm the exported GIF/MP4 is one packed animation rather than fragmented per-frame output. Implemented and syntax-checked only; no FFmpeg/GPU environment was available to execute it end-to-end.
- [ ] Phase 54 — Run the classic-fallback web retrieval loop against various live news and wiki surfaces to verify that the string anchor-splitter handles structural changes across external layout layers.
- [ ] Phase 52 — Run the existing-media GIF Studio test on the live Windows installation and confirm ComfyUI remains online. This requires the user's local ComfyUI/FFmpeg environment and cannot be truthfully simulated here.
- [ ] Phase 51 — Run the live Windows/ComfyUI acceptance suite for Wan 2.1, image description, Music lyrics, AIDA64 preset semantics, live grounding, and retired-workflow cleanup.

### Closed reliability/autonomy request
The former broad request “making Gina reliable and genuinely autonomous” is **completed**. Its five requested capabilities are implemented: machine-enforced Definition of Done, persistent project mapping, local + web research, autonomous repair/re-validation, and GitHub lifecycle integration.

- [x] **2026-09-13 — Broader Code Review & Autonomy Hardening**
  - Reviewed Music/ACE-Step, Autonomous Agent/Repair Loop, AIDA64, Image, Video, GIF, StreamInject, Assets, Jobs, and Local AI surfaces for partially wired features and stale assumptions.
  - Fixed the no-op `AutonomousRepairLoop` repair stage so a local LLM can produce one constrained existing-file edit which is then revalidated.
  - Fixed `/api/jobs/:id/cancel` so cancellation no longer clears every queued ComfyUI job; cancellation is prompt-scoped, and AudioCraft child processes can be terminated by job ID.
  - Removed the unused duplicate `src/components/gina-image/GinaImageInput1.tsx`, removed retired LTX bindings from the active workflow parser, and reconciled stale Gemma/Gemini/LTX capability names in `metadata.json`.
  - Advanced the synchronized release to v1.20.7 / Phase 55 with restore point `RESTORE_V1.20.7_BROADER_CODE_REVIEW_HARDENING`.
  - **Validation:** Python syntax and targeted TypeScript transpile checks are required; live Windows/ComfyUI/ACE-Step acceptance remains external.

## 🟥 Completed Requests
- [x] **2026-09-20 — Phase 56: Unified Audio, APNG & Local AI UX**
  - Added local Bark + XTTS v2 generation, hybrid/stitched timelines, XTTS clone upload validation, searchable SQLite voice metadata, favourites and preview generation.
  - Added GIF Studio APNG export, explicit image ADD ONLY / PRESERVE SOURCE editing, wider Local AI layout and whole-PC electricity/cost telemetry.
  - Added deterministic web-app build routing so Gina can scaffold a new local project without an existing workspace.
  - Added `scripts/setup_audio_deps.py` and `scripts/unified_audio_backend.py`.
  - **Validation:** Python syntax, TypeScript/TSX syntax and FFmpeg APNG smoke test passed; full npm/Vite build remains external because this archive has no installed `node_modules`.

- [x] **2026-09-13 — Infrastructure: Add StreamInject Source Audio Stripping Pass**
  - Added the `--strip-audio` render flag and a pre-slice FFmpeg stream-copy pass (`-vcodec copy -an`) covering intro, gameplay, outro, and green-screen overlay inputs, with scratch-file substitution before timeline assembly.
  - Propagated `stripAudio` through the StreamInject Express route/job ledger and `StreamInjectService`, then added the Step 4 `stripAudioToggle` dashboard control and request payload mapping.
  - Advanced the synchronized release to v1.20.6 / Phase 54 with restore point `RESTORE_V1.20.6_STREAMINJECT_AUDIO_STRIPPING_ENGINE`.
  - **Validation:** Python syntax and TypeScript compilation are required before completion; live Windows FFmpeg acceptance remains dependent on the user's local runtime.

- [x] **2026-09-13 — FLUX.1 Lite High-Precision T5 Text Encoder Reconciliation**
  - Reconciled `DualCLIPLoader` `clip_name2` in `workflows/flux_lite_image.json` from `umt5_xxl_fp8_e4m3fn_scaled.safetensors` (Wan 2.1 video tokenizer with vocab 256,384) to `t5xxl_fp8_e4m3fn.safetensors` (FLUX tokenizer with vocab 32,128), eliminating the `RuntimeError: Error(s) in loading state_dict for T5: size mismatch for shared.weight: copying a param with shape torch.Size([256384, 4096]) from checkpoint, the shape in current model is torch.Size([32128, 4096])`.
  - Reconciled `server.ts` `FLUX_T5` default to `t5xxl_fp8_e4m3fn.safetensors`.
  - Added dynamic ComfyUI workflow adaptation in `adaptWorkflowForComfySession` to auto-discover and map available T5-XXL variants (`t5xxl_fp8_e4m3fn.safetensors`, `t5xxl_fp8_e4m3fn_scaled.safetensors`, `t5xxl_fp16.safetensors`).
  - Added startup self-healing in `sanitizeLocalFluxLiteWorkflow` to automatically heal existing local disk workflows.
  - Added pre-dispatch check rejecting any attempt to pass UMT5 to FLUX with a helpful error message.
  - Updated `CapabilityManager.ts` and `GinaImageSettings.tsx` text encoder labels and aliases.
  - Advanced version to v1.20.5 / `RESTORE_V1.20.5_FLUX_HIGH_PRECISION_T5_RECONCILIATION`.

- [x] **2026-09-13 — GIF Studio Frame-Sequence Export Fix**
  - Batch-uploaded frame images are now grouped into one `sequence` asset (`listGifStudioAssets` in `server.ts`) instead of being flattened into unrelated single-frame entries.
  - `runGifAssetProcessingJob` gained a `sourceKind === 'sequence'` path that packs the frame set into one clip via the FFmpeg concat demuxer, instead of only ever looping a single static image.
  - `GifStudio.tsx` passes the frame list through on submit and distinguishes sequence assets in the source picker.
  - `resolveStoredJobOutput` now honours the requested export format (GIF vs MP4) instead of returning whichever stored output came first.
  - Version advanced to v1.20.4 / `RESTORE_V1.20.4_GIF_STUDIO_FRAME_SEQUENCE_PACKING`. Live Windows/FFmpeg acceptance is tracked separately above.

- [x] **2026-09-13 — Sovereign Web Research Integration Pass**
  - Completely removed external API, token-key, and account creation requirements from internet search modules.
  - Rewrote `server/agent/WebResearchService.ts` to implement a custom, local HTML slicing engine that scrapes Google's classic minimalist portal (`gbv=1`), extracting URLs, titles, and text snippets by targeting layout anchor tags (`<a href="/url?q=">`).
  - Hardened `server/agent/AutonomousResearchEngine.ts` to protect context construction loops from out-of-bounds array errors when search indexes return zero entries.
  - Modernized the React dashboard layout layer within `src/components/LocalCapabilityPanel.tsx` to explicitly monitor sovereign crawler configurations and trace search pipeline boundaries right on the user dashboard interface.

- [x] Initial hardware footprint configuration for memory-safe 12 Base FPS pipelines.
- [x] 2026-09-12 — Phase 53 project-wide reconciliation: synchronized version/save-point metadata across all required surfaces, reconciled AGENTS/AI checklist/request tracker/milestones, closed the broad reliability/autonomy request, and converted live hardware checks into explicit external acceptance testing.
- [x] 2026-09-12 — Phase 52 implementation: GIF Studio existing-media conversion moved to an isolated, bounded FFmpeg path; ComfyUI is no longer used for ordinary asset-to-GIF conversion.
- [x] 2026-09-12 — Phase 51 implementation pass: Creator Suite Reliability & Workflow Consistency
  - Local AI live-information requests now receive a server-generated Europe/London date/time plus live web verification when enabled.
  - Wan 2.1 direct generation now keeps temporal frames separate from batch size, uses 24fps timing, and enforces the conservative 8GB-safe direct envelope (73 frames / 3s / 393,216 pixels).
  - Retired LTX and legacy `flux_image` production workflows/components were removed from the active package and stale active UI references were reconciled to Wan 2.1 / FLUX.1 Lite.
  - AIDA64 1024×600 validation was corrected to be request/preset-specific rather than incorrectly treating 1024×600 as the FLUX Lite baseline.
  - “Describe this Image into Prompt” now uses Qwen Vision against the actual image and auto-applies a reconstruction-quality profile without overwriting settings already manually changed by the user.
  - Music “Write Lyrics” now routes through the configured LocalLlmManager rather than a hard-coded localhost endpoint.
  - Project version advanced to v1.20.1 / Phase 51.
- [x] 2026-09-12 — Phase 49: Autonomous Project Completion Gate & Persistent Project Map
  - Machine-enforced Definition of Done gate (`DefinitionOfDoneGate.ts`) verifies version synchronization across 6 root files, checklist presence, zero retired engine references, TypeScript compilation, and root cleanliness.
  - Persistent Project Map manager (`ProjectMapManager.ts`) indexes Frontend, Backend, Models, Workflows, Configuration, Tests, and Documentation with surface relationship tracking and query capability.
  - Enforced in `AutonomousAgentEngine.ts` and `server.ts` execution loops with automatic repair feedback into subsequent agent turns upon failure.
  - Added `inspect_project_map` and `verify_definition_of_done` tools and `/api/agent/project-map` and `/api/agent/definition-of-done` REST endpoints.
  - Versioned restore point: `RESTORE_V1.19.8_PROJECT_COMPLETION_GATE`.
- [x] 2026-09-12 — Phase 44: Local AI Project Attachments & Large ZIP Ingestion
  - Qwen Coder Attach control is enabled for text/code/config files and project ZIP archives.
  - Image attachments remain restricted to Qwen 2.5-VL Vision Mode.
  - Project ZIP uploads are imported into dedicated workspaces and automatically inspected without executing uploaded code.
  - Local AI ZIP capacity increased from 100 files to 10,000 files, with a 100MB archive upload limit.
  - Large project archives are handled as workspaces rather than injecting every file into the LLM prompt.
- [x] 2026-09-12 — Phase 43: Local AI Stack Optimization & UI Toggle Swap
  - Replaced Gemma routing with Qwen 2.5-VL Vision + Qwen Coder 7B text-only mode.
  - Qwen Vision remains the boot/default model and uses the local multimodal projector; Coder mode unloads the projector and raises the effective context to 16K.
  - Added Image Studio High Precision routing to FLUX.1 Lite + UMT5 and migrated active video routing to Wan 2.1 1.3B BF16.
  - Updated active project documentation and version to v1.19.3.

- [x] **2026-09-20 — Phase 57: Voice Generator & Local AI Preview Restore**
  - Renamed the Unified Audio navigation/page labels to Voice Generator / Voice Audio Generation.
  - Fixed first-run SQLite directory creation and Python interpreter mismatch for TTS/Bark/pydub.
  - Added audio diagnostics and restored Local AI Interactive Preview + visible auto-growing prompt composer.



## Phase 58 — Voice Engine Repair & Fluid Layout — 2026-09-20

- Added deterministic Windows Python discovery for the Voice Generator. The setup script persists the exact `sys.executable` used to install TTS/Bark/pydub under `.gina/audio_python.json`; the Node route checks that binding, Gina `g_env`, `python`, and the Windows Python Launcher.
- Added detailed audio diagnostics including candidate interpreters, import paths, database path and database writability.
- Hardened the voice SQLite path with writable-directory detection and a local `.gina/data/audio` fallback if the primary `data/audio` location cannot be opened.
- Added post-generation physical audio manipulation: `pitch_shift_semitones` (-12 to +12), `formant_shift` (0.5 to 1.5), and pitch-preserving `speed_factor` (0.5x to 2.0x), using local SciPy processing before final WAV/MP3/FLAC export. SciPy STFT/iSTFT and resampling are used for the local signal-processing stages.
- Refactored the master application wrapper to full-width fluid layout and Local AI / Voice Generator workspaces to responsive 12-column grids, removing the previous 1500px master constraint and fixed Local AI column widths.
- Kept the Local AI Interactive Preview and auto-growing prompt composer intact.

### Phase 58 Validation
- Python syntax compile: PASS for `scripts/setup_audio_deps.py` and `scripts/unified_audio_backend.py`.
- TypeScript syntax transpilation: PASS for changed TS/TSX files.
- ZIP integrity: PASS.
- Full Windows runtime/audio-model generation remains to be exercised on the user's machine because the installed Python/Node environment is outside this isolated build workspace.


## Phase 59 — Voice Engine Runtime Repair & Fluid Layout — 2026-09-20
- [x] Attach/Send composer overlap removed and action space reserved.
- [x] Local AI chat/preview height now fills the available viewport instead of stopping well above the bottom edge.
- [x] Audio setup repairs broken imports, installs Torch/Torchaudio before Coqui TTS, purges conflicting torchcodec to eliminate Windows DLL entry point errors, and validates the final interpreter.
- [x] Main Windows launcher runs audio setup in the active `g_env`.
- [x] Bark CPU offload enabled for the 8 GB VRAM profile.
- [x] SQLite database-file probe with automatic `.gina/data/audio` fallback.
