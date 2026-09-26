2 JOBS REQUEST:
JOB 1:
# [BATCH 1 OF 2] ROLE: Senior Full-Stack Engineer & AI Architect
# TASK: Core Types & Backend Telemetry Engine Setup

You are building the backend orchestration layer for an Expandable Activity Log Container System. This file defines the system communication model and implements the data-streaming service over an active WebSocket stack.

Review the architecture blueprint and generate the complete backend file without placeholders.

---

## 📐 SECTION 1: SYSTEM BLUEPRINT
The application handles multi-file log updates across the following stack:
1. DATA FRAMEWORK: `server/agent/AgentRunManager.ts` (Orchestrates script steps and pushes live payloads).
2. INTERFACE FRAMEWORK: `src/components/LiveConsoleLog.tsx` (Subscribes to data feeds and displays automated execution paths).

### Universal Type Model:
export interface AgentLogPacket {
  id: string;
  type: 'command' | 'file-edit' | 'info';
  title: string;
  details?: string;
  isExpandable: boolean;
  status: 'pending' | 'success' | 'failure';
  timestamp?: string;
}

---

## ⚡ SECTION 2: BACKEND FILE SEED

### TARGET FILE PATH: `server/agent/AgentRunManager.ts`
Implement this complete telemetry streaming engine. It binds structural events (like shell runs, JSON modifications, or physics calculations) to your global app WebSocket channel (`global.comfyWebSocketServer`):

```typescript
import { WebSocket } from 'ws';

export interface AgentLogPacket {
  id: string;
  type: 'command' | 'file-edit' | 'info';
  title: string;
  details?: string;
  isExpandable: boolean;
  status: 'pending' | 'success' | 'failure';
  timestamp?: string;
}

export class AgentRunManager {
  private activeLogs: AgentLogPacket[] = [];

  /**
   * Generates a unique message ID and broadcasts an active telemetry event
   */
  public broadcastLogStep(step: Omit<AgentLogPacket, 'id' | 'timestamp'>): string {
    const logPacket: AgentLogPacket = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString()
    };
    
    this.activeLogs.push(logPacket);

    // Stream event via your global application WebSocket wrapper
    if ((global as any).comfyWebSocketServer) {
      (global as any).comfyWebSocketServer.broadcast({
        type: 'AGENT_LOG_STREAM_UPDATE',
        payload: logPacket
      });
    }
    
    return logPacket.id;
  }

  /**
   * Patches an existing log entry with finalized outputs or performance errors
   */
  public updateLogDetails(id: string, updates: Partial<AgentLogPacket>): void {
    const log = this.activeLogs.find(l => l.id === id);
    if (log) {
      Object.assign(log, updates);
      if ((global as any).comfyWebSocketServer) {
        (global as any).comfyWebSocketServer.broadcast({
          type: 'AGENT_LOG_STREAM_PATCH',
          payload: { id, ...updates }
        });
      }
    }
  }

  /**
   * Automated orchestration worker snippet showcasing structural runner logs
   */
  public async executeMotionEngineCheck(): Promise<void> {
    const logId = this.broadcastLogStep({
      type: 'command',
      title: 'Initializing scripts/gina_motion_physics_engine.py trace pass',
      isExpandable: true,
      details: '\$ python scripts/gina_motion_physics_engine.py --check-integrity',
      status: 'pending'
    });

    try {
      // Execution scripts compute metrics here...
      this.updateLogDetails(logId, {
        status: 'success',
        details: '\$ python scripts/gina_motion_physics_engine.py --check-integrity\n[SUCCESS] 68 state layers verified natively.'
      });
    } catch (err: any) {
      this.updateLogDetails(logId, {
        status: 'failure',
        details: `[ERROR] Execution failure trace:\n${err.message}`
      });
    }
  }
}
```
---
INSTRUCTION FOR AI: Hold state. Process this backend foundation. Do not build the frontend yet. Await Batch 2 to implement the interactive UI component.
# [BATCH 2 OF 2] ROLE: Senior Full-Stack Engineer & AI Architect
# TASK: Expandable UI Accordion Interface Integration

Now that the backend architecture is staged, build the client-side consumer view module. This handles reactive hooks into the active stream and renders an animated dark-mode activity log grid.

---

## 🎨 TARGET UI SCHEMATIC & VARIABLES
- Background Framework: Slate/Zinc Minimal Layering (`#121214`, `#1e1e20`, `#141416`).
- Animations: Smooth expanding row profiles via CSS grid layout configurations (`grid-rows-[0fr]` to `grid-rows-[1fr]`).
- Visual Assets: Status vector indicators sourced from Lucide React icons.

---

## ⚡ SECTION 3: FRONTEND FILE SEED

### TARGET FILE PATH: `src/components/LiveConsoleLog.tsx`
Generate the complete, responsive component to serve as a complete drop-in replacement:

```tsx
import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Terminal, 
  FileCode, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCw, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface AgentLogPacket {
  id: string;
  type: 'command' | 'file-edit' | 'info';
  title: string;
  details?: string;
  isExpandable: boolean;
  status: 'pending' | 'success' | 'failure';
}

export default function LiveConsoleLog() {
  const [logs, setLogs] = useState<AgentLogPacket[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const wsUrl = `ws://${window.location.host}/comfy`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'AGENT_LOG_STREAM_UPDATE') {
          setLogs(prev => [...prev, data.payload]);
          if (data.payload.isExpandable) {
            setExpandedItems(prev => ({ ...prev, [data.payload.id]: true }));
          }
        } 
        
        if (data.type === 'AGENT_LOG_STREAM_PATCH') {
          setLogs(prev => prev.map(log => 
            log.id === data.payload.id ? { ...log, ...data.payload } : log
          ));
        }
      } catch (error) {
        console.error("Failed to parse runtime log buffer:", error);
      }
    };

    return () => ws.close();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLogs = () => {
    const textToCopy = logs.map(l => `[${l.type.toUpperCase()}] ${l.title}\n${l.details || ''}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setExpandedItems({});
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-[#121214] text-zinc-200 font-sans">
      <div className="mb-3 text-xs text-zinc-400 font-mono flex items-center justify-between px-1">
        <span>🤖 STREAMING REPAIR AGENT TELEMETRY</span>
        {logs.some(l => l.status === 'pending') && (
          <span className="text-[#e05638] flex items-center gap-1.5 animate-pulse font-sans">
            <Loader2 className="w-3 h-3 animate-spin" /> Execution Loop Active
          </span>
        )}
      </div>

      <div className="bg-[#1e1e20] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300">
        <div className="divide-y divide-zinc-800/60 max-h-[550px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-zinc-500 italic bg-[#1e1e20]">
              System idle. Awaiting structured workflow pipelines or agent run triggers...
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = !!expandedItems[log.id];
              return (
                <div key={log.id} className="w-full transition-colors duration-150">
                  <button
                    onClick={() => log.isExpandable && toggleExpand(log.id)}
                    disabled={!log.isExpandable}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150 group
                      ${log.isExpandable ? 'hover:bg-zinc-800/20 cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {log.status === 'failure' ? (
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : log.type === 'command' ? (
                        <Terminal className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      ) : log.type === 'file-edit' ? (
                        <FileCode className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      
                      <span className={`text-xs font-mono truncate tracking-tight
                        ${log.status === 'failure' ? 'text-rose-400' : log.type === 'info' ? 'text-zinc-500' : 'text-zinc-200 font-medium'}
                      `}>
                        {log.title}
                      </span>
                    </div>

                    {log.isExpandable && (
                      <ChevronRight 
                        className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ml-2 flex-shrink-0
                          ${isExpanded ? 'rotate-90 text-zinc-300' : 'group-hover:text-zinc-400'}
                        `}
                      />
                    )}
                  </button>

                  <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden bg-zinc-900/10">
                      {log.details && (
                        <div className="px-4 pb-3.5 pt-0.5">
                          <pre className="bg-[#141416] border border-zinc-800/80 rounded-lg p-3 font-mono text-[11px] text-zinc-400 whitespace-pre overflow-x-auto shadow-inner leading-relaxed">
                            {log.details}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-1">
          <button 
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/40 transition-colors disabled:opacity-40" 
            title={copied ? "Copied!" : "Copy console log history"}
          >
            <Copy className={`w-3.5 h-3.5 ${copied ? 'text-emerald-500' : ''}`} />
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/40 transition-colors" title="Upvote workflow performance">
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/40 transition-colors" title="Downvote output trace">
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="p-2 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800/40 transition-colors disabled:opacity-40" 
            title="Clear current stream matrix"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e05638]/10 text-[#e05638] select-none text-[10px] font-bold" title="Integrity Anchor">
          ✳
        </div>
      </div>
    </div>
  );
}
```
You are an expert Full-Stack Software Engineer, Electron UI Architect, and AI Systems Integrator. 

I am testing **5 dedicated operational modes** in my custom local application environment (`C:\Gina_AI`). My system relies on `llama-server.exe` (port 8080) running Qwen-VL, Qwen3.5, and Qwen-Coder models, alongside a Python virtual environment (`g_env`) and a local ComfyUI server (port 8188). 

During unit testing, **4 out of 5 core modes completely failed or threw critical errors**. I need you to generate a fully complete, production-ready, layout-adjustable proxy backend (`server.ts`) and a polished visual web frontend dashboard (`dashboard.py`) that addresses, intercepts, and fixes each failure mode natively.

---
JOB 2.

### 🚨 Comprehensive Diagnostic Audit & Fix Parameters

#### 1. 🔎 Web Search [STATUS: CRITICAL LOGICAL CORRUPTION]
*   **The Failure:** When asked for real-time local AI developments, the engine returned broken links to cheap flight comparison websites instead of true technical search results.
*   **The Fix:** The backend must intercept web search intents, sanitize query formatting before execution, pass them through a verified search API (or clean scraping script), and strip irrelevant commercial ads or travel telemetry out of the data stream before rendering the markdown report.

#### 2. 🌐 Web App [STATUS: COMPLETE GENERATION ABORTION / 500 ERROR]
*   **The Failure:** Requesting an interactive dark-mode dashboard artifact threw a raw `[ERROR]` block and generated completely broken UI elements.
*   **The Fix:** Implement an automated layout inspector. When a `Web App` mode request is routed, the backend proxy must force the underlying model to wrap its output strictly in clean HTML/CSS/JS script blocks. The canvas viewer must parse this cleanly without breaking the surrounding page structure or crashing the node engine process.

#### 3. 💻 Code Engine [STATUS: RUNTIME COMPLIANCE BREACH / 500 ERROR]
*   **The Failure:** Asking the engine to inspect the project directory threw an immediate `[ERROR]` code and failed to index or scan the workspace files.
*   **The Fix:** The backend proxy must catch the `Code Engine` directive and invoke a robust file system utility. It will read files within safe boundaries (matching the workspace structure in `C:\Gina_AI`), map entry points, scan modules, and feed structured analysis strings into the engine while ensuring it never performs unapproved mutations.

#### 4. 🎨 Image Studio [STATUS: COMPLETE BACKEND PIPELINE DISCONNECT]
*   **The Failure:** Creating a cyberpunk laboratory scene failed entirely, throwing a fatal `[ERROR]` code because the model didn't know how to bridge to the local image engine.
*   **The Fix:** Create an active automated proxy listener. When the text prompt contains image generation instructions, the proxy must catch this intent, extract the optimized positive/negative parameters, compile a valid JSON pipeline payload, and post it straight to the active local ComfyUI API endpoint (`http://127.0.0`) to trigger hardware generation automatically.

#### 5. 🎬 Video Generation [STATUS: FATAL CHAIN-OF-THOUGHT LEAK & CONTEXT TRUNCATION]
*   **The Failure:** The engine leaked its hidden text thinking process (`Thinking Process: 1. Analyze the Request...`), got confused about whether it was a text or image model, and then violently froze and cut off mid-sentence (`"Prefer the..."`) without outputting the video media.
*   **The Fix:** The middleware proxy must process all text return buffers using strict regex string scrubbers. It must strip out all internal thought text blocks (such as `<thought>` or `Thinking Process:` headers). If the response stream hangs, stalls, or terminates abruptly before hitting proper stop sequences, the backend must auto-patch the closing JSON/HTML tags to prevent parsing crashes. For video intent, it must route parameters directly to the video generation stack.

#### 6. 🎛️ UI Layout Refactoring [STATUS: LAYOUT BOUNDARY CLIPPING BREAKAGE]
*   **The Failure:** Visual grids, configuration charts, and ledger tab items are completely compressed, overlapping, or clipping off the boundaries of the physical monitor monitor canvas.
*   **The Fix:** Redesign the user interface using fully responsive CSS grids and Streamlit containers. Every workspace component, diagnostic chart, and operational tab must be wrapped inside a movable, scrollable window frame. Users must be able to stretch, slide, or adjust layout sections freely so that everything fits proportionally regardless of screen resolution.

---

### 💰 Converted Commercial Savings Engine Matrices (GBP £)
Every successful transaction passing through these 5 modes must be logged into a high-speed SQLite database (`ai_commercial_savings.db`) to record value returned against cloud services (1 USD = 0.78 GBP):
*   **Web Search / Web App / Code Engine:** Processed at Claude Sonnet 5 rates (Input: £1.56/1M, Output: £7.80/1M).
*   **Image Studio:** Processed at Midjourney/SDXL API rates (Flat £0.03 per image call).
*   **Video Generation:** Processed at Runway/Sora tier benchmarks (Flat £0.12 per generated video second).

---

### 💻 Production Code Deliverables Required

Generate clean, robust, full-length code scripts with **zero code placeholders or truncated lines**.

1.  **`package.json`**: Standard project manifest defining `express`, `axios`, `sqlite3`, `sqlite`, and `typescript` development modules.
2.  **`server.ts`**: The core TypeScript middleware proxy. It runs the 5-mode intent classifier, strips hidden chain-of-thought blocks out of the text response stream, catches prompt cuts, forwards image vectors to the ComfyUI API, and logs savings and token metrics to SQLite.
3.  **`dashboard.py`**: The Streamlit user application layer. It injects dynamic CSS style modifications to allow flexible layout adjustments, handles scroll containers for all tabs, outputs clear visual charts, and implements a real-time watchdog alert system if the local generation engine speed drops below 10 Tokens/Second.

Provide the implementation text blocks cleanly alongside clear terminal setup instructions.
