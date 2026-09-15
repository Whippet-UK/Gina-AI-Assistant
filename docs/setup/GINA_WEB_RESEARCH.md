# Gina Web Research

Gina is local-first, but the autonomous agent can now use the public internet to improve research quality.

## Behaviour

- `GINA_WEB_ACCESS=true` (default): enables web search and public-page retrieval.
- `GINA_WEB_ACCESS=false`: disables all internet access from the Gina web-research tools.
- `BRAVE_SEARCH_API_KEY=<key>`: optional. When present, Gina uses Brave Search API first and falls back to DuckDuckGo if unavailable.
- Without a Brave key, Gina uses DuckDuckGo's public HTML search endpoint.

The local Qwen model remains the reasoning engine. Internet results are retrieved by the server and supplied to Qwen as untrusted research data.

## Agent tools

- `web_search` — search the live web.
- `web_research` — search and optionally retrieve the top result.
- `web_fetch` — retrieve a specific public HTTP(S) page.
- `knowledge_search` — search Gina's local indexed knowledge and report whether web research is available.

Gina should use web research for current information, official documentation, software/model releases, troubleshooting, comparisons, and other questions where local knowledge may be stale. It should prefer primary/official sources.

## Security

Web tools only accept HTTP(S) and block localhost and common private/link-local IPv4 ranges. Redirects are revalidated and limited. Web content is treated as data, never as instructions capable of overriding Gina's project rules, security rules, or `docs/AI_UPDATE_CHECKLIST.md`.

For a LAN-only installation, set `GINA_WEB_ACCESS=false`.
