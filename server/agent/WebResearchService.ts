export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebResearchResult {
  query: string;
  provider: string;
  results: WebSearchResult[];
  fetched?: { url: string; title?: string; content: string };
}

function assertPublicHttpUrl(input: string): URL {
  const url = new URL(String(input || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http:// and https:// URLs are allowed.');
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0' ||
    host === '::1' || host.endsWith('.local') ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) throw new Error('Access to local/private network addresses is blocked by the web research guard.');
  return url;
}

async function fetchText(url: URL, timeoutMs = 15000): Promise<{ response: Response; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = url;
    for (let i = 0; i < 4; i++) {
      const response = await fetch(current, {
        headers: { 'User-Agent': 'Gina-AI-Assistant-WebResearch/1.0 (+local user initiated research)' },
        signal: controller.signal,
        redirect: 'manual'
      });
      if (![301,302,303,307,308].includes(response.status)) {
        const text = await response.text();
        return { response, text };
      }
      const location = response.headers.get('location');
      if (!location) throw new Error(`Web server returned redirect ${response.status} without a Location header.`);
      current = assertPublicHttpUrl(new URL(location, current).toString());
    }
    throw new Error('Too many web redirects.');
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function parseDuckDuckGo(html: string, maxResults: number): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const blocks = html.split(/result__body/i).slice(1);
  for (const block of blocks) {
    if (results.length >= maxResults) break;
    const link = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/i);
    const title = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link || !title) continue;
    let href = link[1].replace(/&amp;/g, '&');
    try {
      if (href.startsWith('//')) href = `https:${href}`;
      try {
        const wrapped = new URL(href);
        const destination = wrapped.searchParams.get('uddg');
        if (destination) href = decodeURIComponent(destination);
      } catch { /* use the original href */ }
      const parsed = new URL(href);
      if (!['http:','https:'].includes(parsed.protocol)) continue;
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)/i);
      results.push({
        title: decodeHtml(title[1]),
        url: parsed.toString(),
        snippet: decodeHtml(snippetMatch?.[1] || ''),
        source: parsed.hostname
      });
    } catch { /* malformed result */ }
  }
  return results;
}

export class WebResearchService {
  readonly enabled: boolean;

  constructor() {
    this.enabled = process.env.GINA_WEB_ACCESS !== 'false';
  }

  status() {
    return {
      enabled: this.enabled,
      provider: process.env.BRAVE_SEARCH_API_KEY ? 'Brave Search API + DuckDuckGo fallback' : 'DuckDuckGo HTML fallback',
      note: 'Internet research is available to the local agent when enabled. Private/local network targets remain blocked.'
    };
  }

  async search(query: string, maxResults = 8): Promise<WebResearchResult> {
    if (!this.enabled) throw new Error('Web research is disabled. Set GINA_WEB_ACCESS=true or remove the setting.');
    const clean = String(query || '').trim();
    if (!clean) throw new Error('A web search query is required.');
    const limit = Math.max(1, Math.min(20, Number(maxResults) || 8));

    const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    if (braveKey) {
      try {
        const endpoint = new URL('https://api.search.brave.com/res/v1/web/search');
        endpoint.searchParams.set('q', clean);
        endpoint.searchParams.set('count', String(limit));
        const response = await fetch(endpoint, {
          headers: { Accept: 'application/json', 'X-Subscription-Token': braveKey },
          signal: AbortSignal.timeout(15000)
        });
        if (response.ok) {
          const data: any = await response.json();
          const results = Array.isArray(data?.web?.results) ? data.web.results.slice(0, limit).map((r:any) => ({
            title: String(r.title || ''),
            url: String(r.url || ''),
            snippet: String(r.description || ''),
            source: (() => { try { return new URL(r.url).hostname; } catch { return ''; } })()
          })) : [];
          return { query: clean, provider: 'Brave Search API', results };
        }
      } catch { /* fallback below */ }
    }

    const endpoint = new URL('https://html.duckduckgo.com/html/');
    endpoint.searchParams.set('q', clean);
    const { response, text } = await fetchText(endpoint);
    if (!response.ok) throw new Error(`Web search failed with HTTP ${response.status}.`);
    return { query: clean, provider: 'DuckDuckGo', results: parseDuckDuckGo(text, limit) };
  }

  async fetchPage(input: string, maxChars = 30000) {
    if (!this.enabled) throw new Error('Web research is disabled.');
    const url = assertPublicHttpUrl(input);
    const { response, text } = await fetchText(url);
    if (!response.ok) throw new Error(`Web page returned HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/json|application\/xml/i.test(contentType)) {
      throw new Error(`Unsupported web content type: ${contentType || 'unknown'}`);
    }
    const content = contentType.includes('html') ? decodeHtml(text) : text.replace(/\s+/g, ' ').trim();
    return { url: url.toString(), title: content.match(/^.{0,160}/)?.[0] || url.hostname, content: content.slice(0, Math.max(1000, Math.min(100000, maxChars))), truncated: content.length > maxChars };
  }

  async research(query: string, maxResults = 6, fetchTop = true): Promise<WebResearchResult> {
    const search = await this.search(query, maxResults);
    if (!fetchTop || !search.results.length) return search;
    try {
      const fetched = await this.fetchPage(search.results[0].url, 24000);
      return { ...search, fetched };
    } catch {
      return search;
    }
  }
}
