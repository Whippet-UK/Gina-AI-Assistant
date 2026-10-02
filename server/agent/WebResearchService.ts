export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  rawContent?: string;
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

async function fetchText(url: URL, timeoutMs = 30000): Promise<{ response: Response; text: string }> {
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
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        return { response, text: await response.text() };
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
      const wrapped = new URL(href);
      const destination = wrapped.searchParams.get('uddg');
      if (destination) href = decodeURIComponent(destination);
      const parsed = new URL(href);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
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

function parseBing(html: string, maxResults: number): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const blocks = html.split(/<li[^>]+class=["']b_algo["'][^>]*>/i).slice(1);
  for (const block of blocks) {
    if (results.length >= maxResults) break;
    const match = block.match(/<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!match) continue;
    try {
      const url = new URL(match[1]);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      results.push({
        title: decodeHtml(match[2]),
        url: url.toString(),
        snippet: decodeHtml(snippetMatch?.[1] || ''),
        source: url.hostname
      });
    } catch { /* malformed result */ }
  }
  return results;
}

function parseTavily(data: any, limit: number): WebSearchResult[] {
  if (!data || typeof data !== 'object' || !Array.isArray(data.results)) return [];
  return data.results.slice(0, limit).flatMap((item: any) => {
    const rawUrl = typeof item?.url === 'string' ? item.url.trim() : '';
    if (!rawUrl) return [];
    try {
      const url = assertPublicHttpUrl(rawUrl);
      const title = String(item?.title || url.hostname).trim().slice(0, 500);
      const snippet = String(item?.content || item?.snippet || '').trim().slice(0, 4000);
      return [{
        title,
        url: url.toString(),
        snippet,
        source: url.hostname,
        rawContent: typeof item?.raw_content === 'string' ? item.raw_content.slice(0, 12000) : undefined
      }];
    } catch {
      return [];
    }
  });
}

export class WebResearchService {
  readonly enabled: boolean;
  readonly provider: 'tavily' | 'legacy';

  constructor() {
    this.enabled = process.env.GINA_WEB_ACCESS !== 'false';
    this.provider = process.env.TAVILY_API_KEY?.trim() ? 'tavily' : 'legacy';
  }

  status() {
    return {
      enabled: this.enabled,
      provider: this.provider === 'tavily'
        ? 'Tavily Search API'
        : 'Legacy public search fallback (TAVILY_API_KEY not configured)',
      tavilyConfigured: Boolean(process.env.TAVILY_API_KEY?.trim()),
      note: 'Internet research is available to the local agent when enabled. Private/local network targets remain blocked.'
    };
  }

  async search(query: string, maxResults = 8): Promise<WebResearchResult> {
    if (!this.enabled) throw new Error('Web research is disabled. Set GINA_WEB_ACCESS=true or remove the setting.');
    const clean = String(query || '').trim();
    if (!clean) throw new Error('A web search query is required.');
    const limit = Math.max(1, Math.min(20, Number(maxResults) || 8));

    const tavilyKey = process.env.TAVILY_API_KEY?.trim();
    if (tavilyKey) {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tavilyKey}`
        },
        body: JSON.stringify({
          query: clean,
          search_depth: 'advanced',
          max_results: limit,
          include_answer: false,
          include_raw_content: false,
          topic: /\b(?:news|headline|headlines|breaking)\b/i.test(clean) ? 'news' : 'general'
        }),
        signal: AbortSignal.timeout(30000)
      });
      const bodyText = await response.text();
      if (!response.ok) {
        let detail = bodyText.slice(0, 500);
        try { detail = String(JSON.parse(bodyText)?.detail || JSON.parse(bodyText)?.message || detail); } catch {}
        throw new Error(`Tavily Search API HTTP ${response.status}: ${detail}`);
      }
      let data: any;
      try { data = JSON.parse(bodyText); } catch { throw new Error('Tavily returned invalid JSON.'); }
      const results = parseTavily(data, limit);
      if (!results.length) throw new Error('Tavily returned no usable public search results.');
      return { query: clean, provider: 'Tavily Search API', results };
    }

    // Keep a deterministic local fallback so existing installations remain usable
    // while the operator is adding TAVILY_API_KEY. Gina never claims Tavily was used
    // unless the key was actually present and the Tavily request succeeded.
    const providers: Array<() => Promise<WebResearchResult>> = [
      async () => {
        const endpoint = new URL('https://html.duckduckgo.com/html/');
        endpoint.searchParams.set('q', clean);
        const { response, text } = await fetchText(endpoint);
        if (!response.ok) throw new Error(`DuckDuckGo HTTP ${response.status}`);
        return { query: clean, provider: 'DuckDuckGo', results: parseDuckDuckGo(text, limit) };
      },
      async () => {
        const endpoint = new URL('https://www.bing.com/search');
        endpoint.searchParams.set('q', clean);
        const { response, text } = await fetchText(endpoint);
        if (!response.ok) throw new Error(`Bing HTTP ${response.status}`);
        return { query: clean, provider: 'Bing HTML', results: parseBing(text, limit) };
      }
    ];
    const failures: string[] = [];
    for (const provider of providers) {
      try {
        const result = await provider();
        if (result.results.length) return result;
        failures.push(`${result.provider}: no results`);
      } catch (error: any) {
        failures.push(error?.message || 'provider failed');
      }
    }
    throw new Error(`All public web search providers failed or returned no results (${failures.join('; ')}).`);
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
    return {
      url: url.toString(),
      title: content.match(/^.{0,160}/)?.[0] || url.hostname,
      content: content.slice(0, Math.max(1000, Math.min(100000, maxChars))),
      truncated: content.length > maxChars
    };
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
