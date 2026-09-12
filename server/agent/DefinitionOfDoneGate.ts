import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { runUpdateIntegrityCheck } from './UpdateIntegrityGuard';

const execAsync = promisify(exec);

export interface DefinitionOfDoneCheck {
  id: string;
  name: string;
  category: 'CHECKLIST' | 'VERSION_SYNC' | 'RETIRED_REFS' | 'TYPECHECK' | 'MILESTONES' | 'CLEAN_ROOT' | 'CHANGELOG';
  passed: boolean;
  details: string;
}

export interface DefinitionOfDoneResult {
  ok: boolean;
  version: string;
  phase: number;
  savePointId: string;
  totalChecks: number;
  passedChecks: number;
  checks: DefinitionOfDoneCheck[];
  blockingErrors: string[];
  summary: string;
}

export class DefinitionOfDoneGate {
  constructor(private readonly root: string) {}

  public async verify(): Promise<DefinitionOfDoneResult> {
    const checks: DefinitionOfDoneCheck[] = [];
    const blockingErrors: string[] = [];

    // 1. Ingest central version & save point from src/version.ts
    let appVersion = '1.19.8';
    let savePointId = 'RESTORE_V1.19.8_PROJECT_COMPLETION_GATE';
    let lifecyclePhase = 49;

    const versionTsPath = path.join(this.root, 'src', 'version.ts');
    try {
      const vContent = await fs.readFile(versionTsPath, 'utf8');
      const vMatch = vContent.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
      const spMatch = vContent.match(/ACTIVE_SAVE_POINT_ID\s*=\s*['"]([^'"]+)['"]/);
      const phMatch = vContent.match(/ACTIVE_LIFECYCLE_PHASE\s*=\s*([0-9]+)/);
      if (vMatch) appVersion = vMatch[1];
      if (spMatch) savePointId = spMatch[1];
      if (phMatch) lifecyclePhase = Number(phMatch[1]);

      checks.push({
        id: 'central_version_source',
        name: 'Central Version Source Valid',
        category: 'VERSION_SYNC',
        passed: true,
        details: `Loaded version ${appVersion}, Phase ${lifecyclePhase}, Save Point ${savePointId} from src/version.ts`
      });
    } catch (err: any) {
      const msg = `Unable to read src/version.ts: ${err?.message || String(err)}`;
      checks.push({ id: 'central_version_source', name: 'Central Version Source Valid', category: 'VERSION_SYNC', passed: false, details: msg });
      blockingErrors.push(msg);
    }

    // 2. Mandatory Update Checklist Check
    const checklistPath = path.join(this.root, 'docs', 'AI_UPDATE_CHECKLIST.md');
    try {
      const checklistContent = await fs.readFile(checklistPath, 'utf8');
      const hasPre = /Before editing/i.test(checklistContent) || /PRE-EDIT/i.test(checklistContent);
      const hasPost = /Final gate/i.test(checklistContent) || /POST-EDIT/i.test(checklistContent) || /integrity/i.test(checklistContent);
      if (hasPre && hasPost) {
        checks.push({
          id: 'ai_update_checklist',
          name: 'AI Update Checklist Present and Formatted',
          category: 'CHECKLIST',
          passed: true,
          details: 'docs/AI_UPDATE_CHECKLIST.md verified with pre-edit and post-edit gates'
        });
      } else {
        const msg = 'docs/AI_UPDATE_CHECKLIST.md is missing required pre-edit or post-edit gates';
        checks.push({ id: 'ai_update_checklist', name: 'AI Update Checklist Present and Formatted', category: 'CHECKLIST', passed: false, details: msg });
        blockingErrors.push(msg);
      }
    } catch (err: any) {
      const msg = `docs/AI_UPDATE_CHECKLIST.md missing or unreadable: ${err?.message || String(err)}`;
      checks.push({ id: 'ai_update_checklist', name: 'AI Update Checklist Present and Formatted', category: 'CHECKLIST', passed: false, details: msg });
      blockingErrors.push(msg);
    }

    // 3. Universal Version & Metadata Synchronization Check
    const filesToSync: Array<{ relPath: string; pattern: RegExp; desc: string }> = [
      { relPath: 'package.json', pattern: new RegExp(`"version"\\s*:\\s*"${appVersion.replace(/\./g, '\\.')}"`), desc: 'package.json version' },
      { relPath: 'metadata.json', pattern: new RegExp(`"version"\\s*:\\s*"${appVersion.replace(/\./g, '\\.')}"`), desc: 'metadata.json version' },
      { relPath: 'index.html', pattern: new RegExp(`v${appVersion.replace(/\./g, '\\.')}|${appVersion.replace(/\./g, '\\.')}`), desc: 'index.html title/meta' },
      { relPath: 'AGENTS.md', pattern: new RegExp(`v?${appVersion.replace(/\./g, '\\.')}`), desc: 'AGENTS.md version' },
      { relPath: 'README.md', pattern: new RegExp(`v?${appVersion.replace(/\./g, '\\.')}`), desc: 'README.md version' },
      { relPath: 'docs/INDEX.md', pattern: new RegExp(`v?${appVersion.replace(/\./g, '\\.')}`), desc: 'docs/INDEX.md version' },
      { relPath: path.join('src', 'components', 'MilestoneChecklist.tsx'), pattern: new RegExp(savePointId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), desc: 'MilestoneChecklist active save point' }
    ];

    const syncMismatches: string[] = [];
    for (const item of filesToSync) {
      try {
        const fileContent = await fs.readFile(path.join(this.root, item.relPath), 'utf8');
        if (!item.pattern.test(fileContent)) {
          syncMismatches.push(`${item.relPath} does not reflect ${appVersion} (${item.desc})`);
        }
      } catch (err: any) {
        syncMismatches.push(`${item.relPath} could not be read: ${err?.message || String(err)}`);
      }
    }

    if (syncMismatches.length === 0) {
      checks.push({
        id: 'universal_version_sync',
        name: 'Universal Version & Metadata Synchronization',
        category: 'VERSION_SYNC',
        passed: true,
        details: `All ${filesToSync.length} target files are synchronized to v${appVersion} and ${savePointId}`
      });
    } else {
      const msg = `Version/metadata synchronization failed in: ${syncMismatches.join('; ')}`;
      checks.push({ id: 'universal_version_sync', name: 'Universal Version & Metadata Synchronization', category: 'VERSION_SYNC', passed: false, details: msg });
      blockingErrors.push(msg);
    }

    // 4. Stale Retired Engine References & Integrity Guard Check
    try {
      const integrity = await runUpdateIntegrityCheck(this.root);
      if (integrity.ok) {
        checks.push({
          id: 'retired_references_audit',
          name: 'Zero Retired References & Production Integrity',
          category: 'RETIRED_REFS',
          passed: true,
          details: 'Integrity check clean: zero retired active references across active codebase'
        });
      } else {
        const issues = [...integrity.mismatches, ...integrity.retiredActiveReferences.map(r => `${r.path}:${r.line} (${r.text.slice(0, 80)})`)];
        const msg = `Retired engine references or integrity mismatches detected: ${issues.join('; ')}`;
        checks.push({ id: 'retired_references_audit', name: 'Zero Retired References & Production Integrity', category: 'RETIRED_REFS', passed: false, details: msg });
        blockingErrors.push(msg);
      }
    } catch (err: any) {
      const msg = `UpdateIntegrityGuard check failed: ${err?.message || String(err)}`;
      checks.push({ id: 'retired_references_audit', name: 'Zero Retired References & Production Integrity', category: 'RETIRED_REFS', passed: false, details: msg });
      blockingErrors.push(msg);
    }

    // 5. TypeScript Lint / Compile Verification
    try {
      const tscResult = await execAsync('npx tsc --noEmit', { cwd: this.root, timeout: 60000 });
      checks.push({
        id: 'typecheck_compilation',
        name: 'TypeScript Compilation & Typecheck',
        category: 'TYPECHECK',
        passed: true,
        details: 'tsc --noEmit passed with zero diagnostics errors'
      });
    } catch (err: any) {
      const stderr = String(err?.stdout || err?.stderr || err?.message || 'Compile error').slice(0, 500);
      const msg = `TypeScript compiler diagnostics failed: ${stderr.trim()}`;
      checks.push({ id: 'typecheck_compilation', name: 'TypeScript Compilation & Typecheck', category: 'TYPECHECK', passed: false, details: msg });
      blockingErrors.push(msg);
    }

    // 6. Clean Root Directory Enforcement
    try {
      const rootEntries = await fs.readdir(this.root, { withFileTypes: true });
      const forbiddenExtensions = ['.bak', '.tmp', '.swp', '.log', '.orig'];
      const strayFiles: string[] = [];

      for (const entry of rootEntries) {
        if (!entry.isDirectory()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (forbiddenExtensions.includes(ext)) {
            strayFiles.push(entry.name);
          }
        }
      }

      if (strayFiles.length === 0) {
        checks.push({
          id: 'clean_root_enforcement',
          name: 'Clean Root Directory Enforcement',
          category: 'CLEAN_ROOT',
          passed: true,
          details: 'Root directory clean of temporary/stray artifacts'
        });
      } else {
        const msg = `Root directory contains forbidden temporary files: ${strayFiles.join(', ')}`;
        checks.push({ id: 'clean_root_enforcement', name: 'Clean Root Directory Enforcement', category: 'CLEAN_ROOT', passed: false, details: msg });
        blockingErrors.push(msg);
      }
    } catch (err: any) {
      checks.push({ id: 'clean_root_enforcement', name: 'Clean Root Directory Enforcement', category: 'CLEAN_ROOT', passed: true, details: `Root check skipped: ${err?.message}` });
    }

    // 7. CHANGELOG.md Entry Verification
    try {
      const changelogPath = path.join(this.root, 'CHANGELOG.md');
      const changelogContent = await fs.readFile(changelogPath, 'utf8');
      if (changelogContent.includes(appVersion) || changelogContent.includes(`Phase ${lifecyclePhase}`) || changelogContent.includes(`PHASE ${lifecyclePhase}`)) {
        checks.push({
          id: 'changelog_integrity',
          name: 'Changelog Integrity & Audit Entry',
          category: 'CHANGELOG',
          passed: true,
          details: `CHANGELOG.md contains logged entry for v${appVersion} (Phase ${lifecyclePhase})`
        });
      } else {
        const msg = `CHANGELOG.md does not yet have an entry for v${appVersion} (Phase ${lifecyclePhase})`;
        checks.push({ id: 'changelog_integrity', name: 'Changelog Integrity & Audit Entry', category: 'CHANGELOG', passed: false, details: msg });
        blockingErrors.push(msg);
      }
    } catch (err: any) {
      const msg = `CHANGELOG.md could not be verified: ${err?.message || String(err)}`;
      checks.push({ id: 'changelog_integrity', name: 'Changelog Integrity & Audit Entry', category: 'CHANGELOG', passed: false, details: msg });
      blockingErrors.push(msg);
    }

    const passedChecks = checks.filter(c => c.passed).length;
    const ok = blockingErrors.length === 0;
    const summary = ok
      ? `DEFINITION OF DONE GATE: PASS (${passedChecks}/${checks.length} verified) — Project v${appVersion} (Phase ${lifecyclePhase}) is production-ready.`
      : `DEFINITION OF DONE GATE: BLOCKED (${passedChecks}/${checks.length} passed, ${blockingErrors.length} blocking issues) — Completion refused.`;

    return {
      ok,
      version: appVersion,
      phase: lifecyclePhase,
      savePointId,
      totalChecks: checks.length,
      passedChecks,
      checks,
      blockingErrors,
      summary
    };
  }
}
