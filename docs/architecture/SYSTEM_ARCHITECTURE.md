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
| **ComfyUI Backend** | HTTP / WS | `127.0.0.1:8188` | FLUX.1 Schnell & LTX-Video 2B execution |
| **llama-server.exe** | HTTP REST | `127.0.0.1:8080` | Gemma 3 12B IT (28 GPU layers, 4096 ctx) |
| **AIDA64 Telemetry** | Shared Memory | Win32 Handle | `AIDA64_SensorValues` memory mapped file |
| **Zero-VRAM RAG** | In-Memory | Express Memory | BM25 + Vector semantic query engine |

---

## 3. GPU VRAM Safety Cage & Mutual Exclusion Rules

1. **7372 MB VRAM Cap**: Total allocations across all runtimes are capped at 90% of 8GB to prevent Windows Desktop Window Manager (DWM) driver crashes.
2. **Mutual Exclusion**: Before starting or restarting Gemma 3 12B, Gina triggers `POST /free` on ComfyUI to unload latent diffusion tensors from VRAM.
3. **Thermal Brake**: NVML polling checks core temperature every 3000ms. If GPU temperature exceeds 80°C, render pipelines pause and trigger a 5-second cooldown breath.
