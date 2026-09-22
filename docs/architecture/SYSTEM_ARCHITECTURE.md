# Gina AI Factory — System Architecture & Data Flow

## 1. High-Level Architecture Overview

Gina AI Factory is a strictly local, bare-metal creator and telemetry dashboard running on Windows (and portable to sandboxed containers). It coordinates multiple specialized hardware runtimes on an 8GB GPU using strict mutual exclusion and zero-VRAM memory guards.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                               │
│  React 19 + TypeScript + Tailwind CSS + Lucide Icons + D3.js Telemetry      │
│  Ports: 3200 (Windows Local Loopback) / 3000 (Cloud Container Ingress)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST & WebSockets
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                             EXPRESS API BROKER                              │
│  /api/telemetry · /api/comfy/* · /api/llm/* · /api/agent/* · /api/rag/*     │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│    ComfyUI Loop   │  llama.cpp CUDA   │  Win32 Telemetry  │  Zero-VRAM RAG  │
│  Port 8188 (REST) │  Port 8080 (REST) │  Shared Memory    │  CPU In-Memory  │
└─────────┬─────────┴─────────┬─────────┴─────────┬─────────┴────────┬────────┘
          │                   │                   │                  │
┌─────────▼───────────────────▼───────────────────▼──────────────────▼────────┐
│                        BARE-METAL HARDWARE LAYER                            │
│  • NVIDIA GeForce RTX 3070 Ti (8GB GDDR6X) — VRAM Cage: 7372 MB (90%)       │
│  • Thermal Brake: 80°C Warning / 85°C Halt                                 │
│  • AMD Ryzen 5 5600X (6C/12T) · 32GB DDR4 RAM · Local Sandbox: C:\Gina_AI   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Service Endpoints

| Service | Protocol | Host / Port | Role |
| :--- | :--- | :--- | :--- |
| **Creator UI & Dev Server** | HTTP / WS | `127.0.0.1:3200` | Express REST broker + Vite dev server |
| **ComfyUI Backend** | HTTP / WS | `127.0.0.1:8188` | Juggernaut-XL / FLUX.1 Lite & Wan 2.1 execution |
| **llama-server.exe** | HTTP REST | `127.0.0.1:8080` | Qwen 2.5-VL / Qwen 2.5 Coder (28 GPU layers, up to 16K ctx) |
| **Audio Backend** | Python RPC | `127.0.0.1:3200/api/audio` | Bark Small + Coqui XTTS v2 voice cloning & SFX |
| **AIDA64 Telemetry** | Shared Memory | Win32 Handle | `AIDA64_SensorValues` memory mapped file |
| **Zero-VRAM RAG** | In-Memory | Express Memory | BM25 + Vector semantic query engine |
| **Whole-PC Telemetry** | NVML / WMI | Express Poller | Real-time system wall draw (£/hr, p/hr) |

---

## 3. GPU VRAM Safety Cage & Mutual Exclusion Rules

1. **7372 MB VRAM Cap**: Total allocations across all runtimes are capped at 90% of 8GB to prevent Windows Desktop Window Manager (DWM) driver crashes.
2. **Mutual Exclusion**: Before starting or restarting a local Qwen engine, Gina triggers `POST /free` on ComfyUI to unload latent diffusion tensors from VRAM.
3. **Audio CPU Offload**: Bark runs with `SUNO_OFFLOAD_CPU=True` and `SUNO_USE_SMALL_MODELS=True` to guarantee 0MB baseline GPU overhead when diffusion models are resident.
4. **Thermal Brake**: NVML polling checks core temperature every 3000ms. If GPU temperature exceeds 80°C, render pipelines pause and trigger a 5-second cooldown breath.

---

## 4. Model Checkpoint VRAM Safety & OOM Correlation Matrix

| Checkpoint / Model | Format & Precision | Base VRAM | Peak Observed | 8GB Verdict | Optimal Parameters |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Juggernaut-XL v9** | SDXL SafeTensors (FP16) | 6.20 GB | 6.80 GB | SAFE FOR 8GB (OPTIMAL) | 832×1152 or 1024×1024, 25–30 steps |
| **FLUX.1 Lite Pure** | GGUF Q4_0 UNet + T5-XXL FP8 | 5.90 GB | 6.40 GB | SAFE FOR 8GB (OPTIMAL) | Text-in-image focus, 20–25 steps |
| **Wan 2.1 1.3B** | SafeTensors BF16 | 5.20 GB | 6.20 GB | SAFE FOR 8GB (OPTIMAL) | 832×480, <=73 frames (3s @ 24fps) |
| **Hunyuan Video** | SafeTensors FP8/BF16 | 7.10 GB | 7.85 GB | HIGH OOM RISK (>7GB BASE) | Tiled VAE decode required; experimental |
| **Geneva 1.12B** | SafeTensors FP8 | 4.80 GB | 5.20 GB | SAFE FOR 8GB (OPTIMAL) | 768×512, 16–20 steps |
| **Qwen 2.5-VL 7B** | GGUF Q4_K_M + mmproj-F16 | 4.70 GB | 5.10 GB | SAFE FOR 8GB (OPTIMAL) | 28 GPU layers, 4K–8K context |
| **Qwen Coder 7B** | GGUF Q5_K_M | 5.10 GB | 5.60 GB | SAFE FOR 8GB (OPTIMAL) | 28 GPU layers, pure coding mode |
| **Qwen 3.5 9B** | GGUF Q4_K_M + mmproj-BF16 | 6.10 GB | 6.70 GB | MONITOR HEADROOM | 24 GPU layers recommended |
| **T5-XXL FP8 Text** | SafeTensors FP8 | 4.90 GB | 5.20 GB | SAFE FOR 8GB (OPTIMAL) | Memory mapped via ComfyUI CLIP loader |
| **UMT5-XXL Scaled** | SafeTensors FP8 Scaled | 5.10 GB | 5.50 GB | SAFE FOR 8GB (OPTIMAL) | Native Wan 2.1 video text conditioning |
| **Bark Small Engine** | PyTorch / HuggingFace | 1.80 GB | 2.10 GB | CPU OFFLOAD ACTIVE | `SUNO_OFFLOAD_CPU=True`, 0 GPU footprint |
| **Coqui XTTS v2** | PyTorch / TTS | 2.10 GB | 2.40 GB | SAFE FOR 8GB (OPTIMAL) | 3–10s reference audio, CPU fallback |
| **RIFE 4.7 Flow** | ONNX Runtime | 1.60 GB | 1.90 GB | SAFE FOR 8GB (OPTIMAL) | 2x/4x video frame interpolation |
| **Other / Custom** | SafeTensors (Unquantized) | 7.50 GB | 7.90 GB | HIGH OOM RISK (>7GB BASE) | Purge all resident models before load |
