# Gina AI Factory v1.17.55 — FLUX GGUF / AIDA64 1024×600

## What changed

- `flux_image.json` now uses `UnetLoaderGGUF` with `flux1-schnell-Q4_K_S.gguf`.
- `flux_image_reference.json` now uses the same GGUF model loader.
- Creator Studio defaults now target `FLUX.1-Schnell (GGUF Q4_K_S)` and `1024 × 600` AIDA64 output.
- The existing server-side 1024×600 enforcement and returned-PNG dimension verification remain active.
- The diagnostic suite now checks:
  - GGUF loader registration
  - exact GGUF model name
  - absence of the legacy `UNETLoader` in `flux_image`
  - 1024×600 baseline latent dimensions
  - presence of the GGUF model file (WARN rather than FAIL if it is not installed)

## Install

Replace the existing Gina project files with this release. Keep the ComfyUI model at:

`C:\Gina_AI\ComfyUI_windows_portable\ComfyUI\models\unet\flux1-schnell-Q4_K_S.gguf`

The ComfyUI-GGUF custom node must remain installed and `gguf` must be installed in the Python environment that actually runs ComfyUI (`C:\Gina_AI\g_env`).

## Verification

Run the Gina one-click test suite. The new checks should report the GGUF workflow and 1024×600 lock as PASS, and the model-file check should PASS when the model is in the expected path.

TypeScript validation was attempted in the packaging environment, but project dependencies were not installed, so a complete application build could not be performed here. JSON workflow/package/metadata files were parsed successfully.
