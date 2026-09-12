import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LocalLlmManager } from '../llm/LocalLlmManager';
import { AgentWorkspaceManager } from './AgentWorkspaceManager';

const execAsync = promisify(exec);

export interface AgentTaskResult {
  success: boolean;
  summary: string;
  filesChanged: string[];
  outputLog: string;
}

export class AutonomousAgentEngine {
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
          relPath.includes('.bun')
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
    let testCommand = "bun run build"; // Match your native runtime workspace preferences
    
    // Automatically fall back to ecosystem defaults if project definitions are found
    if (fs.existsSync(path.join(workspaceRoot, "package.json"))) {
      testCommand = fs.existsSync(path.join(workspaceRoot, "bun.lockb")) ? "bun run build" : "npm run build";
    } else if (fs.existsSync(path.join(workspaceRoot, "requirements.txt"))) {
      testCommand = "python -m pytest";
    }

    try {
      const { stdout, stderr } = await execAsync(testCommand, { cwd: workspaceRoot });
      return { passed: true, logs: stdout || "Build validation check cleared cleanly." };
    } catch (error: any) {
      return { passed: false, logs: error.stderr || error.stdout || error.message };
    }
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
    
    // Track active target directory boundaries from your workspace context allocation module
    const workspaceRoot = path.resolve(workspaceManager.getActiveWorkspacePath());
    const currentStructure = await this.inspectProjectLayout(workspaceRoot);
    const modifiedFiles: string[] = [];
    let processingLog = "[INIT] Mapping autonomous loop parameters...\n";

    // Strict instructions forcing the local model to respond using ONLY pure JSON action blocks
    const systemPayloadContext = `
      You are Gina, an autonomous software engineer layer executing above a code repository.
      The user interacts with you using conversational language. You must figure out the implementation details yourself.
      
      Available Project Workspace Layout File Structure:
      ${JSON.stringify(currentStructure, null, 2)}
      
      CRITICAL REQUIREMENT: You must respond using exactly ONE valid JSON object string and NOTHING ELSE. Do not include markdown code block backticks (\`\`\`) around your response. Conversational padding outside the JSON structure is strictly forbidden.
      
      Your response format must perfectly match one of these three explicit structural keys:
      
      1. To view or read a file:
      {
        "action": "READ_FILE",
        "path": "relative/path/to/file.ext"
      }
      
      2. To write or update a file layout completely:
      {
        "action": "WRITE_FILE",
        "path": "relative/path/to/file.ext",
        "contents": "Your full production-ready code or text data here"
      }
      
      3. When the engineering task is completely finished and tests pass successfully:
      {
        "action": "TASK_COMPLETE",
        "summary": "Your plain-text natural conversational description back to the user detailing exactly what you changed."
      }
    `;

    let activeContextPrompt = `Objective Instruction: ${naturalInstruction}\nBegin context layout mapping pass.`;
    const maxAgentIterations = 8;

    for (let currentStep = 0; currentStep < maxAgentIterations; currentStep++) {
      try {
        console.log(`[GINA CORE] Dispatching cycle phase step ${currentStep + 1}/${maxAgentIterations}...`);
        
        // Dispatches structural generation parameters to your active Qwen context engine
        const responseFromModel = await llmManager.generateCompletion({
          systemPrompt: systemPayloadContext,
          prompt: activeContextPrompt,
          temperature: 0.0,
          maxTokens: 4096
        });

        // Clear any markdown wrappers if the model drops them into the output buffer stream
        let cleanJsonString = responseFromModel.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // --- 🛡️ CRITICAL MALFORMED JSON REPAIR HOOK ---
        // If the local model forgets to escape nested quotes inside the text payload, 
        // this handler intercepts and converts them cleanly before passing to JSON.parse()
        if (cleanJsonString.includes('"contents": "') && !cleanJsonString.endsWith('"}')) {
          // Automatic recovery for unescaped content block breaks
          const contentStartIdx = cleanJsonString.indexOf('"contents": "') + 13;
          const jsonPreamble = cleanJsonString.substring(0, contentStartIdx);
          let rawContentsPayload = cleanJsonString.substring(contentStartIdx);
          
          if (rawContentsPayload.endsWith('"}')) {
            rawContentsPayload = rawContentsPayload.substring(0, rawContentsPayload.length - 2);
          }
          
          // Escape isolated interior quotes safely
          const escapedPayload = rawContentsPayload.replace(/([^\\])"/g, '$1\\"');
          cleanJsonString = jsonPreamble + escapedPayload + '"}';
        }

        // Safely parse the strict structured action from the local engine
        const parsedAction = JSON.parse(cleanJsonString);

        // 📖 Action State Handling: Read Request
        if (parsedAction.action === "READ_FILE") {
          processingLog += `[STEP ${currentStep + 1}] Reading file target: ${parsedAction.path}\n`;
          
          const fileContents = this.readFile(workspaceRoot, parsedAction.path);
          activeContextPrompt = `File Content payload retrieved for ${parsedAction.path}:\n${fileContents}\n\nSelect your next structured JSON action block.`;
          continue;
        } 
        
        // ✏️ Action State Handling: Write Request
        if (parsedAction.action === "WRITE_FILE") {
          processingLog += `[STEP ${currentStep + 1}] Modifying file target: ${parsedAction.path}\n`;
          this.writeFile(workspaceRoot, parsedAction.path, parsedAction.contents);
          
          if (!modifiedFiles.includes(parsedAction.path)) {
            modifiedFiles.push(parsedAction.path);
          }

          // Trigger the automatic build check suite to verify syntax
          const assessment = await this.runValidationTests(workspaceRoot);
          processingLog += `[TEST RUN] Validation build outcome status: ${assessment.passed ? "SUCCESS" : "FAILED"}\n`;
          
          activeContextPrompt = `Write action saved to disk. Validation test compilation status: ${assessment.passed ? "PASSED" : "FAILED"}.\nProceed with your next structured JSON action block.`;
          continue;
        } 
        
        // ✅ Action State Handling: Task Completed
        if (parsedAction.action === "TASK_COMPLETE") {
          processingLog += `[COMPLETE] Task marked resolved by AI coordinator engine.\n`;
          
          return {
            success: true,
            summary: parsedAction.summary,
            filesChanged: modifiedFiles,
            outputLog: processingLog + "[COMPLETE] Task resolved cleanly.\n"
          };
        }

        activeContextPrompt = `System Error: Missing explicit valid JSON action parameters ("READ_FILE", "WRITE_FILE", or "TASK_COMPLETE"). Re-evaluate current layout state and declare your choice cleanly using specified data attributes.`;

      } catch (loopError: any) {
        processingLog += `[CRITICAL EXCEPTION] Processing break during loop parsing step: ${loopError.message}\n`;
        // Pass the raw syntax parse failure string straight back down to the model for automatic self-recovery
        activeContextPrompt = `System Error: Your response failed to parse as valid structural JSON data. Error details: ${loopError.message}. Please fix your output parameters to match exactly one of the requested object schemas.`;
      }
    }

    return {
      success: false,
      summary: "Gina processed her available context paths but timed out at the iteration threshold before executing a completion code injection block.",
      filesChanged: modifiedFiles,
      outputLog: processingLog + "[TIMEOUT] Max iteration loop boundary ceiling reached."
    };
  }
}
