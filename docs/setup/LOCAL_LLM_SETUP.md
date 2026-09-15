# Gina AI Factory — Local LLM Integration (Phase 8 & Phase 11 Grounding)

- **Model**: Qwen 2.5-VL 7B (Q4_K_M GGUF) / Qwen Coder 7B (Q5_K_M GGUF)
- **Model Path**: `C:\Gina_AI\models\llm\Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf / qwen2.5-coder-7b-instruct-q5_k_m.gguf`
- **Runtime**: `C:\Gina_AI\tools\llama.cpp\llama-server.exe`
- **Pinned GPU Layers**: 28 GPU layers (achieves 9.2 - 10.7 tok/sec on RTX 3070 Ti 8GB)
- **Context Window**: 4096 tokens, 6 CPU threads
- **Grounding**: Automatic zero-VRAM Local RAG context injection
