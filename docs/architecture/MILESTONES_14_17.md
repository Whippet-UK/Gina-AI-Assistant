# Gina AI Factory — Milestones 14–17

## Phase 14 — Workflow JSON/PNG ingestion

System > Automation accepts ComfyUI API-format JSON and PNG metadata exports. PNG `tEXt`/`iTXt` payloads are inspected for workflow/prompt JSON, the workflow is copied into the configured Gina workflow directory, registered, parsed for bindings/capabilities, and checked against ComfyUI `/object_info` for missing node classes.

## Phase 15 — AIDA64 HUD mode

System > Automation can open a dedicated telemetry HUD browser window at `?hud=1`. The HUD uses the existing AIDA64 telemetry bridge at 500 ms and is designed for high-DPI secondary displays. Browser chrome remains controlled by the operating system; this is intentionally a browser-native portable HUD rather than an Electron-only dependency.

## Phase 16 — GGUF benchmark and VRAM tuner

System > Automation can run a controlled GPU-layer sweep. Gina stops/restarts the managed llama-server for candidate layer counts, measures a small deterministic prompt, records latency/token throughput when the server reports usage, selects the fastest passing candidate, and restores the original layer setting. The sweep remains bounded to 8–36 layers and the existing 7372 MB VRAM cage remains the governing safety rule.

## Phase 17 — Knowledge auto-indexing

Gina can watch `C:\Gina_AI` recursively on supported filesystems, ignoring models, tools, generated output, runtime logs, caches and version-control directories. Relevant Markdown, text, JSON, TypeScript/TSX, batch and PowerShell changes trigger a debounced zero-VRAM RAG reindex. The watcher starts automatically unless `GINA_KNOWLEDGE_WATCHER=false` is configured.
