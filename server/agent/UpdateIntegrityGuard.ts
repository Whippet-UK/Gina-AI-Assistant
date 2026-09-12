import fs from 'fs/promises';
import path from 'path';

export interface IntegrityCheckResult {
  ok: boolean;
  checklistPresent: boolean;
  version: string | null;
  mismatches: string[];
  retiredActiveReferences: Array<{ path: string; line: number; text: string }>;
}

const ACTIVE_SCAN_DIRS = ['src', 'server', 'scripts'];
const EXCLUDED = new Set(['node_modules', '.git', '.gina', 'dist']);
const RETIRED_ACTIVE_PATTERNS = [/\bLTX\b/i, /ltx-video/i, /gemma\s*3/i, /gemma\s*llm/i];
const HISTORICAL_FILES = new Set(['src/components/MilestoneChecklist.tsx', 'src/components/AppFeaturesGuide.tsx', 'server/agent/UpdateIntegrityGuard.ts']);

async function walk(dir: string, out: string[]) {
  let entries: any[] = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && /\.(ts|tsx|js|jsx|json|py|bat|ps1|css|html)$/i.test(entry.name)) out.push(full);
  }
}

export async function runUpdateIntegrityCheck(root: string): Promise<IntegrityCheckResult> {
  const checklistPresent = await fs.stat(path.join(root, 'docs/AI_UPDATE_CHECKLIST.md')).then(() => true).catch(() => false);
  const version = await fs.readFile(path.join(root, 'src/version.ts'), 'utf8').then(s => s.match(/APP_VERSION\s*=\s*['"]([^'"]+)/)?.[1] || null).catch(() => null);
  const mismatches: string[] = [];
  if (!checklistPresent) mismatches.push('Missing docs/AI_UPDATE_CHECKLIST.md');

  const expected = version;
  for (const file of ['package.json', 'metadata.json', 'index.html', 'AGENTS.md', 'README.md', 'docs/INDEX.md', 'src/components/MilestoneChecklist.tsx']) {
    const full = path.join(root, file);
    const text = await fs.readFile(full, 'utf8').catch(() => '');
    if (!text) { mismatches.push(`Missing or unreadable ${file}`); continue; }
    if (expected && !text.includes(expected)) mismatches.push(`${file} does not contain active version ${expected}`);
  }

  const retiredActiveReferences: IntegrityCheckResult['retiredActiveReferences'] = [];
  for (const dir of ACTIVE_SCAN_DIRS) {
    const paths: string[] = [];
    await walk(path.join(root, dir), paths);
    for (const file of paths) {
      if (HISTORICAL_FILES.has(path.relative(root, file).replaceAll(path.sep, '/'))) continue;
      const text = await fs.readFile(file, 'utf8').catch(() => '');
      text.split(/\r?\n/).forEach((line, index) => {
        if (RETIRED_ACTIVE_PATTERNS.some(pattern => pattern.test(line))) retiredActiveReferences.push({ path: path.relative(root, file), line: index + 1, text: line.trim().slice(0, 240) });
      });
    }
  }

  return { ok: checklistPresent && mismatches.length === 0 && retiredActiveReferences.length === 0, checklistPresent, version, mismatches, retiredActiveReferences };
}
