import fs from 'fs/promises';
import path from 'path';

export interface AgentContextSnapshot {
  generatedAt: string;
  projectRoot: string;
  primaryFiles: Array<{ path: string; exists: boolean; sizeBytes?: number }>;
  milestoneExcerpt: string;
  changelogExcerpt: string;
  agentsExcerpt: string;
  readmeExcerpt: string;
  workflowSummary: Array<{ file: string; sizeBytes: number }>;
}

async function fileExcerpt(filePath: string, maxChars: number): Promise<{ exists: boolean; sizeBytes?: number; excerpt: string }> {
  try {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    return { exists: true, sizeBytes: stat.size, excerpt: content.slice(0, maxChars) };
  } catch {
    return { exists: false, excerpt: '' };
  }
}

export class AgentContextManager {
  constructor(private readonly root: string, private readonly workflowRoot: string) {}

  async buildSnapshot(): Promise<AgentContextSnapshot> {
    const files = [
      'AGENTS.md',
      'CHANGELOG.md',
      'README.md',
      'docs/INDEX.md',
      'docs/architecture/SYSTEM_ARCHITECTURE.md',
      'src/components/MilestoneChecklist.tsx',
      'src/components/AppFeaturesGuide.tsx',
      'src/components/LocalCapabilityPanel.tsx',
      'src/version.ts',
      'package.json',
      'metadata.json',
      'docs/setup/LOCAL_LLM_SETUP.md',
      'docs/setup/LOCAL_AGENT_SETUP.md'
    ];
    const inspected = await Promise.all(files.map(async relative => ({ relative, ...(await fileExcerpt(path.join(this.root, relative), relative.includes('CHANGELOG') ? 18000 : 12000)) })));
    const workflowSummary: AgentContextSnapshot['workflowSummary'] = [];
    try {
      const entries = await fs.readdir(this.workflowRoot, { withFileTypes: true });
      for (const entry of entries.filter(e => e.isFile() && e.name.toLowerCase().endsWith('.json')).slice(0, 100)) {
        const stat = await fs.stat(path.join(this.workflowRoot, entry.name));
        workflowSummary.push({ file: entry.name, sizeBytes: stat.size });
      }
    } catch { /* optional */ }
    const get = (name: string) => inspected.find(x => x.relative === name);
    return {
      generatedAt: new Date().toISOString(), projectRoot: this.root,
      primaryFiles: inspected.map(x => ({ path: path.join(this.root, x.relative), exists: x.exists, sizeBytes: x.sizeBytes })),
      milestoneExcerpt: get('src/components/MilestoneChecklist.tsx')?.excerpt || '',
      changelogExcerpt: get('CHANGELOG.md')?.excerpt || '',
      agentsExcerpt: get('AGENTS.md')?.excerpt || '',
      readmeExcerpt: get('README.md')?.excerpt || '', workflowSummary,
    };
  }

  compact(snapshot: AgentContextSnapshot): string {
    return JSON.stringify({ generatedAt: snapshot.generatedAt, projectRoot: snapshot.projectRoot, primaryFiles: snapshot.primaryFiles, workflowSummary: snapshot.workflowSummary, milestones: snapshot.milestoneExcerpt.slice(0,7000), agents: snapshot.agentsExcerpt.slice(0,9000), changelog: snapshot.changelogExcerpt.slice(0,9000) });
  }
}
