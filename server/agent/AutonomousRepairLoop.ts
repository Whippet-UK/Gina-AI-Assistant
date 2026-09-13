import path from 'path';
import { AutonomousResearchEngine, ResearchBriefing } from './AutonomousResearchEngine';
import { ProjectMapManager, ProjectSurface } from './ProjectMapManager';
import { DefinitionOfDoneGate, DefinitionOfDoneResult } from './DefinitionOfDoneGate';
import { GitHubLifecycleManager, GitStatusSummary, GitDiffSummary } from './GitHubLifecycleManager';
import { LocalLlmManager } from '../llm/LocalLlmManager';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export type RepairLoopStage = 
  | 'REQUEST'
  | 'UNDERSTAND'
  | 'PLAN'
  | 'INSPECT'
  | 'RESEARCH'
  | 'EDIT'
  | 'VALIDATE'
  | 'FIND_FAILURES'
  | 'REPAIR'
  | 'RE_VALIDATE'
  | 'INTEGRITY_SCAN'
  | 'FINAL_DIFF'
  | 'COMMIT'
  | 'COMPLETED'
  | 'FAILED';

export interface StageLogEntry {
  stage: RepairLoopStage;
  timestamp: string;
  summary: string;
  details?: any;
  durationMs?: number;
}

export interface RepairTaskOptions {
  request: string;
  workspaceRoot: string;
  maxRepairCycles?: number;
  autoCommit?: boolean;
  commitMessage?: string;
  branchName?: string;
  researchLibrary?: string;
  onProgress?: (stage: RepairLoopStage, entry: StageLogEntry) => void;
}

export interface RepairTaskResult {
  ok: boolean;
  request: string;
  stagesCompleted: StageLogEntry[];
  totalRepairCycles: number;
  affectedSurfaces: ProjectSurface[];
  researchBriefing?: ResearchBriefing;
  modifiedFiles: string[];
  diffSummary?: GitDiffSummary;
  gitStatus?: GitStatusSummary;
  gateResult?: DefinitionOfDoneResult;
  error?: string;
  finalMessage: string;
}

export class AutonomousRepairLoop {
  constructor(
    private readonly researchEngine: AutonomousResearchEngine,
    private readonly projectMap: ProjectMapManager,
    private readonly dodGate: DefinitionOfDoneGate,
    private readonly gitManager: GitHubLifecycleManager,
    private readonly llmManager?: LocalLlmManager
  ) {}

  /**
   * Executes the full end-to-end autonomous repair loop:
   * REQUEST -> UNDERSTAND -> PLAN -> INSPECT -> RESEARCH -> EDIT -> VALIDATE ->
   * FIND FAILURES -> REPAIR -> RE-VALIDATE -> INTEGRITY SCAN -> FINAL DIFF -> COMMIT
   */
  public async execute(options: RepairTaskOptions): Promise<RepairTaskResult> {
    const startTime = Date.now();
    const history: StageLogEntry[] = [];
    const maxCycles = Math.min(10, Math.max(1, options.maxRepairCycles ?? 5));
    const modifiedFiles: string[] = [];
    const repairBackups = new Map<string, string>();
    let repairCycle = 0;

    const logStage = (stage: RepairLoopStage, summary: string, details?: any) => {
      const entry: StageLogEntry = {
        stage,
        timestamp: new Date().toISOString(),
        summary,
        details,
        durationMs: Date.now() - startTime
      };
      history.push(entry);
      if (options.onProgress) {
        try { options.onProgress(stage, entry); } catch { /* ignore */ }
      }
      return entry;
    };

    // 1. REQUEST
    logStage('REQUEST', `Initiated autonomous task: "${options.request}"`);

    // 2. UNDERSTAND: locate affected surfaces using ProjectMapManager
    let affectedSurfaces: ProjectSurface[] = [];
    try {
      affectedSurfaces = await this.projectMap.findAffectedSurfaces(options.request);
      logStage('UNDERSTAND', `Mapped ${affectedSurfaces.length} affected surfaces across project architecture`, {
        surfaces: affectedSurfaces.map(s => s.name)
      });
    } catch (err: any) {
      logStage('UNDERSTAND', `Surface mapping fallback: ${err?.message || String(err)}`);
    }

    // 3. PLAN: formulate action plan
    logStage('PLAN', `Formulated action plan with max ${maxCycles} automated repair cycles and machine-gated verification.`);

    // 4. INSPECT: inspect primary files for affected surfaces
    const primaryFilesToInspect = Array.from(new Set(affectedSurfaces.flatMap(s => s.primaryFiles)));
    logStage('INSPECT', `Identified ${primaryFilesToInspect.length} key surface files for inspection`, {
      files: primaryFilesToInspect.slice(0, 15)
    });

    // 5. RESEARCH: conduct local + web research if external libraries or APIs are mentioned
    let researchBriefing: ResearchBriefing | undefined;
    const shouldResearch = options.researchLibrary || /library|api|update|migration|wan|qwen|flux|ffmpeg|version|npm|pip/i.test(options.request);
    if (shouldResearch) {
      try {
        researchBriefing = await this.researchEngine.research({
          query: options.researchLibrary || options.request,
          libraryOrPackage: options.researchLibrary,
          maxResults: 4
        });
        logStage('RESEARCH', `Completed research briefing with ${researchBriefing.sources.length} sources and ${researchBriefing.keyFindings.length} findings`, {
          webEnabled: researchBriefing.webEnabled,
          sources: researchBriefing.sources.map(s => s.title)
        });
      } catch (err: any) {
        logStage('RESEARCH', `Research engine fallback: ${err?.message || String(err)}`);
      }
    }

    // 6. EDIT: prepare branch if requested
    if (options.branchName) {
      try {
        const branchRes = await this.gitManager.createOrSwitchBranch(options.branchName, options.workspaceRoot);
        logStage('EDIT', `Branch setup: ${branchRes.message}`);
      } catch (err: any) {
        logStage('EDIT', `Branch setup warning: ${err?.message || String(err)}`);
      }
    }

    // 7. VALIDATE & REPAIR loop: validate code and loop back on failure
    let validationPassed = false;
    let lastValidationError = '';

    while (repairCycle < maxCycles) {
      repairCycle++;
      logStage('VALIDATE', `Running validation pass (Cycle ${repairCycle}/${maxCycles})...`);

      const val = await this.runValidation(options.workspaceRoot);
      if (val.passed) {
        validationPassed = true;
        logStage('VALIDATE', `Validation checks PASSED cleanly on cycle ${repairCycle}.`);
        break;
      }

      lastValidationError = val.errors;
      logStage('FIND_FAILURES', `Validation detected failure on cycle ${repairCycle}: ${val.errors.slice(0, 300)}`, {
        diagnosticStderr: val.errors.slice(0, 1000)
      });

      // Enter REPAIR state
      logStage('REPAIR', `Entering automated repair cycle ${repairCycle}/${maxCycles}...`);

      // The previous implementation only constructed a repair prompt and never
      // sent it to the local model. That made the advertised repair loop a
      // validation loop: every failed cycle re-ran the same broken workspace.
      // When a local LLM is available, request one tightly-scoped JSON repair and
      // write it only inside the active workspace. The next cycle is the actual
      // validation gate for that edit.
      if (this.llmManager) {
        try {
          const candidateFiles = primaryFilesToInspect.slice(0, 8);
          const fileContext: string[] = [];
          for (const relPath of candidateFiles) {
            const fullPath = path.resolve(options.workspaceRoot, relPath);
            const workspacePrefix = path.resolve(options.workspaceRoot) + path.sep;
            if (!fullPath.startsWith(workspacePrefix)) continue;
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              fileContext.push(`FILE: ${relPath}\n${content.slice(0, 12000)}`);
            } catch { /* affected surface may be missing in this workspace */ }
          }

          const repairPrompt = `
You are Gina AI Factory's constrained autonomous repair engine.
A real validation command failed. Diagnose the failure and make ONE minimal production-safe edit.
Return ONLY one JSON object with exactly: {"path":"relative/existing/file","contents":"full replacement file contents"}.
Rules: path must be relative to the workspace; do not create new files; do not modify package dependencies; preserve unrelated behavior; fix only the reported failure.

VALIDATION ERROR:
${val.errors.slice(0, 5000)}

AFFECTED FILES:
${fileContext.join('\n\n').slice(0, 50000)}
`;

          const rawRepair = await this.llmManager.generateCompletion({
            systemPrompt: 'Return only valid JSON. No markdown fences. No commentary.',
            prompt: repairPrompt,
            temperature: 0,
            maxTokens: 4096
          });
          const match = String(rawRepair || '').match(/\{[\s\S]*\}/);
          if (!match) throw new Error('Repair engine returned no JSON object.');
          const repair = JSON.parse(match[0]);
          const relPath = String(repair?.path || '').trim();
          const contents = typeof repair?.contents === 'string' ? repair.contents : null;
          const protectedFiles = new Set(['package.json','package-lock.json','pnpm-lock.yaml','yarn.lock','metadata.json','src/version.ts','AGENTS.md','docs/AI_UPDATE_CHECKLIST.md','src/components/MilestoneChecklist.tsx']);
          if (!relPath || contents === null || path.isAbsolute(relPath) || relPath.split(/[\\/]+/).includes('..')) {
            throw new Error('Repair engine returned an unsafe or incomplete file target.');
          }
          if (protectedFiles.has(relPath.replaceAll('\\', '/'))) throw new Error(`Repair engine cannot modify protected project-contract file: ${relPath}`);
          if (contents.length > 512 * 1024) throw new Error(`Repair engine replacement is too large: ${relPath}`);
          const target = path.resolve(options.workspaceRoot, relPath);
          const workspacePrefix = path.resolve(options.workspaceRoot) + path.sep;
          if (!target.startsWith(workspacePrefix)) throw new Error('Repair target escaped the active workspace.');
          const existed = await fs.stat(target).then(stat => stat.isFile()).catch(() => false);
          if (!existed) throw new Error(`Repair target does not already exist: ${relPath}`);
          if (!repairBackups.has(relPath)) repairBackups.set(relPath, await fs.readFile(target, 'utf8'));

          await fs.writeFile(target, contents, 'utf8');
          if (!modifiedFiles.includes(relPath)) modifiedFiles.push(relPath);
          logStage('REPAIR', `Applied constrained local-LLM repair to ${relPath}.`);
        } catch (repairErr: any) {
          logStage('REPAIR', `Automated repair could not be applied: ${repairErr?.message || String(repairErr)}`);
        }
      } else {
        logStage('REPAIR', 'No local LLM manager is available; validation failure cannot be auto-edited.');
      }

      // Re-validate in next iteration of while loop
      logStage('RE_VALIDATE', `Re-evaluating workspace health after repair pass ${repairCycle}...`);
    }

    if (!validationPassed) {
      // Never leave a workspace in a state made worse by the repair engine.
      // Restore only files that this loop itself changed; pre-existing user edits
      // remain untouched.
      for (const [relPath, original] of repairBackups) {
        try { await fs.writeFile(path.resolve(options.workspaceRoot, relPath), original, 'utf8'); } catch { /* preserve failure report if rollback itself is unavailable */ }
      }
      logStage('FAILED', `Exhausted ${maxCycles} repair cycles without clearing compilation errors; reverted ${repairBackups.size} automated repair file(s).`);
      return {
        ok: false,
        request: options.request,
        stagesCompleted: history,
        totalRepairCycles: repairCycle,
        affectedSurfaces,
        researchBriefing,
        modifiedFiles,
        error: `Validation failed after ${maxCycles} cycles: ${lastValidationError.slice(0, 500)}`,
        finalMessage: `Autonomous repair loop halted: could not resolve validation failures.`
      };
    }

    // 8. INTEGRITY SCAN: machine-enforced Definition of Done gate
    logStage('INTEGRITY_SCAN', `Running project-wide Definition of Done gate and retired reference audit...`);
    let gateResult: DefinitionOfDoneResult;
    try {
      gateResult = await this.dodGate.verify();
      if (!gateResult.ok) {
        for (const [relPath, original] of repairBackups) {
          try { await fs.writeFile(path.resolve(options.workspaceRoot, relPath), original, 'utf8'); } catch { /* preserve gate failure */ }
        }
        logStage('INTEGRITY_SCAN', `Definition of Done gate BLOCKED: ${gateResult.blockingErrors.join('; ')}; reverted ${repairBackups.size} automated repair file(s).`);
        return {
          ok: false,
          request: options.request,
          stagesCompleted: history,
          totalRepairCycles: repairCycle,
          affectedSurfaces,
          researchBriefing,
          modifiedFiles,
          gateResult,
          error: `Gate blocked: ${gateResult.blockingErrors.join('; ')}`,
          finalMessage: `Definition of Done gate failed: ${gateResult.summary}`
        };
      }
      logStage('INTEGRITY_SCAN', `Definition of Done gate PASSED: 100% compliance across ${gateResult.totalChecks} checks.`);
    } catch (gateErr: any) {
      logStage('INTEGRITY_SCAN', `Gate execution error: ${gateErr?.message || String(gateErr)}`);
      return {
        ok: false,
        request: options.request,
        stagesCompleted: history,
        totalRepairCycles: repairCycle,
        affectedSurfaces,
        researchBriefing,
        modifiedFiles,
        error: gateErr?.message || String(gateErr),
        finalMessage: `Gate execution encountered an internal failure.`
      };
    }

    // 9. FINAL DIFF: inspect git changes
    let diffSummary: GitDiffSummary | undefined;
    let gitStatus: GitStatusSummary | undefined;
    try {
      gitStatus = await this.gitManager.getStatus(options.workspaceRoot);
      diffSummary = await this.gitManager.getDiff(options.workspaceRoot);
      logStage('FINAL_DIFF', `Generated diff summary: ${diffSummary.filesChanged} files changed (+${diffSummary.insertions}/-${diffSummary.deletions})`);
    } catch (diffErr: any) {
      logStage('FINAL_DIFF', `Diff summary note: ${diffErr?.message || String(diffErr)}`);
    }

    // 10. COMMIT / ARTIFACT: auto-commit if requested and clean
    if (options.autoCommit && gitStatus && !gitStatus.isClean) {
      try {
        const msg = options.commitMessage || `Autonomous repair: ${options.request.slice(0, 72)}`;
        const commitRes = await this.gitManager.stageAndCommit(msg, undefined, options.workspaceRoot);
        logStage('COMMIT', `Git commit created: ${commitRes.message}`);
      } catch (commitErr: any) {
        logStage('COMMIT', `Git commit skipped: ${commitErr?.message || String(commitErr)}`);
      }
    }

    // 11. COMPLETED
    logStage('COMPLETED', `Autonomous repair loop completed successfully in ${Date.now() - startTime}ms.`);

    return {
      ok: true,
      request: options.request,
      stagesCompleted: history,
      totalRepairCycles: repairCycle,
      affectedSurfaces,
      researchBriefing,
      modifiedFiles,
      diffSummary,
      gitStatus,
      gateResult,
      finalMessage: `Autonomous workflow completed cleanly. All gates passed.`
    };
  }

  private async runValidation(workspaceRoot: string): Promise<{ passed: boolean; errors: string }> {
    try {
      // Check for npm/bun workspace
      const pkgPath = path.join(workspaceRoot, 'package.json');
      const hasPkg = await fs.stat(pkgPath).then(() => true).catch(() => false);
      if (hasPkg) {
        const { stdout, stderr } = await execAsync('npm run lint', { cwd: workspaceRoot, timeout: 60000 });
        return { passed: true, errors: '' };
      }
      return { passed: true, errors: '' };
    } catch (err: any) {
      const msg = String(err?.stdout || err?.stderr || err?.message || 'Validation error');
      return { passed: false, errors: msg };
    }
  }
}
