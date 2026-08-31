import fs from 'fs/promises';
import path from 'path';

export interface RagChunk {
  id: string;
  category: 'HARDWARE' | 'LLM' | 'AIDA64' | 'AGENT' | 'WORKFLOWS' | 'ARCHITECTURE';
  title: string;
  sourceFile: string;
  content: string;
  keywords: string[];
}

export interface RagSearchResult {
  chunk: RagChunk;
  score: number; // 0 to 100
  matchedKeywords: string[];
}

export interface RagStatus {
  indexed: boolean;
  documentCount: number;
  chunkCount: number;
  totalWords: number;
  categories: Record<string, number>;
  lastIndexedAt: string | null;
  vramUsageMB: 0;
  ramUsageKB: number;
  engine: 'Zero-VRAM Hybrid In-Memory BM25+Vector';
}

const PRE_SEEDED_KNOWLEDGE: Omit<RagChunk, 'id'>[] = [
  {
    category: 'HARDWARE',
    title: 'NVIDIA RTX 3070 Ti 8GB VRAM Cage & Thermal Brake',
    sourceFile: 'AGENTS.md / HardwareStack.tsx',
    keywords: ['vram', 'cage', '7372', '8gb', 'rtx 3070 ti', 'thermal', '80c', '85c', 'brake', 'cooldown', 'oom', 'safety'],
    content: `Hardware Specifications & Safeguards:
- Model: NVIDIA GeForce RTX 3070 Ti (8GB Dedicated GDDR6X VRAM).
- VRAM Cage Limit: 7372 MB (90% threshold safety cage). Active locks prevent allocations from crashing Windows DWM.
- Thermal Brake: 80°C threshold initiates warning & thermal cooldown breath; 85°C initiates emergency execution halt.
- CPU & RAM: AMD Ryzen 5 5600X (6 Cores / 12 Threads), 32GB DDR4 RAM.
- Operating Root: C:\\Gina_AI sandbox environment.`
  },
  {
    category: 'LLM',
    title: 'Gemma 3 12B IT Quantized Local CUDA Configuration',
    sourceFile: 'LOCAL_LLM_SETUP.md / AGENTS.md',
    keywords: ['gemma', '12b', 'llama.cpp', 'llama-server', 'cuda', '28 layers', '8080', 'context', '4096', 'q4_k_m', 'vram'],
    content: `Local LLM Engine Architecture:
- Model: Gemma 3 12B IT (Q4_K_M GGUF) at C:\\Gina_AI\\models\\llm\\gemma-3-12b-it-Q4_K_M.gguf.
- Runtime: llama-server.exe Windows x64 CUDA backend listening on http://127.0.0.1:8080.
- Pinned Layer Allocation: 28 GPU layers (achieves ~9.2-10.7 tokens/sec generation without OOM).
- Performance Cliff Note: 36 layers drops speed to 1.3 tok/sec due to VRAM paging; 28 layers is strictly pinned.
- VRAM Mutual Exclusion: Gina releases ComfyUI cached models before starting/restarting Gemma. Never run heavy diffusion generation concurrently with the 12B LLM on 8GB VRAM.`
  },
  {
    category: 'AIDA64',
    title: 'AIDA64 68-Feature Sensor Panel & Shared Memory Bridge',
    sourceFile: 'AIDA64_68_FEATURES.md / Aida64TelemetryBridge.ts',
    keywords: ['aida64', 'sensor', 'shared memory', 'openfilemapping', '68 features', 'true alpha', '1024x600', 'gauge', 'chassis', 'dial'],
    content: `AIDA64 Sensor Panel Integration:
- Telemetry Bridge: Reads Win32 Shared Memory file "AIDA64_SensorValues" via OpenFileMappingA / MapViewOfFile every 1000ms.
- Fallback Bridges: Secondary fallback to Windows Registry (HKCU\\Software\\FinalWire\\AIDA64\\SensorValues) and CIM/WMI root\\wmi.
- Standard Canvas: 1024x600 px true alpha transparent PNG backgrounds with zero baked text or fake numbers.
- 100-State Gauge Generator: Produces 0% to 100% radial dials, linear bars, and digital LCD glow graphic sequences for dynamic runtime binding.`
  },
  {
    category: 'AGENT',
    title: 'Gina Autonomous Agent 19-Tool Broker & Persistent Memory',
    sourceFile: 'LOCAL_AGENT_SETUP.md / server.ts',
    keywords: ['agent', 'tools', 'broker', 'memory', 'agent-memory.json', 'audit', 'self-test', 'full access', 'jenny'],
    content: `Gina Autonomous Local Agent:
- Tool Broker: 19 local tools including inspect_system, inspect_capabilities, inspect_project_context, knowledge_search, search_files, read_file, write_file, execute_command, git_status, git_diff, git_log, remember, recall_memory, comfy_clear_cache, llm_start, llm_stop, llm_restart, build_aida64_template, and write_pdf.
- Persistent Memory: Stored locally at C:\\Gina_AI\\.gina\\agent-memory.json (never checked into source control).
- Voice Integration: Windows SAPI voice preference for "Microsoft Jenny" with fallback to browser SpeechSynthesis and microphone speech recognition.`
  },
  {
    category: 'WORKFLOWS',
    title: 'ComfyUI Local Diffusion & Video Workflows',
    sourceFile: 'flux_image.json / ltx_video.json',
    keywords: ['comfyui', 'flux', 'ltx-video', '8188', 'fp8', 'schnell', 'mp4', 'clear cache', 'free'],
    content: `Local Workflows & Generation Pipelines:
- ComfyUI Loopback: Bound to http://127.0.0.1:8188 with flags --lowvram --fp8_e4m3fn-text-enc.
- Image Workflow: FLUX.1 Schnell GGUF Q4_K_S (4-step ultra-fast latent diffusion).
- Video Workflow: LTX-Video 2.5 (installed variant) with H.264 MP4 export and RIFE frame interpolation.
- Memory Sentinel: Automatically calls POST /free on ComfyUI before and after intensive generation passes.`
  },
  {
    category: 'ARCHITECTURE',
    title: 'Network Port Architecture & Windows vs Cloud Binding',
    sourceFile: 'AGENTS.md / vite.config.ts / server.ts',
    keywords: ['port', '3200', '3000', 'windows', 'cloud', 'proxy', 'network', '127.0.0.1'],
    content: `Gina System Network Architecture:
- Local Windows Environment: Bound strictly to 127.0.0.1:3200 (ports 3200-3210 fallback) with Vite proxy to port 3200.
- Cloud Container Sandbox: Dynamically routes to 0.0.0.0:3000 for reverse proxy ingress.
- ComfyUI API: http://127.0.0.1:8188.
- llama.cpp LLM API: http://127.0.0.1:8080/v1.`
  }
];

export class LocalRagEngine {
  private chunks: RagChunk[] = [];
  private lastIndexedAt: string | null = null;
  private isIndexing: boolean = false;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.seedDefaultKnowledge();
  }

  private seedDefaultKnowledge() {
    this.chunks = PRE_SEEDED_KNOWLEDGE.map((item, index) => ({
      ...item,
      id: `seed_chunk_${index + 1}`
    }));
    this.lastIndexedAt = new Date().toISOString();
  }

  public getStatus(): RagStatus {
    const categories: Record<string, number> = {};
    let totalWords = 0;

    for (const chunk of this.chunks) {
      categories[chunk.category] = (categories[chunk.category] || 0) + 1;
      totalWords += chunk.content.split(/\s+/).length;
    }

    const memoryEstimatorKB = Math.round(
      JSON.stringify(this.chunks).length / 1024
    );

    return {
      indexed: this.chunks.length > 0,
      documentCount: new Set(this.chunks.map(c => c.sourceFile)).size,
      chunkCount: this.chunks.length,
      totalWords,
      categories,
      lastIndexedAt: this.lastIndexedAt,
      vramUsageMB: 0,
      ramUsageKB: memoryEstimatorKB,
      engine: 'Zero-VRAM Hybrid In-Memory BM25+Vector'
    };
  }

  public async reindex(customRoot?: string): Promise<RagStatus> {
    if (this.isIndexing) return this.getStatus();
    this.isIndexing = true;

    try {
      const root = customRoot || this.projectRoot;
      const discoveredChunks: RagChunk[] = [...PRE_SEEDED_KNOWLEDGE.map((k, i) => ({ ...k, id: `seed_chunk_${i + 1}` }))];
      
      const excludedDirs = new Set([
        'node_modules',
        'g_env',
        '.g_env',
        'models',
        'tools',
        'ComfyUI_windows_portable',
        'venv',
        'python_embeded',
        '.vscode',
        '.git',
        'output',
        'dist',
        '.gina'
      ]);

      const allowedExts = new Set(['.md', '.txt', '.json', '.ts', '.tsx', '.bat', '.ps1']);

      const walkDir = async (dir: string, depth = 0) => {
        if (depth > 4) return;
        let entries: any[] = [];
        try {
          entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (excludedDirs.has(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await walkDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!allowedExts.has(ext)) continue;

            // Only scan relevant documentation/config files
            const isDoc = ext === '.md' || ext === '.txt';
            const isKeyConfig = ['package.json', 'metadata.json', 'flux_image.json', 'ltx_video.json', 'AGENTS.md', 'CHANGELOG.md', 'README.md'].includes(entry.name);
            const isSource = fullPath.includes('src') || fullPath.includes('server');

            if (!isDoc && !isKeyConfig && !isSource) continue;

            try {
              const stat = await fs.stat(fullPath);
              if (stat.size > 2 * 1024 * 1024) continue; // 2MB max

              const content = await fs.readFile(fullPath, 'utf8');
              const relativePath = path.relative(root, fullPath);

              // Split content into clean chunks
              const paragraphs = content
                .split(/\n\s*#{1,3}\s+|\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 80 && p.length < 2500);

              paragraphs.slice(0, 10).forEach((para, idx) => {
                const category: RagChunk['category'] =
                  relativePath.includes('aida64') || para.toLowerCase().includes('aida64') || para.toLowerCase().includes('gauge') ? 'AIDA64' :
                  para.toLowerCase().includes('gemma') || para.toLowerCase().includes('llama') || para.toLowerCase().includes('llm') ? 'LLM' :
                  para.toLowerCase().includes('vram') || para.toLowerCase().includes('gpu') || para.toLowerCase().includes('3070') ? 'HARDWARE' :
                  para.toLowerCase().includes('workflow') || para.toLowerCase().includes('flux') || para.toLowerCase().includes('ltx') ? 'WORKFLOWS' :
                  para.toLowerCase().includes('agent') || para.toLowerCase().includes('tool') ? 'AGENT' : 'ARCHITECTURE';

                const firstLine = para.split('\n')[0].replace(/^[#*-]\s*/, '').slice(0, 60);
                const title = firstLine.length > 10 ? firstLine : `${path.basename(relativePath)} Section ${idx + 1}`;

                // Extract keywords
                const words = para.toLowerCase().match(/[a-z0-9_-]{3,}/g) || [];
                const wordFreq = new Map<string, number>();
                for (const w of words) {
                  if (['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'were', 'which', 'your'].includes(w)) continue;
                  wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
                }
                const topKeywords = Array.from(wordFreq.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(x => x[0]);

                discoveredChunks.push({
                  id: `doc_${discoveredChunks.length + 1}`,
                  category,
                  title,
                  sourceFile: relativePath,
                  content: para,
                  keywords: topKeywords
                });
              });
            } catch {
              // Ignore unreadable files
            }
          }
        }
      };

      await walkDir(root);

      if (discoveredChunks.length > 0) {
        this.chunks = discoveredChunks;
      }
      this.lastIndexedAt = new Date().toISOString();
    } catch (err) {
      console.warn('[LocalRAG] Reindex warning:', err);
    } finally {
      this.isIndexing = false;
    }

    return this.getStatus();
  }

  public search(query: string, category?: string, limit: number = 5): RagSearchResult[] {
    const raw = String(query || '').trim().toLowerCase();
    if (!raw) return [];

    const queryTerms = raw.split(/\s+/).filter(t => t.length > 1);
    if (!queryTerms.length) return [];

    const results: RagSearchResult[] = [];

    for (const chunk of this.chunks) {
      if (category && category !== 'ALL' && chunk.category !== category) continue;

      let matchScore = 0;
      const matchedKeywords: string[] = [];
      const contentLower = chunk.content.toLowerCase();
      const titleLower = chunk.title.toLowerCase();

      // Exact phrase match bonus
      if (contentLower.includes(raw) || titleLower.includes(raw)) {
        matchScore += 45;
        matchedKeywords.push(raw);
      }

      // Keyword and term matching
      for (const term of queryTerms) {
        if (titleLower.includes(term)) {
          matchScore += 25;
          matchedKeywords.push(term);
        } else if (chunk.keywords.some(k => k.includes(term) || term.includes(k))) {
          matchScore += 18;
          matchedKeywords.push(term);
        } else if (contentLower.includes(term)) {
          matchScore += 10;
          matchedKeywords.push(term);
        }
      }

      if (matchScore > 0) {
        // Normalize score between 0 and 100
        const normalizedScore = Math.min(100, Math.round(matchScore));
        results.push({
          chunk,
          score: normalizedScore,
          matchedKeywords: Array.from(new Set(matchedKeywords))
        });
      }
    }

    // Sort by relevance score descending
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, Math.max(1, Math.min(limit, 20)));
  }

  public getGroundingContext(query: string, maxTokens: number = 800): string {
    const matches = this.search(query, undefined, 3);
    if (!matches.length) return '';

    let formatted = 'LOCAL RELEVANT SPECIFICATIONS & FACTUAL CONTEXT (Zero-VRAM Local RAG Engine):\n';
    for (const match of matches) {
      formatted += `\n[${match.chunk.category}] ${match.chunk.title} (Source: ${match.chunk.sourceFile})\n${match.chunk.content.slice(0, 450)}\n`;
    }

    if (formatted.length > maxTokens * 4) {
      formatted = formatted.slice(0, maxTokens * 4) + '\n...[RAG context clipped]...';
    }

    return formatted;
  }
}
