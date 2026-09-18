import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { WebResearchService, WebSearchResult } from "./WebResearchService.js";

export interface BrowserPage {
  url: string;
  title: string;
  content: string;
  truncated?: boolean;
  engine?: string;
}

export interface BrowserBrowseResult {
  query: string;
  provider: string;
  results: WebSearchResult[];
  pages: BrowserPage[];
  engine?: string;
}

interface ChromiumInfo {
  found: boolean;
  path: string | null;
  name: string | null;
}

export class WebBrowserService {
  private cachedChromiumInfo: ChromiumInfo | null = null;

  constructor(private readonly webResearch: WebResearchService) {}

  public getChromiumInfo(): ChromiumInfo {
    if (this.cachedChromiumInfo) return this.cachedChromiumInfo;

    const envCandidates = [
      process.env.CHROME_BIN,
      process.env.CHROME_PATH,
      process.env.CHROMIUM_PATH,
      process.env.PUPPETEER_EXECUTABLE_PATH,
    ].filter(Boolean) as string[];

    const winProgramFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const winProgramFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const winLocalAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');

    const standardCandidates: string[] = [
      ...envCandidates,
      // Windows Google Chrome
      path.join(winProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(winProgramFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      winLocalAppData ? path.join(winLocalAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
      winLocalAppData ? path.join(winLocalAppData, 'Google', 'Chrome SxS', 'Application', 'chrome.exe') : '',
      // Windows Microsoft Edge (Chromium)
      path.join(winProgramFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(winProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      winLocalAppData ? path.join(winLocalAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : '',
      // Windows Brave (Chromium)
      path.join(winProgramFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(winProgramFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      winLocalAppData ? path.join(winLocalAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe') : '',
      // Local Gina Tools portable chromium
      'C:\\Gina_AI\\tools\\chromium\\chrome.exe',
      'C:\\Gina_AI\\tools\\chrome\\chrome.exe',
      // Linux / Container standard locations
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/local/bin/chrome',
      '/usr/local/bin/chromium',
      // macOS standard locations
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    ].filter(Boolean);

    for (const candidate of standardCandidates) {
      try {
        if (candidate && fs.existsSync(candidate)) {
          const base = path.basename(candidate).toLowerCase();
          const name = base.includes('edge') || base.includes('msedge') 
            ? 'Microsoft Edge (Chromium)' 
            : base.includes('brave')
            ? 'Brave (Chromium)'
            : base.includes('chromium') 
            ? 'Chromium' 
            : 'Google Chrome';
          this.cachedChromiumInfo = { found: true, path: candidate, name };
          return this.cachedChromiumInfo;
        }
      } catch {
        // Path access check error, skip candidate
      }
    }

    // Dynamic binary lookup via where.exe (Windows) or which (Unix)
    try {
      const isWin = process.platform === 'win32';
      const lookups = isWin ? ['chrome.exe', 'msedge.exe', 'brave.exe'] : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
      const { execSync } = require('child_process');
      for (const binary of lookups) {
        try {
          const cmd = isWin ? `where.exe ${binary}` : `which ${binary}`;
          const foundPath = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).toString().trim().split(/\r?\n/)[0];
          if (foundPath && fs.existsSync(foundPath)) {
            const base = path.basename(foundPath).toLowerCase();
            const name = base.includes('edge') || base.includes('msedge')
              ? 'Microsoft Edge (Chromium)'
              : base.includes('brave')
              ? 'Brave (Chromium)'
              : base.includes('chromium')
              ? 'Chromium'
              : 'Google Chrome';
            this.cachedChromiumInfo = { found: true, path: foundPath, name };
            return this.cachedChromiumInfo;
          }
        } catch {
          // ignore lookup failure
        }
      }
    } catch {
      // ignore
    }

    this.cachedChromiumInfo = { found: false, path: null, name: null };
    return this.cachedChromiumInfo;
  }

  public isChromiumAvailable(): boolean {
    return this.getChromiumInfo().found;
  }

  status() {
    const chrome = this.getChromiumInfo();
    return {
      enabled: this.webResearch.enabled,
      ...this.webResearch.status(),
      engine: chrome.found ? `Headless ${chrome.name}` : 'HTTP fetcher (fallback)',
      chromeAvailable: chrome.found,
      chromePath: chrome.path,
      chromeName: chrome.name,
      mode: chrome.found ? 'chromium' : 'http-fallback'
    };
  }

  private cleanHtmlToText(html: string): { title: string; content: string } {
    let clean = html;
    // Extract title
    const titleMatch = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';

    // Strip head, script, style, svg, noscript, etc.
    clean = clean.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ');
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    clean = clean.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');
    clean = clean.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');

    // Convert common block elements to newlines
    clean = clean.replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
    clean = clean.replace(/<br\s*[\/]?>/gi, '\n');

    // Strip remaining tags
    clean = clean.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    clean = clean
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');

    // Collapse multiple blank lines and whitespace
    clean = clean.replace(/[ \t]+/g, ' ');
    clean = clean.replace(/\n\s*\n+/g, '\n\n').trim();

    return { title, content: clean };
  }

  private async fetchWithChromium(url: string, chromePath: string, maxChars = 30000, timeoutMs = 30000): Promise<BrowserPage> {
    return new Promise((resolve, reject) => {
      const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--remote-debugging-port=0',
        '--window-size=1280,800',
        '--dump-dom',
        '--virtual-time-budget=5000',
        url
      ];

      let stdout = '';
      let stderr = '';
      let timer: NodeJS.Timeout | null = null;
      let killed = false;

      const child = spawn(chromePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      timer = setTimeout(() => {
        killed = true;
        try { child.kill('SIGKILL'); } catch {}
        reject(new Error(`Chromium navigation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        // Early stop if output exceeds 1MB to avoid memory pressure
        if (stdout.length > 1024 * 1024) {
          try { child.kill(); } catch {}
        }
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        if (killed) return;

        if (!stdout || stdout.trim().length === 0) {
          return reject(new Error(`Chromium exited with code ${code} and produced no output: ${stderr.slice(0, 200)}`));
        }

        const { title, content } = this.cleanHtmlToText(stdout);
        const truncated = content.length > maxChars;
        const chrome = this.getChromiumInfo();
        resolve({
          url,
          title: title || url,
          content: content.slice(0, maxChars),
          truncated,
          engine: `Chromium Headless (${chrome.name || 'Chrome'})`
        });
      });
    });
  }

  async open(url: string, maxChars = 30000): Promise<BrowserPage> {
    const chrome = this.getChromiumInfo();
    if (chrome.found && chrome.path) {
      try {
        return await this.fetchWithChromium(url, chrome.path, maxChars);
      } catch (err) {
        // Chromium failed or crashed; log and seamlessly fallback to HTTP fetcher
        console.warn(`[WebBrowserService] Chromium fetch failed for ${url} (${(err as Error).message}), falling back to HTTP fetcher.`);
      }
    }

    // Fallback: standard HTTP fetcher from WebResearchService
    const fetched = await this.webResearch.fetchPage(url, maxChars);
    return {
      url: fetched.url,
      title: fetched.title || url,
      content: fetched.content,
      truncated: fetched.truncated,
      engine: 'HTTP fetcher (fallback)'
    };
  }

  async browse(query: string, maxResults = 6, pagesToOpen = 2): Promise<BrowserBrowseResult> {
    const search = await this.webResearch.search(query, maxResults);
    const pages: BrowserPage[] = [];

    const toOpen = search.results.slice(0, Math.max(0, pagesToOpen));
    for (const item of toOpen) {
      try {
        const page = await this.open(item.url, 12000);
        pages.push(page);
      } catch {
        // Skip failed individual page fetches
      }
    }

    const chrome = this.getChromiumInfo();
    return {
      query: search.query,
      provider: search.provider,
      results: search.results,
      pages,
      engine: chrome.found ? `Headless ${chrome.name}` : 'HTTP fetcher'
    };
  }
}
