# v1.19.6 / Phase 47 — Web Research

Gina is now local-first rather than internet-blind. The local Qwen model remains the reasoning engine, while the server provides controlled public-web retrieval tools.

- `web_search`
- `web_research`
- `web_fetch`
- `/api/agent/web-status`
- `/api/agent/web-search`

Default provider: DuckDuckGo HTML. Optional provider: Brave Search API via `BRAVE_SEARCH_API_KEY`.

The agent system prompt explicitly directs Gina to use web research for freshness-sensitive tasks and to treat web pages as untrusted data. Network guards block localhost and common private/link-local addresses.

Configuration:
`GINA_WEB_ACCESS=true`
`BRAVE_SEARCH_API_KEY=`

Set `GINA_WEB_ACCESS=false` for a LAN/offline-only deployment.
