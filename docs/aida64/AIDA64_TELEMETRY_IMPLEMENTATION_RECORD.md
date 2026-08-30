# Gina AI Factory — AIDA64 Telemetry & Panel Refinement Record

**Record date:** 2026-08-29  
**Project baseline supplied by user:** Gina AI Factory v1.17.0 AIDA64 Batch Packager
**Current checkpoint after telemetry bridge repair:** v1.17.1  
**Scope:** AIDA64 panel/gauge subsystem only. **LTX-2.3 is frozen and was not changed.**

## 1. Current design direction

Gina remains the creator interface. AIDA64 is the live hardware telemetry source and SensorPanel/LCD target. ComfyUI, LTX and the local image/video production stack are outside this change set.

The AIDA64 subsystem is now being treated as an **Element Factory + Live Telemetry + Canvas Assembler** rather than a collection of isolated generators.

## 2. Implemented in this update

### Interactive Canvas Assembler
- Existing drag/move interaction retained.
- Existing eight-point resize handles retained.
- Exact X/Y pixel editing retained.
- Exact width/height pixel editing retained.
- Scale slider and scale presets retained.
- Aspect-ratio lock retained.
- Snap-to-grid retained.
- Multi-selection retained.
- Alignment retained.
- Added horizontal/vertical distribution for 3+ selected elements.
- Added Match Size action.
- Added Ctrl/Cmd+C and Ctrl/Cmd+V for local element copy/paste.
- Existing undo/redo retained.
- Existing duplicate/delete/layer ordering retained.

### Live AIDA64 Telemetry Bridge
- Added a Windows-local PowerShell shared-memory reader.
- Primary source is the official AIDA64 shared memory block:
  `AIDA64_SensorValues`.
- The bridge reads the XML-like shared-memory payload and exposes discovered sensor ID, label, value, unit and type.
- The server exposes:
  - `GET /api/aida64/telemetry`
  - `GET /api/aida64/telemetry/config`
  - `POST /api/aida64/telemetry/config`
- Default bridge interval is 100 ms.
- Supported interval range is 50–2000 ms.
- Gina starts/stops the bridge with the local server lifecycle.
- No cloud service is involved.

### Live Telemetry workspace
Added a dedicated **Live Telemetry** tab to AIDA64 Studio.

It provides:
- connection status
- sensor count
- source
- bridge rate
- read latency
- UI polling rate
- sensor search
- sensor grouping into CPU/GPU/MEMORY/COOLING/NETWORK/STORAGE/OTHER
- live sensor values
- sensor binding creation
- min/max calibration
- warning threshold
- critical threshold
- smoothing time
- peak hold
- peak decay
- stale/disconnect timeout
- linear/inverse normalisation
- local persistence of reusable sensor bindings

### Gauge Factory live binding
- Gauge Factory now exposes the live AIDA64 sensor list.
- A generated gauge can carry a reusable `sensorBinding` into the Assembler.
- Existing gauge style, warning, critical and 100-state features remain unchanged.

### 7-Value Pod live binding
- Pod Designer now offers live AIDA64 sensors for the hero metric and each of the seven slots.
- Selecting a live sensor updates the displayed sample value and unit.

### Live canvas bindings
AIDA64 panel items now support a reusable `sensorBinding` object.

A bound item can consume a live AIDA64 sensor and use:
- raw value display
- automatic 0–100 normalisation for gauges
- warning/critical colour changes
- smoothing
- peak hold
- stale/disconnected state

A stale binding displays `SENSOR OFFLINE` rather than silently leaving an old value on screen.

## 3. Existing functionality intentionally retained

The supplied v1.17.0 project already contains the following and they were not replaced:
- Gauge Factory
- 100-state gauge generation/export
- large gauge-style registry
- advanced gauge engine
- warning zones
- value-driven colour ramps
- advanced lighting/effects
- 7-value telemetry pods
- modular dial designer
- chassis/backplate generator
- Canvas Assembler
- layout templates
- batch packager
- AI layout compiler

The new telemetry layer is designed to feed these existing systems rather than duplicate them.

## 4. Intended architecture

```text
AIDA64
  |
  | AIDA64_SensorValues shared memory
  v
Gina AIDA64 Telemetry Bridge
  |
  v
Telemetry Manager / Sensor Bindings
  |          |           |
  v          v           v
Gauge     7-Value       Canvas
Factory     Pods       Assembler
  |          |           |
  +----------+-----------+
             |
             v
     AIDA64 Panel Project
```

## 5. Binding model

Each live element can retain:

```text
sensorId
label
min
max
warning
critical
smoothingMs
peakHold
peakDecayMs
normalisation
staleTimeoutMs
```

This keeps telemetry logic independent of the artwork. The same sensor binding can therefore drive a circular gauge, bar, digital value, telemetry pod or other panel element.

## 6. AIDA64 setup requirement

The local bridge expects AIDA64 External Applications → Shared Memory to be enabled. AIDA64 documents `AIDA64_SensorValues` as its shared-memory sensor interface and describes the payload as an XML-tag string. Temperatures are supplied in Celsius and labels are in English.

If AIDA64 shared memory is disabled or AIDA64 is closed, Gina reports the bridge as disconnected rather than fabricating telemetry.

## 7. Deliberately not changed

- LTX-2.3 workflows and 8 GB-safe presets.
- ComfyUI workflows.
- FLUX image generation.
- Shorts Factory.
- Local LLM implementation.
- Audio/TTS.
- Gemini/cloud AI features.

## 8. Validation status

The source tree was inspected after the change. A full TypeScript type-check cannot be completed in this exported bundle because `node_modules` is not included; the compiler therefore reports the project's existing missing dependency/type-definition errors. The new source was checked for syntax-level structure and the only new explicit type issue surfaced during the dependency-free check was corrected in `Aida64TelemetryPanel.tsx`.

**First real-machine validation:** start AIDA64, enable Shared Memory, start Gina, open AIDA64 Studio → Live Telemetry, and confirm that the sensor browser populates. Then bind one gauge to a real sensor in Assembler Pro.

## 9. Next planned refinement after first live test

1. Add AIDA64 project/package export containing artwork, layout, bindings and setup instructions.
2. Add optional WMI/Registry fallback adapters if shared memory proves unavailable on a particular AIDA64 configuration.
3. Add sensor-specific unit/range presets for CPU/GPU/RAM/VRAM/network/disk/battery-style values.
4. Add visual threshold/redline previews in the gauge generator.
5. Add direct live binding persistence inside Gauge Factory/Pod Factory templates.

## 10. Restore point

If the live telemetry layer needs to be backed out, revert the files listed in the corresponding `CHANGELOG.md` entry and remove:

```text
server/aida64/Aida64TelemetryBridge.ts
scripts/aida64_shared_memory.ps1
src/hooks/useAida64Telemetry.ts
src/components/aida64/Aida64TelemetryPanel.tsx
```

and remove the `sensorBinding` additions from `src/types.ts` and `src/components/aida64/Aida64CanvasAssembler.tsx`.

## 11. 2026-08-29 — v1.17.1 telemetry bridge repair checkpoint

- **Root cause addressed:** the frontend could receive an HTML/Vite SPA response when the dashboard was served from a separate Vite port, producing `Unexpected token '<'` during `response.json()`.
- **API routing:** Vite now proxies `/api/*` to the local Gina engine on `http://127.0.0.1:3200`, so an accidental 5173 development-server launch no longer strands API requests on the SPA fallback.
- **Frontend diagnostics:** `useAida64Telemetry()` now checks HTTP status and content type before JSON parsing and reports a useful port/API diagnostic instead of the raw JSON parser exception.
- **Shared-memory reader:** changed AIDA64 payload extraction to read the documented null-terminated PChar string, with a Unicode fallback, and made the fragment parser tolerant of the documented `<sys>`, `<temp>`, `<fan>`, `<volt>` and other wrapper tags.
- **Reader diagnostics:** distinguishes `shared memory unavailable` from `shared memory opened but no complete numeric records parsed`.
- **Visible version alignment:** the header save point, footer, API version, package metadata and AGENTS version now use `v1.17.1` for this checkpoint. Historical AIDA64 engine/version documents remain unchanged.

**First real-machine test after this checkpoint:** with AIDA64 running and Shared Memory enabled, open Gina and confirm `AIDA64 CONNECTED` plus a populated sensor browser. If the bridge remains disconnected, the displayed error should now identify whether the shared memory is unavailable or the payload is being read without complete sensor records.


## v1.17.1 hotfix
Fixed a TypeScript syntax error in `useAida64Telemetry.ts`: the diagnostic string contained an unescaped apostrophe in `Gina's`, which broke the single-quoted string. The message now uses double quotes.


## 12. 2026-08-29 — v1.17.19 Local Creator Upload Pipeline

The creator dashboard is now the intended operator surface for image/reference input and Local AI document input. The user should not need to open ComfyUI for normal image-generation work.

### ComfyUI reference-image upload
- Added `POST /api/comfy/upload-image`.
- Gina accepts PNG, JPG/JPEG, WEBP, BMP and GIF images up to 12 MB.
- The server writes the image into the local ComfyUI `input` directory and returns the generated input filename.
- Added a local input proxy route for preview retrieval.
- Workflow parsing now detects `LoadImage` and exposes it as an `input_image` binding.
- Added a built-in `flux_image_reference.json` workflow using `LoadImage → VAEEncode → SamplerCustomAdvanced → VAEDecode → SaveImage`.
- Prompt Studio shows the reference-image uploader only when the selected workflow exposes an image input.
- The uploaded filename is injected into the workflow automatically at generation time.
- No manual ComfyUI interaction is required for this path.

### Local AI file attachments
Local AI chat now has a dashboard **File** attachment control. It reads supported text/code/config files locally in the browser and includes their contents in the next Local LLM request.

Supported extensions:
`TXT, MD, MARKDOWN, JSON, CSV, TSV, LOG, INI, CFG, CONF, YAML, YML, XML, HTML, HTM, CSS, JS, JSX, TS, TSX, PY, PS1, BAT, CMD, SH, SQL, C, H, CPP, HPP, CC, JAVA, CS, GO, RS, TOML, ENV`

Limits:
- 512 KB per file
- up to 3 files per turn

Binary/image files are intentionally not offered to Local AI because the current Local AI chat path is text-only.

### v1.17.19 checkpoint
`RESTORE_10_V1.17.19_LOCAL_CREATOR_UPLOADS`

Scope remains strictly local. LTX-2.3, FLUX model files and existing 8 GB-safe video presets were not changed.
