# Gina AI Factory — Autonomous Local Agent (Phase 9)

- **19 Local Tools**: `inspect_system`, `inspect_capabilities`, `inspect_project_context`, `knowledge_search`, `search_files`, `read_file`, `write_file`, `execute_command`, `git_status`, `git_diff`, `git_log`, `remember`, `recall_memory`, `refresh_context`, `comfy_clear_cache`, `llm_start`, `llm_stop`, `llm_restart`, and `build_aida64_template`.
- **Persistent Memory**: Stored at `C:\Gina_AI\.gina\agent-memory.json`.
- **Security Scope**: Operations strictly scoped to `C:\Gina_AI` root directory.


## Phase 41 — Persistent Agent Workbench

- **Durable run history:** agent runs are stored as JSON records under `C:\Gina_AI\.gina\agent-runs`.
- **Live execution stream:** `/api/agent/run-stream` creates a run and `/api/agent/runs/:id/stream` exposes Server-Sent Events for planning, tool execution, validation, repair and reporting transitions.
- **Reconnect safety:** the dashboard stores the active run ID locally and replays persisted events after a dropped browser connection or refresh.
- **Run inspection:** `/api/agent/runs` lists recent runs and `/api/agent/runs/:id` returns the complete persisted record.
- **Cancellation:** `/api/agent/runs/:id/cancel` records a cancellation request; the agent checks it between controlled tool steps.
- **Legacy compatibility:** `/api/agent/run` remains available for callers that need a single JSON response.
