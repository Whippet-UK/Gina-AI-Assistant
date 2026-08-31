# Gina AI Factory — Documentation Index & Architecture Manifest

Welcome to the centralized documentation hub for **Gina AI Factory — Local Creator UI** (v1.17.68).

---

## 📂 Documentation Directory Structure

```
/docs/
├── INDEX.md                             <- Main documentation index & manifest (this file)
├── architecture/
│   └── SYSTEM_ARCHITECTURE.md          <- End-to-end bare-metal system architecture & data flow
├── aida64/
│   ├── AIDA64_68_FEATURES.md            <- Complete 68-feature AIDA64 sensor registry & key mappings
│   ├── AIDA64_COMPLETE_ENGINE.md        <- Gauge renderer engine & 100-state alpha generator
│   └── AIDA64_FULL_EFFECTS.md           <- Digital glow, radial arcs, linear bars & neon shaders
├── setup/
│   ├── LOCAL_LLM_SETUP.md               <- Gemma 3 12B IT, llama-server CUDA, 28-layer pin config
│   ├── LOCAL_AGENT_SETUP.md             <- Autonomous 19-tool broker, memory & context manager
│   └── SETUP_V1.2.md                    <- Initial hardware setup & ComfyUI portable environment
└── guides/
    ├── GAUGE_FACTORY_STYLES.md          <- Visual themes (Cyberpunk, Stealth, Matrix, Neon, Minimal)
    ├── GAUGE_FACTORY_RECORD.md          <- Implementation record for the state gauge generator
    └── TELEMETRY_RECORD.md              <- Win32 Shared Memory (OpenFileMappingA) implementation
```

---

## 🚀 Key System Subsystems

1. **[System Architecture](architecture/SYSTEM_ARCHITECTURE.md)**: Hardware VRAM cage (7372 MB), thermal brake (80°C), Express API brokers, and loopback service bindings.
2. **[Local LLM & CUDA Binding](setup/LOCAL_LLM_SETUP.md)**: Gemma 3 12B IT (Q4_K_M) served via llama.cpp CUDA backend at 28 GPU layers on port 8080.
3. **[Autonomous Local Agent](setup/LOCAL_AGENT_SETUP.md)**: 19-tool local broker, persistent memory at `C:\Gina_AI\.gina\agent-memory.json`, and project context loader.
4. **[Zero-VRAM Local RAG Engine](architecture/SYSTEM_ARCHITECTURE.md#zero-vram-rag)**: In-memory BM25 + Vector semantic retrieval system for instant grounding.
5. **[AIDA64 Sensor Panel & Gauge Factory](aida64/AIDA64_68_FEATURES.md)**: Real-time Win32 shared memory reader and 100-state true alpha PNG graphic export.
6. **[Real-Time ComfyUI Node Graph Sync](architecture/SYSTEM_ARCHITECTURE.md#node-graph-sync)**: Live workflow introspection, dynamic parameter binding, and visual link mapping.
7. **[Advanced Voice Pipeline & Persistent Presets](architecture/SYSTEM_ARCHITECTURE.md#voice-pipeline)**: Google US English priority default, permanent preference storage, SAPI bridge, and speech pacing.
## 📝 Release Notes & Milestones

- `/docs/updates/` — versioned update notes kept out of the project root.
- `/docs/milestones/` — milestone/context records and save-point documentation.
- `/logs/` — runtime audit logs, benchmark summaries and telemetry snapshots; runtime `.log` files are not packaged.

