import fs from 'fs/promises';
import path from 'path';

const DEFAULT_EXCLUDED = new Set(['node_modules', '.git', 'g_env', 'dist', 'build', 'ComfyUI_windows_portable']);
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.scss', '.bat', '.cmd', '.py', '.txt']);

async function walk(root, current, files, excluded) {
  let entries = [];
  try { entries = await fs.readdir(current, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) await walk(root, full, files, excluded);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(path.relative(root, full));
  }
}

export class AgentConsistencyScanner {
  constructor(root) {
    this.root = root;
  }

  async scan(options = {}) {
    const allFiles = [];
    await walk(this.root, this.root, allFiles, DEFAULT_EXCLUDED);
    const targets = options.changedPaths?.length
      ? options.changedPaths.filter(Boolean).map(p => p.replace(/\\/g, '/'))
      : allFiles;
    const findings = [];
    const retiredPattern = /\bLTX(?:[- .]?Video)?\b/i;
    const allowRetired = new Set(['CHANGELOG.md', 'AGENTS.md', 'README.md']);

    for (const rel of targets) {
      if (allowRetired.has(rel) || !TEXT_EXTENSIONS.has(path.extname(rel).toLowerCase())) continue;
      const full = path.join(this.root, rel);
      let text = '';
      try { text = await fs.readFile(full, 'utf8'); } catch { continue; }
      if (retiredPattern.test(text)) findings.push({ severity: 'error', code: 'RETIRED_ENGINE_REFERENCE', path: rel, message: 'Active source contains a retired LTX reference.' });
    }

    const packagePath = path.join(this.root, 'package.json');
    const versionPath = path.join(this.root, 'src', 'version.ts');
    try {
      const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      const versionText = await fs.readFile(versionPath, 'utf8');
      const match = versionText.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (match && pkg.version && match[1] !== pkg.version) {
        findings.push({ severity: 'error', code: 'VERSION_DRIFT', message: `package.json=${pkg.version} but src/version.ts=${match[1]}` });
      }
    } catch {}

    const errors = findings.filter(f => f.severity === 'error');
    const visible = options.includeWarnings === false ? errors : findings;
    return { ok: errors.length === 0, findings: visible, scannedFiles: targets.length };
  }
}
