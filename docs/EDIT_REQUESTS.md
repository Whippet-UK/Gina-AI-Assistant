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

## 🟥 Completed Requests
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
