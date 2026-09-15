import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { AgentConsistencyScanner } from './AgentConsistencyScanner.js';

const execFileAsync = promisify(execFile);

export class AutonomousVerificationEngine {
  constructor(root) {
    this.root = root;
  }

  async verify(input) {
    const workspaceRoot = path.resolve(input.workspaceRoot || this.root);
    const changedPaths = [...new Set((input.changedPaths || []).filter(Boolean).map(p => {
      const value = String(p).replace(/\\/g, '/');
      return path.isAbsolute(value)
        ? path.relative(workspaceRoot, value).replace(/\\/g, '/')
        : value.replace(/^\.\//, '');
    }))];
    const checks = [];
    const validationPassed = input.steps.some(s => s?.plan?.action === 'validate_project' && Number(s?.toolResult?.exitCode || 0) === 0);
    const diffObserved = input.steps.some(s => ['git_diff', 'git_workspace_diff', 'project_integrity_check'].includes(String(s?.plan?.action || '')) && s?.toolResult?.ok !== false);

    checks.push({ name: 'changes_detected', ok: changedPaths.length > 0, details: { count: changedPaths.length } });
    checks.push({ name: 'validation', ok: input.requireValidation === false ? true : validationPassed });
    checks.push({ name: 'diff_or_integrity_evidence', ok: input.requireDiff === false ? true : diffObserved });

    try {
      const { stdout, stderr } = await execFileAsync('git', ['diff', '--check'], { cwd: workspaceRoot, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
      checks.push({ name: 'git_diff_check', ok: true, details: { stdout: stdout.trim(), stderr: stderr.trim() } });
    } catch (error) {
      checks.push({ name: 'git_diff_check', ok: false, details: String(error?.stdout || error?.stderr || error?.message || error) });
    }

    const consistency = await new AgentConsistencyScanner(workspaceRoot).scan({ changedPaths });
    checks.push({ name: 'consistency_scan', ok: consistency.ok, details: consistency });

    return { ok: checks.every(c => c.ok), gate: 'AUTONOMOUS_VERIFICATION', checks, changedPaths };
  }
}
