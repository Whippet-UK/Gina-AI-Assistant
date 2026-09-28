import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export interface AgentSkill {
  id: string;
  name: string;
  category: string;
  content: string;
  filePath: string;
}

let cachedSkillPrompt = "";
let loadedSkills: AgentSkill[] = [];

export function getActiveAgentSkillsPrompt(): string {
  if (cachedSkillPrompt) return cachedSkillPrompt;
  if (loadedSkills.length > 0) {
    cachedSkillPrompt = compileSkillsPrompt(loadedSkills);
    return cachedSkillPrompt;
  }
  return "";
}

function compileSkillsPrompt(skills: AgentSkill[]): string {
  if (!skills.length) return "";
  const sections = skills.map(s => `### SKILL: ${s.name} (${s.category})\n${s.content.trim()}`);
  return `ACTIVE AGENT SKILLS & HARDWARE SAFEGUARDS:\n\n${sections.join('\n\n')}\n`;
}

export async function loadAgentSkills(projectRoot?: string): Promise<AgentSkill[]> {
  const root = projectRoot || process.cwd();
  const candidates = [
    path.join(root, ".gina", "docs", "agent_skills"),
    path.join(root, "docs", "agent_skills"),
  ];

  const results: AgentSkill[] = [];

  for (const dir of candidates) {
    if (!fsSync.existsSync(dir)) continue;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          if (entry.name.endsWith(".txt") || entry.name.endsWith(".md")) {
            const content = await fs.readFile(fullPath, "utf-8");
            const name = entry.name.replace(/\.(txt|md)$/i, "").replace(/_/g, " ");
            results.push({
              id: entry.name.toLowerCase(),
              name,
              category: "Core",
              content,
              filePath: fullPath
            });
          }
        } else if (entry.isDirectory()) {
          const subEntries = await fs.readdir(fullPath);
          for (const sub of subEntries) {
            if (sub.endsWith(".md") || sub.endsWith(".txt")) {
              const subPath = path.join(fullPath, sub);
              const content = await fs.readFile(subPath, "utf-8");
              results.push({
                id: `${entry.name}-${sub}`.toLowerCase(),
                name: `${entry.name} - ${sub.replace(/\.(txt|md)$/i, "")}`,
                category: entry.name,
                content,
                filePath: subPath
              });
            }
          }
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  loadedSkills = results;
  cachedSkillPrompt = compileSkillsPrompt(results);
  return results;
}
