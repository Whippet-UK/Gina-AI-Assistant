# Gina AI Factory v1.17.60 — Live System Inventory

The System tab is now backed by live local discovery rather than a stale hand-maintained model list.

## What is now current
- FLUX.1-Schnell GGUF Q4_K_S is the active image baseline.
- `mmproj-q8_0.gguf` is the preferred current Gemma projector, with automatic `mmproj*.gguf` fallback discovery.
- LTX-Video is identified from the actual installed model/workflow rather than the obsolete fixed 2B 0.9.8 filename.
- RIFE Motion Studio readiness is detected from both local model files and the ComfyUI `RIFE_VFI` node.
- GIF Studio readiness is detected from the registered GIF workflow and/or VideoHelperSuite nodes.
- ComfyUI `/object_info` is scanned for the current node-class inventory.
- `custom_nodes` is scanned so installed extensions are visible in System.
- Workflow inventory is pulled from the resolved workflow registry, including user overrides under `C:\Gina_AI\workflows`.
- Model Pre-Warm no longer advertises the old Wan/Hunyuan targets; LTX is auto-discovered or can be pinned with `LTX_MODEL`.
- System feature copy now reflects the current GGUF/GIF/RIFE/LTX stack and 60°C performance governance / 85°C emergency brake.

## Rescan behavior
The capability inventory refreshes automatically every 15 seconds and can be manually refreshed with **RESCAN**. This means future model additions should appear in System without another hard-coded UI update as long as they are stored in the normal local model directories.
