import fs from 'fs/promises';
import path from 'path';

export interface ProjectSurface {
  name: string;
  category: 'Frontend' | 'Backend' | 'Models' | 'Configuration' | 'Tests' | 'Documentation';
  primaryFiles: string[];
  description: string;
  engineBindings?: string[];
  relatedSurfaces?: string[];
}

export interface ProjectMap {
  version: string;
  generatedAt: string;
  surfaces: ProjectSurface[];
  relationships: Record<string, string[]>;
}

export class ProjectMapManager {
  private cachedMap: ProjectMap | null = null;
  private readonly mapFilePath: string;

  constructor(private readonly root: string) {
    this.mapFilePath = path.join(this.root, '.gina', 'project-map.json');
  }

  public getCanonicalSurfaces(): ProjectSurface[] {
    return [
      {
        name: 'Video Studio',
        category: 'Frontend',
        primaryFiles: ['src/components/VideoStudio.tsx', 'src/components/wan-video/WanVideoStudio.tsx'],
        description: 'Text-to-video generation studio, rendering presets, aspect ratios, and export controls.',
        engineBindings: ['Wan 2.1 1.3B BF16', 'ComfyUI wan_video.json'],
        relatedSurfaces: ['GIF Studio', 'Multimedia MoviePy Stitcher', 'ComfyUI Engine Proxy', 'Wan 2.1 Diagnostic Suite']
      },
      {
        name: 'Image Studio (Create Studio)',
        category: 'Frontend',
        primaryFiles: ['src/components/CreateStudio.tsx', 'src/components/gina-image/GinaImageCanvas.tsx', 'src/components/gina-image/GinaImagePreview.tsx'],
        description: 'High-speed image generation with photorealism and high-precision lanes.',
        engineBindings: ['Juggernaut-XL v9 (default)', 'FLUX.1 Lite GGUF (high-precision alternate)'],
        relatedSurfaces: ['AIDA64 Studio', 'Prompt Studio', 'ComfyUI Engine Proxy']
      },
      {
        name: 'GIF Studio',
        category: 'Frontend',
        primaryFiles: ['src/components/GifStudio.tsx'],
        description: 'Multi-scene animation and GIF generation studio with storyboard timeline.',
        engineBindings: ['Wan 2.1 1.3B BF16', 'MoviePy Compositor'],
        relatedSurfaces: ['Video Studio', 'Multimedia MoviePy Stitcher']
      },
      {
        name: 'AIDA64 Studio',
        category: 'Frontend',
        primaryFiles: ['src/components/Aida64Studio.tsx', 'src/components/aida64/Aida64Canvas.tsx', 'src/components/aida64/Aida64DialEditor.tsx'],
        description: 'Sensor panel creator, 100-state radial gauge generator, telemetry pods and ZIP exporter.',
        engineBindings: ['HTML5 Canvas Shader / Alpha Renderer'],
        relatedSurfaces: ['Image Studio', 'Hardware Sentinel & Telemetry']
      },
      {
        name: 'StreamInject Pure Render Suite',
        category: 'Frontend',
        primaryFiles: ['src/components/StreamInjectSuite.tsx'],
        description: 'Pure render overlay compositor, chroma key green-screen, CTA generator, and timeline.',
        engineBindings: ['Headless Python FFmpeg', 'HTML5 WebGL Compositor'],
        relatedSurfaces: ['Video Studio', 'Music Studio']
      },
      {
        name: 'Music Studio & AudioCraft',
        category: 'Frontend',
        primaryFiles: ['src/components/MusicStudio.tsx', 'src/components/music/MusicGeneratorSuite.tsx'],
        description: 'AI music generator, stem separation, BGM generator, lyricist and audio timeline.',
        engineBindings: ['Meta AudioCraft / MusicGen', 'Local Qwen Lyricist'],
        relatedSurfaces: ['Multimedia MoviePy Stitcher', 'StreamInject Pure Render Suite']
      },
      {
        name: 'Gina Agent Workbench',
        category: 'Frontend',
        primaryFiles: ['src/components/GinaAgentPanel.tsx'],
        description: 'Autonomous agent terminal, SSE live stream, tool audit log, workspace manager and definition of done gate UI.',
        engineBindings: ['AutonomousAgentEngine', 'AgentRunManager', 'DefinitionOfDoneGate'],
        relatedSurfaces: ['Local AI & Qwen Chat', 'Autonomous Agent Engine', 'Agent Workspace Broker']
      },
      {
        name: 'Local AI & Qwen Chat',
        category: 'Frontend',
        primaryFiles: ['src/components/LocalAiStudio.tsx'],
        description: 'Local conversational and code assistant with vision mode and project file attachment.',
        engineBindings: ['Qwen 2.5-VL 7B (Vision)', 'Qwen 2.5 Coder 7B (Code/Text)'],
        relatedSurfaces: ['Local LLM Engine Service', 'Gina Agent Workbench']
      },
      {
        name: 'System Milestones & Hardware Sentinel',
        category: 'Frontend',
        primaryFiles: ['src/components/MilestoneChecklist.tsx', 'src/components/LocalCapabilityPanel.tsx', 'src/components/AppFeaturesGuide.tsx'],
        description: 'Authoritative milestone checklist, hardware status (RTX 3070 Ti), VRAM cage, and feature guide.',
        engineBindings: ['NVIDIA SMI Bridge', 'Win32 Telemetry'],
        relatedSurfaces: ['Update Integrity Guard', 'Definition of Done Gate']
      },
      {
        name: 'Express Server & API Routes',
        category: 'Backend',
        primaryFiles: ['server.ts'],
        description: 'Core backend listening on port 3200 (local Windows) and port 3000 (cloud container). Hosts all REST and SSE endpoints.',
        relatedSurfaces: ['Autonomous Agent Engine', 'Agent Run Manager', 'Definition of Done Gate']
      },
      {
        name: 'Autonomous Agent Engine',
        category: 'Backend',
        primaryFiles: ['server/agent/AutonomousAgentEngine.ts', 'server/agent/AgentWorkspaceManager.ts'],
        description: 'Autonomous tool dispatcher, project inspection, code reading/writing, and autonomous repair loop.',
        relatedSurfaces: ['Gina Agent Workbench', 'Definition of Done Gate', 'Agent Run Manager']
      },
      {
        name: 'Definition of Done Gate',
        category: 'Backend',
        primaryFiles: ['server/agent/DefinitionOfDoneGate.ts', 'server/agent/UpdateIntegrityGuard.ts'],
        description: 'Machine-enforced verification gate ensuring zero broken updates, metadata sync, retired engine audits, and clean builds.',
        relatedSurfaces: ['Autonomous Agent Engine', 'Update Integrity Checklist', 'System Milestones']
      },
      {
        name: 'Agent Run Manager & SSE',
        category: 'Backend',
        primaryFiles: ['server/agent/AgentRunManager.ts'],
        description: 'Persists agent execution runs under .gina/agent-runs and streams real-time state via Server-Sent Events.',
        relatedSurfaces: ['Gina Agent Workbench', 'Autonomous Agent Engine']
      },
      {
        name: 'Autonomous Research & Repair Loop',
        category: 'Backend',
        primaryFiles: ['server/agent/AutonomousResearchEngine.ts', 'server/agent/AutonomousRepairLoop.ts'],
        description: 'Multi-stage autonomous repair loop (REQUEST->UNDERSTAND->PLAN->INSPECT->RESEARCH->EDIT->VALIDATE->REPAIR->SCAN->DIFF->COMMIT) and combined local+web API documentation research engine.',
        relatedSurfaces: ['Autonomous Agent Engine', 'Definition of Done Gate', 'Web Research Service']
      },
      {
        name: 'GitHub Lifecycle Manager',
        category: 'Backend',
        primaryFiles: ['server/agent/GitHubLifecycleManager.ts'],
        description: 'Git branch management, atomic commits, diff summaries, remote push, and PR metadata generation.',
        relatedSurfaces: ['Autonomous Agent Engine', 'Agent Workspace Manager']
      },
      {
        name: 'Web Research Service',
        category: 'Backend',
        primaryFiles: ['server/agent/WebResearchService.ts'],
        description: 'Controlled server-side internet research via DuckDuckGo and HTML scraper with local IP safety guards.',
        relatedSurfaces: ['Autonomous Agent Engine', 'Gina Agent Workbench']
      },
      {
        name: 'Local LLM Engine Service',
        category: 'Backend',
        primaryFiles: ['server/llm/LocalLlmManager.ts'],
        description: 'Subprocess orchestrator for llama-server CUDA, dynamically managing Qwen 2.5-VL and Qwen 2.5 Coder.',
        engineBindings: ['llama.cpp Windows CUDA', 'Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf', 'qwen2.5-coder-7b-instruct-q5_k_m.gguf'],
        relatedSurfaces: ['Local AI & Qwen Chat', 'Autonomous Agent Engine']
      },
      {
        name: 'ComfyUI Engine Proxy & Workflows',
        category: 'Backend',
        primaryFiles: ['server.ts', 'workflows/wan_video.json', 'workflows/sdxl_juggernaut.json', 'workflows/flux_lite_image.json'],
        description: 'WebSocket and REST bridge to ComfyUI port 8188 with preflight VRAM auto-flush and prompt routing.',
        relatedSurfaces: ['Video Studio', 'Image Studio', 'GIF Studio']
      },
      {
        name: 'Wan 2.1 Diagnostic Suite',
        category: 'Tests',
        primaryFiles: ['scripts/check_wan21.ts'],
        description: 'Comprehensive diagnostic suite testing Wan 2.1 model availability, ComfyUI connectivity, VRAM cage, and Python packages.',
        relatedSurfaces: ['Video Studio', 'ComfyUI Engine Proxy & Workflows']
      },
      {
        name: 'Autonomous Update Integrity Checklist',
        category: 'Documentation',
        primaryFiles: ['docs/AI_UPDATE_CHECKLIST.md'],
        description: 'Mandatory update integrity checklist establishing authoritative platform truth and pre/post edit rules.',
        relatedSurfaces: ['Definition of Done Gate', 'System Milestones & Hardware Sentinel']
      },
      {
        name: 'System Architecture & Documentation Hub',
        category: 'Documentation',
        primaryFiles: ['AGENTS.md', 'README.md', 'docs/INDEX.md', 'docs/architecture/SYSTEM_ARCHITECTURE.md', 'CHANGELOG.md', 'docs/EDIT_REQUESTS.md'],
        description: 'Complete architecture specifications, persistent AI rules, change logs, and active edit requests.',
        relatedSurfaces: ['Definition of Done Gate', 'Express Server & API Routes']
      }
    ];
  }

  public async getProjectMap(): Promise<ProjectMap> {
    if (this.cachedMap) return this.cachedMap;

    const surfaces = this.getCanonicalSurfaces();
    const relationships: Record<string, string[]> = {};
    for (const surface of surfaces) {
      if (surface.relatedSurfaces && surface.relatedSurfaces.length > 0) {
        relationships[surface.name] = surface.relatedSurfaces;
      }
    }

    const projectMap: ProjectMap = {
      version: '1.19.8',
      generatedAt: new Date().toISOString(),
      surfaces,
      relationships
    };

    try {
      await fs.mkdir(path.dirname(this.mapFilePath), { recursive: true });
      await fs.writeFile(this.mapFilePath, JSON.stringify(projectMap, null, 2), 'utf8');
    } catch {
      // Non-fatal if filesystem is temporarily busy
    }

    this.cachedMap = projectMap;
    return projectMap;
  }

  public async findAffectedSurfaces(query: string): Promise<ProjectSurface[]> {
    const map = await this.getProjectMap();
    const q = query.trim().toLowerCase();
    if (!q) return map.surfaces;

    return map.surfaces.filter(s => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchFiles = s.primaryFiles.some(f => f.toLowerCase().includes(q));
      const matchEngines = (s.engineBindings || []).some(e => e.toLowerCase().includes(q));
      const matchRelated = (s.relatedSurfaces || []).some(r => r.toLowerCase().includes(q));
      return matchName || matchDesc || matchFiles || matchEngines || matchRelated;
    });
  }

  public async generateTreeSummary(): Promise<string> {
    const map = await this.getProjectMap();
    const grouped: Record<string, ProjectSurface[]> = {};
    for (const surface of map.surfaces) {
      if (!grouped[surface.category]) grouped[surface.category] = [];
      grouped[surface.category].push(surface);
    }

    let out = 'GINA AI FACTORY — PERSISTENT PROJECT ARCHITECTURE MAP\n';
    out += '====================================================\n\n';

    for (const [category, surfaces] of Object.entries(grouped)) {
      out += `[${category.toUpperCase()}]\n`;
      for (const s of surfaces) {
        out += `  * ${s.name}\n`;
        out += `    Files: ${s.primaryFiles.join(', ')}\n`;
        if (s.engineBindings?.length) {
          out += `    Engines: ${s.engineBindings.join(' | ')}\n`;
        }
        if (s.relatedSurfaces?.length) {
          out += `    Related: ${s.relatedSurfaces.join(' -> ')}\n`;
        }
        out += '\n';
      }
    }

    return out;
  }
}
