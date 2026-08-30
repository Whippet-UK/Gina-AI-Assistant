# Gina AI Factory v1.2 — local ComfyUI bridge

## What changed

- Replaced the old `CheckpointLoaderSimple -> KSampler` FLUX path with the modern ComfyUI 0.31 node graph detected on this machine.
- Added `/api/comfy/readiness` so Gina checks the actual installed ComfyUI nodes/models before queueing a job.
- Added real FLUX.1-Schnell workflow construction using `UNETLoader`, `DualCLIPLoader`, `BasicGuider`, `RandomNoise`, `KSamplerSelect`, `BasicScheduler`, `EmptySD3LatentImage`, `SamplerCustomAdvanced`, `VAEDecode`, and `SaveImage`.
- Added `/api/comfy/output/:promptId` to return the real ComfyUI output URL.
- Added local output display to the ComfyUI node graph.
- Removed the old checkpoint/VAE assumptions from the local FLUX queue path.
- Loads `.env` automatically.
- Gina binds to `127.0.0.1:3000` in development.

## Your machine paths

```text
Gina root:
C:\Gina_AI

Gina Python environment:
C:\Gina_AI\g_env

ComfyUI:
C:\Gina_AI\ComfyUI_windows_portable\ComfyUI

ComfyUI API:
http://127.0.0.1:8188

FFmpeg:
C:\ffmpeg\bin
```

## Current blocker: FLUX VAE

Your ComfyUI `models\vae` directory is currently empty except for `put_vae_here`, so the FLUX image pipeline cannot decode the generated latent yet.

ComfyUI's official FLUX Schnell workflow requires `ae.safetensors` in `ComfyUI/models/vae`. The official Black Forest Labs FLUX.1-schnell repository lists `ae.safetensors` as a 335 MB file.

Download it from the official model repository:
https://huggingface.co/black-forest-labs/FLUX.1-schnell/tree/main

You may need to accept the repository's access conditions while logged in to Hugging Face.

Put the downloaded file here:

```text
C:\Gina_AI\ComfyUI_windows_portable\ComfyUI\models\vae\ae.safetensors
```

Then restart ComfyUI.

## Verify before starting Gina

In Command Prompt:

```bat
curl http://127.0.0.1:8188/system_stats
curl http://127.0.0.1:8188/object_info/VAELoader
```

The second command should contain:

```text
ae.safetensors
```

You can also check Gina's readiness endpoint after Gina is running:

```text
http://127.0.0.1:3000/api/comfy/readiness
```

It should eventually report:

```json
"ready": true
```

## Install / run Gina

Open Command Prompt in `C:\Gina_AI` and activate the Gina environment if you want the same environment explicitly selected:

```bat
cd /d C:\Gina_AI
g_env\Scripts\activate
npm install
npm run dev
```

Then open:

```text
http://localhost:3000/
```

Keep ComfyUI running at:

```text
http://127.0.0.1:8188
```

## First functional test

1. Start ComfyUI.
2. Confirm `ae.safetensors` appears in `VAELoader`.
3. Start Gina.
4. Open `http://localhost:3000/`.
5. Open the ComfyUI node graph section.
6. Use the default FLUX Schnell prompt.
7. Press the real pipeline run button.
8. Gina queues a real ComfyUI prompt.
9. Gina polls `/history/{prompt_id}`.
10. When complete, Gina retrieves the real image from ComfyUI `/view` and displays it.

## Important

Do not change PyTorch/CUDA yet. Your tested environment is:

```text
Python 3.12.10
PyTorch 2.6.0+cu124
ComfyUI 0.31.0
RTX 3070 Ti
--lowvram
--fp8_e4m3fn-text-enc
```

This version deliberately gates the FLUX queue if the required VAE is missing instead of silently substituting an incompatible VAE.

## Video status

The existing LTX video UI is not being treated as functional yet. Its previous workflow used generic/incorrect `CheckpointLoaderSimple` and `LTXVideoSampler` assumptions. The next stage is to inspect the actual LTX 2.3 node/model interface and build that workflow separately after FLUX image generation is verified.
