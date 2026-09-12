import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LocalLlmManager } from '../llm/LocalLlmManager';
import { AgentWorkspaceManager } from './AgentWorkspaceManager';
import { DefinitionOfDoneGate } from './DefinitionOfDoneGate';
import { AutonomousResearchEngine } from './AutonomousResearchEngine';
import { ProjectMapManager } from './ProjectMapManager';
import { GitHubLifecycleManager } from './GitHubLifecycleManager';
import { AutonomousRepairLoop, RepairTaskOptions, RepairTaskResult } from './AutonomousRepairLoop';

const execAsync = promisify(exec);

export interface AgentTaskResult {
  success: boolean;
  summary: string;
  filesChanged: string[];
  outputLog: string;
  repairCycles?: number;
  gateSummary?: string;
  gitCommit?: string;
}

export class AutonomousAgentEngine {
  constructor(
    private readonly researchEngine?: AutonomousResearchEngine,
    private readonly projectMap?: ProjectMapManager,
    private readonly gitManager?: GitHubLifecycleManager
  ) {}

  /**
   * 🔍 Tool: Inspecting project directory layouts recursively
   * Traverses the active workspace and exposes valid code targets to the LLM context.
   */
  public async inspectProjectLayout(workspaceRoot: string): Promise<string[]> {
    const fileList: string[] = [];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relPath = path.relative(workspaceRoot, fullPath);
        
        // Safety Filter: Ignore large dependency modules and structural tracking folders
        if (
          relPath.includes('node_modules') || 
          relPath.includes('.git') || 
          relPath.includes('__pycache__') ||
          relPath.includes('.bun') ||
          relPath.includes('dist')
        ) {
          continue;
        }

        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath);
        } else {
          fileList.push(relPath);
        }
      }
    };
    
    walk(workspaceRoot);
    return fileList.length > 0 ? fileList : ["Workspace is empty"];
  }

  /**
   * 📖 Tool: Reading relevant file contents into plaintext string formats
   */
  public readFile(workspaceRoot: string, relativePath: string): string {
    const fullPath = path.join(workspaceRoot, relativePath);
    if (!fs.existsSync(fullPath)) {
      return `Error: Target file reference not found at destination path: ${relativePath}`;
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * ✏️ Tool: Editing and writing code updates safely to physical disk
   */
  public writeFile(workspaceRoot: string, relativePath: string, content: string): string {
    const fullPath = path.join(workspaceRoot, relativePath);
    const parentDir = path.dirname(fullPath);
    
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    return `Successfully updated asset layer: ${relativePath}`;
  }

  /**
   * 🧪 Tool: Running automated code verification tests and build consistency verification
   */
  public async runValidationTests(workspaceRoot: string): Promise<{ passed: boolean; logs: string }> {
    let testCommand = "npm run lint";
    
    // Automatically select package script if defined
    if (fs.existsSync(path.join(workspaceRoot, "package.json"))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "package.json"), 'utf-8'));
        if (pkg.scripts?.lint) {
          testCommand = "npm run lint";
        } else if (pkg.scripts?.build) {
          testCommand = "npm run build";
        } else if (pkg.scripts?.test) {
          testCommand = "npm run test";
        }
      } catch {}
    } else if (fs.existsSync(path.join(workspaceRoot, "requirements.txt"))) {
      testCommand = "python -m pytest";
    }

    try {
      const { stdout, stderr } = await execAsync(testCommand, { cwd: workspaceRoot, timeout: 60000 });
      return { passed: true, logs: stdout || "Build validation check cleared cleanly." };
    } catch (error: any) {
      return { passed: false, logs: error.stderr || error.stdout || error.message };
    }
  }

  /**
   * 🔄 High-Level Autonomous Multi-Stage Repair Pipeline Runner
   */
  public async executeRepairPipeline(
    options: RepairTaskOptions,
    llmManager?: LocalLlmManager
  ): Promise<RepairTaskResult> {
    const research = this.researchEngine || new AutonomousResearchEngine(new (await import('./WebResearchService')).WebResearchService());
    const map = this.projectMap || new ProjectMapManager(options.workspaceRoot);
    const dod = new DefinitionOfDoneGate(options.workspaceRoot);
    const git = this.gitManager || new GitHubLifecycleManager(options.workspaceRoot);

    const pipeline = new AutonomousRepairLoop(research, map, dod, git, llmManager);
    return pipeline.execute(options);
  }

  /**
   * 🧠 Core Autonomous Engineering Operation Loop
   * Coordinates natural instructions into recursive tool operations using your local LLM framework.
   */
  public async orchestrateTask(
    naturalInstruction: string, 
    llmManager: LocalLlmManager,
    workspaceManager: AgentWorkspaceManager
  ): Promise<AgentTaskResult> {
    
    // Track active target directory boundaries from workspace context allocation module
    const workspaceRoot = path.resolve(workspaceManager.getActiveWorkspacePath());
    const currentStructure = await this.inspectProjectLayout(workspaceRoot);
    const modifiedFiles: string[] = [];
    let processingLog = "[INIT] Mapping autonomous loop parameters with research, repair loop & Git lifecycle...\n";
    let repairCycleCount = 0;
    let committedHash: string | undefined;

    // Instructions allowing standard files, documentation research, map inspection, validation, and git
    const systemPayloadContext = `
      You are Gina, an autonomous software engineer layer executing above a code repository.
      The user interacts with you using conversational language. You must figure out the implementation details yourself.
      
      Available Project Workspace Layout File Structure:
      ${JSON.stringify(currentStructure.slice(0, 100), null, 2)}
      
      CRITICAL REQUIREMENT: You must respond using exactly ONE valid JSON object string and NOTHING ELSE. Do not include markdown code block backticks (\`\`\`) around your response. Conversational padding outside the JSON structure is strictly forbidden.
      
      Your response format must match one of these structural actions:
      
      1. To view or read a file:
      {
        "action": "READ_FILE",
        "path": "relative/path/to/file.ext"
      }
      
      2. To write or update a file:
      {
        "action": "WRITE_FILE",
        "path": "relative/path/to/file.ext",
        "contents": "Your full production-ready code or text data here"
      }

      3. To research live documentation, API signatures, or modern library compatibility:
      {
        "action": "RESEARCH_DOCS",
        "query": "search query for documentation or API",
        "package": "optional package name"
      }

      4. To inspect project architecture and find related surfaces:
      {
        "action": "INSPECT_MAP",
        "query": "feature or component to map"
      }

      5. To run compilation/typecheck/lint validation:
      {
        "action": "RUN_VALIDATION"
      }

      6. To inspect Git repository status or commit progress:
      {
        "action": "GIT_STATUS"
      }

      7. To stage and commit changes to the workspace:
      {
        "action": "GIT_COMMIT",
        "message": "Atomic, descriptive commit message"
      }
      
      8. When the engineering task is completely finished and tests pass successfully:
      {
        "action": "TASK_COMPLETE",
        "summary": "Your plain-text natural description back to the user detailing exactly what you changed."
      }
    `;

    let activeContextPrompt = `Objective Instruction: ${naturalInstruction}\nBegin context layout mapping pass.`;
    const maxAgentIterations = 16; // Extended boundary for autonomous research & repair loops

    for (let currentStep = 0; currentStep < maxAgentIterations; currentStep++) {
      try {
        console.log(`[GINA CORE] Dispatching cycle phase step ${currentStep + 1}/${maxAgentIterations}...`);
        
        // Dispatches structural generation parameters to active context engine
        const responseFromModel = await llmManager.generateCompletion({
          systemPrompt: systemPayloadContext,
          prompt: activeContextPrompt,
          temperature: 0.0,
          maxTokens: 4096
        });

        // Clear any markdown wrappers if the model drops them into the output buffer stream
        let cleanJsonString = responseFromModel.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // --- 🛡️ CRITICAL MALFORMED JSON REPAIR HOOK ---
        if (cleanJsonString.includes('"contents": "') && !cleanJsonString.endsWith('"}')) {
          const contentStartIdx = cleanJsonString.indexOf('"contents": "') + 13;
          const jsonPreamble = cleanJsonString.substring(0, contentStartIdx);
          let rawContentsPayload = cleanJsonString.substring(contentStartIdx);
          
          if (rawContentsPayload.endsWith('"}')) {
            rawContentsPayload = rawContentsPayload.substring(0, rawContentsPayload.length - 2);
          }
          
          const escapedPayload = rawContentsPayload.replace(/([^\\])"/g, '$1\\"');
          cleanJsonString = jsonPreamble + escapedPayload + '"}';
        }

        // Safely parse the strict structured action
        const parsedAction = JSON.parse(cleanJsonString);

        // 📖 Action: READ_FILE
        if (parsedAction.action === "READ_FILE") {
          processingLog += `[STEP ${currentStep + 1}] Reading file target: ${parsedAction.path}\n`;
          const fileContents = this.readFile(workspaceRoot, parsedAction.path);
          activeContextPrompt = `File Content payload retrieved for ${parsedAction.path}:\n${fileContents}\n\nSelect your next structured JSON action block.`;
          continue;
        } 
        
        // ✏️ Action: WRITE_FILE
        if (parsedAction.action === "WRITE_FILE") {
          processingLog += `[STEP ${currentStep + 1}] Modifying file target: ${parsedAction.path}\n`;
          this.writeFile(workspaceRoot, parsedAction.path, parsedAction.contents);
          
          if (!modifiedFiles.includes(parsedAction.path)) {
            modifiedFiles.push(parsedAction.path);
          }

          // Trigger automatic build check suite to verify syntax
          const assessment = await this.runValidationTests(workspaceRoot);
          processingLog += `[VALIDATION PASS] Outcome: ${assessment.passed ? "PASSED" : "FAILED"}\n`;
          
          if (!assessment.passed) {
            repairCycleCount++;
            processingLog += `[AUTONOMOUS REPAIR TRIGGERED] Validation failed: ${assessment.logs.slice(0, 200)}\n`;
            activeContextPrompt = `WRITE_FILE was executed, but validation compilation FAILED with diagnostics:\n${assessment.logs.slice(0, 1500)}\n\nAUTONOMOUS REPAIR LOOP ACTIVATED: Diagnose this error, inspect the target file if needed, and write the corrected code.`;
          } else {
            activeContextPrompt = `Write action saved to disk. Validation test compilation status: PASSED cleanly.\nProceed with your next structured JSON action block or declare TASK_COMPLETE.`;
          }
          continue;
        }

        // 🌐 Action: RESEARCH_DOCS
        if (parsedAction.action === "RESEARCH_DOCS") {
          processingLog += `[STEP ${currentStep + 1}] Researching documentation for: ${parsedAction.query}\n`;
          if (this.researchEngine) {
            try {
              const briefing = await this.researchEngine.research({
                query: parsedAction.query,
                libraryOrPackage: parsedAction.package,
                maxResults: 4
              });
              const findingsStr = briefing.keyFindings.join('\n');
              const recsStr = briefing.recommendedPatterns.join('\n');
              const docsSnippet = briefing.fetchedDocumentation ? briefing.fetchedDocumentation.slice(0, 1200) : '';
              activeContextPrompt = `RESEARCH BRIEFING RETRIEVED:\nKey Findings:\n${findingsStr}\nRecommended Patterns:\n${recsStr}\n${docsSnippet ? `Official Docs Snippet:\n${docsSnippet}` : ''}\n\nSelect your next structured JSON action block based on this current documentation.`;
            } catch (err: any) {
              activeContextPrompt = `Research query encountered: ${err?.message}. Fallback to local inspection.`;
            }
          } else {
            activeContextPrompt = `Web research engine is currently offline. Proceed with local workspace inspection.`;
          }
          continue;
        }

        // 🗺️ Action: INSPECT_MAP
        if (parsedAction.action === "INSPECT_MAP") {
          processingLog += `[STEP ${currentStep + 1}] Inspecting project map for: ${parsedAction.query}\n`;
          if (this.projectMap) {
            try {
              const surfaces = await this.projectMap.findAffectedSurfaces(parsedAction.query || '');
              activeContextPrompt = `PROJECT MAP AFFECTED SURFACES:\n${JSON.stringify(surfaces, null, 2)}\n\nReview these affected surfaces and plan your changes across all of them.`;
            } catch (err: any) {
              activeContextPrompt = `Project map query encountered: ${err?.message}.`;
            }
          } else {
            activeContextPrompt = `Project map manager is not configured. Proceed with filesystem inspection.`;
          }
          continue;
        }

        // 🧪 Action: RUN_VALIDATION
        if (parsedAction.action === "RUN_VALIDATION") {
          processingLog += `[STEP ${currentStep + 1}] Explicit validation requested.\n`;
          const assessment = await this.runValidationTests(workspaceRoot);
          if (!assessment.passed) {
            repairCycleCount++;
            activeContextPrompt = `Validation checks FAILED with diagnostics:\n${assessment.logs.slice(0, 1500)}\n\nYou must repair these errors.`;
          } else {
            activeContextPrompt = `Validation passed cleanly (zero diagnostics errors).`;
          }
          continue;
        }

        // 🌿 Action: GIT_STATUS
        if (parsedAction.action === "GIT_STATUS") {
          processingLog += `[STEP ${currentStep + 1}] Checking Git status.\n`;
          if (this.gitManager) {
            const gitStatus = await this.gitManager.getStatus(workspaceRoot);
            activeContextPrompt = `GIT STATUS: Branch: ${gitStatus.branch}, Clean: ${gitStatus.isClean}, Changed: ${gitStatus.totalChanges} files.\nStaged: ${gitStatus.stagedFiles.join(', ')}\nUnstaged: ${gitStatus.unstagedFiles.join(', ')}`;
          } else {
            activeContextPrompt = `Git manager not available. Proceed with filesystem changes.`;
          }
          continue;
        }

        // 📦 Action: GIT_COMMIT
        if (parsedAction.action === "GIT_COMMIT") {
          processingLog += `[STEP ${currentStep + 1}] Committing workspace changes: ${parsedAction.message}\n`;
          if (this.gitManager) {
            const commitRes = await this.gitManager.stageAndCommit(parsedAction.message || 'Autonomous task update', undefined, workspaceRoot);
            if (commitRes.success) {
              committedHash = commitRes.commitHash;
              activeContextPrompt = `Commit created successfully (${commitRes.commitHash}). Proceed or declare TASK_COMPLETE.`;
            } else {
              activeContextPrompt = `Git commit failed: ${commitRes.message}`;
            }
          } else {
            activeContextPrompt = `Git manager not available in this workspace.`;
          }
          continue;
        }
        
        // ✅ Action: TASK_COMPLETE
        if (parsedAction.action === "TASK_COMPLETE") {
          processingLog += `[GATE CHECK] Enforcing machine-level Definition of Done gate on workspace...\n`;
          const dodGate = new DefinitionOfDoneGate(workspaceRoot);
          const gateResult = await dodGate.verify();

          if (!gateResult.ok) {
            repairCycleCount++;
            processingLog += `[GATE FAILED] Task completion BLOCKED by Definition of Done gate: ${gateResult.blockingErrors.join('; ')}\n`;
            // Trigger autonomous repair loop by feeding blocking errors back to the model
            activeContextPrompt = `MANDATORY DEFINITION OF DONE GATE FAILED: You are NOT allowed to declare task completion. The following machine-enforced checks failed:\n${gateResult.blockingErrors.map(e => "- " + e).join('\n')}\n\nAUTONOMOUS REPAIR LOOP ACTIVE (Cycle ${repairCycleCount}): You must repair these issues now. Use WRITE_FILE or READ_FILE to fix the codebase before attempting completion again.`;
            continue;
          }

          processingLog += `[COMPLETE] Definition of Done gate PASSED (${gateResult.passedChecks}/${gateResult.totalChecks} checks clean). Task marked resolved.\n`;
          
          return {
            success: true,
            summary: `${parsedAction.summary}\n\n[DEFINITION OF DONE: VERIFIED]\n${gateResult.summary}${committedHash ? `\n[GIT COMMIT] ${committedHash}` : ''}`,
            filesChanged: modifiedFiles,
            outputLog: processingLog + "[COMPLETE] Task resolved cleanly with 100% gate compliance.\n",
            repairCycles: repairCycleCount,
            gateSummary: gateResult.summary,
            gitCommit: committedHash
          };
        }

        activeContextPrompt = `System Error: Missing explicit valid JSON action parameters ("READ_FILE", "WRITE_FILE", "RESEARCH_DOCS", "INSPECT_MAP", "RUN_VALIDATION", "GIT_STATUS", "GIT_COMMIT", or "TASK_COMPLETE"). Select a valid action.`;

      } catch (loopError: any) {
        processingLog += `[CRITICAL EXCEPTION] Processing break during loop parsing step: ${loopError.message}\n`;
        activeContextPrompt = `System Error: Your response failed to parse as valid structural JSON data. Error details: ${loopError.message}. Please fix your output parameters to match exactly one of the requested object schemas.`;
      }
    }

    return {
      success: false,
      summary: "Gina processed her available context paths but reached the iteration threshold before executing a completion code injection block.",
      filesChanged: modifiedFiles,
      outputLog: processingLog + "[TIMEOUT] Max iteration loop boundary ceiling reached.",
      repairCycles: repairCycleCount
    };
  }
}
