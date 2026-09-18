import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type LocalBrowserChannel = 'chrome' | 'chrome-canary' | 'edge' | 'brave' | 'portable';

export interface DetectedBrowser {
  id: string;
  channel: LocalBrowserChannel;
  label: string;
  executablePath: string;
  exists: boolean;
  source: 'known-install' | 'portable-tools';
}

export interface LocalBrowserStatus {
  scannedAt: string;
  toolsRoot: string;
  browsers: DetectedBrowser[];
  preferred: DetectedBrowser | null;
}

export interface HeadlessDumpResult {
  ok: boolean;
  browser: DetectedBrowser;
  url: string;
  html: string;
  bytes: number;
  durationMs: number;
  stderr?: string;
}

interface CandidateSeed {
  id: string;
  channel: LocalBrowserChannel;
  label: string;
  paths: string[];
}

// Preference order when no explicit channel/id is requested. Chrome and Edge are the
// most consistently up to date with `--headless=new`; portable binaries go last since
// they are user-managed and version varies.
const PREFERENCE_ORDER: LocalBrowserChannel[] = ['chrome', 'edge', 'brave', 'chrome-canary', 'portable'];

function programFilesRoots(): string[] {
  const roots = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env['ProgramW6432']];
  return Array.from(new Set(roots.filter((p): p is string => !!p)));
}

function localAppDataRoot(): string {
  return process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');
}

function buildKnownCandidates(): CandidateSeed[] {
  const programFiles = programFilesRoots();
  const localAppData = localAppDataRoot();
  return [
    {
      id: 'chrome',
      channel: 'chrome',
      label: 'Google Chrome',
      paths: [
        ...programFiles.map(root => path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ],
    },
    {
      id: 'chrome-canary',
      channel: 'chrome-canary',
      label: 'Google Chrome Canary (SxS)',
      paths: [
        path.join(localAppData, 'Google', 'Chrome SxS', 'Application', 'chrome.exe'),
      ],
    },
    {
      id: 'edge',
      channel: 'edge',
      label: 'Microsoft Edge (Chromium)',
      paths: [
        ...programFiles.map(root => path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
      ],
    },
    {
      id: 'brave',
      channel: 'brave',
      label: 'Brave Browser',
      paths: [
        ...programFiles.map(root => path.join(root, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')),
        path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      ],
    },
  ];
}

async function firstExisting(paths: string[]): Promise<string | null> {
  for (const candidate of paths) {
    const exists = await fs.stat(candidate).then(s => s.isFile()).catch(() => false);
    if (exists) return candidate;
  }
  return null;
}

const PORTABLE_BINARY_NAMES = new Set(['chrome.exe', 'msedge.exe', 'brave.exe', 'chromium.exe']);

async function scanPortableBinaries(toolsRoot: string, maxDepth = 3): Promise<DetectedBrowser[]> {
  const found: DetectedBrowser[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > maxDepth || found.length >= 10) return;
    let entries: any[] = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true } as any) as any; } catch { return; }
    for (const entry of entries) {
      if (found.length >= 10) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (entry.isFile() && PORTABLE_BINARY_NAMES.has(entry.name.toLowerCase())) {
        found.push({
          id: `portable-${entry.name.toLowerCase().replace(/\.exe$/, '')}-${found.length}`,
          channel: 'portable',
          label: `Portable ${entry.name.replace(/\.exe$/i, '')} (${path.relative(toolsRoot, full)})`,
          executablePath: full,
          exists: true,
          source: 'portable-tools',
        });
      }
    }
  }
  await walk(toolsRoot, 0);
  return found;
}

export class LocalBrowserService {
  private readonly toolsRoot: string;
  private lastStatus: LocalBrowserStatus | null = null;

  constructor(toolsRoot = process.env.GINA_TOOLS_ROOT || 'C:\\Gina_AI\\tools') {
    this.toolsRoot = toolsRoot;
  }

  /**
   * Scans known Windows install locations for Chrome, Chrome Canary/SxS, Edge and Brave,
   * then scans C:\Gina_AI\tools (or GINA_TOOLS_ROOT) for portable Chromium-family binaries.
   */
  async detect(): Promise<LocalBrowserStatus> {
    const known = buildKnownCandidates();
    const knownResults = await Promise.all(known.map(async seed => {
      const found = await firstExisting(seed.paths);
      return {
        id: seed.id,
        channel: seed.channel,
        label: seed.label,
        executablePath: found || seed.paths[0] || '',
        exists: !!found,
        source: 'known-install' as const,
      };
    }));
    const portable = await scanPortableBinaries(this.toolsRoot).catch(() => []);
    const browsers = [...knownResults, ...portable];
    const preferred = this.pickPreferred(browsers);
    const status: LocalBrowserStatus = { scannedAt: new Date().toISOString(), toolsRoot: this.toolsRoot, browsers, preferred };
    this.lastStatus = status;
    return status;
  }

  status(): LocalBrowserStatus | null {
    return this.lastStatus;
  }

  private pickPreferred(browsers: DetectedBrowser[]): DetectedBrowser | null {
    for (const channel of PREFERENCE_ORDER) {
      const match = browsers.find(b => b.channel === channel && b.exists);
      if (match) return match;
    }
    return null;
  }

  /**
   * Launches a detected browser headless (`--headless=new --disable-gpu --dump-dom`) against
   * a URL and returns the rendered DOM as HTML text. Uses a scratch user-data-dir per call so
   * repeated headless runs never collide with a signed-in profile or lock a running browser.
   */
  async dumpDom(url: string, options?: { browserId?: string; timeoutMs?: number }): Promise<HeadlessDumpResult> {
    if (!/^https?:\/\//i.test(url)) throw new Error('LocalBrowserService.dumpDom requires an http(s) URL.');
    const status = this.lastStatus || await this.detect();
    const browser = options?.browserId
      ? status.browsers.find(b => b.id === options.browserId && b.exists)
      : status.preferred;
    if (!browser) throw new Error('No local Chrome, Edge, Brave or portable Chromium installation was detected. Install one or place a portable copy under ' + this.toolsRoot + '.');

    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gina-browser-'));
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-sync',
      `--user-data-dir=${userDataDir}`,
      '--dump-dom',
      url,
    ];
    const timeout = Math.max(3000, options?.timeoutMs || 20000);
    const startedAt = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync(browser.executablePath, args, {
        windowsHide: true,
        timeout,
        maxBuffer: 32 * 1024 * 1024,
      });
      return {
        ok: true,
        browser,
        url,
        html: stdout,
        bytes: Buffer.byteLength(stdout, 'utf8'),
        durationMs: Date.now() - startedAt,
        stderr: stderr && stderr.trim() ? stderr.trim().slice(0, 2000) : undefined,
      };
    } finally {
      await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
