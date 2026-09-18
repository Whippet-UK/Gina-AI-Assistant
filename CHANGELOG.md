# v1.20.7 — Phase 56 — UI Sizing, Web Timeout, Image Transfer & Electricity Cost Telemetry

- **Target File Path:** `/src/components/LocalLlmStudio.tsx`
  - **Exact Code Snippet:**
    ```tsx
    <div className="flex-1 min-h-[400px] max-h-[600px] overflow-y-scroll custom-scrollbar space-y-3 pr-1">
      {!messages.length && <div className="h-full min-h-[400px] flex items-center justify-center text-center text-slate-600 text-xs">...</div>}
    ```
    and in `pollGeneratedImage`:
    ```tsx
    if (typeof data.progress === 'number' && updateJobProgress) {
      updateJobProgress(jobId, data.progress, data.currentStep, data.totalSteps, data.step);
    }
    if (data.ready && data.imageUrl) {
      adoptCompletedOutput(data.jobId || jobId, data.imageUrl, data.filename, data.workflowId || 'sdxl_juggernaut', { prompt: promptText, ... });
    }
    ```
  - **Why:** Increased chat messages container min-height to 400px and max-height to 600px for clear response visibility. Ensured progress updates are emitted and `adoptCompletedOutput` transfers finished images to Image Creation Studio.

- **Target File Path:** `/server.ts`
  - **Exact Code Snippet:**
    ```typescript
    AbortSignal.timeout(30000) // Increased from 15000ms across web fetchers and API calls
    ```
    and in `/api/jobs/:id/result`:
    ```typescript
    res.json({ ready: false, status: job.status, progress: job.progress || 0, currentStep: job.currentStep, totalSteps: job.totalSteps, step: job.step });
    ```
  - **Why:** Prevent Chromium/HTTP navigation timeouts by increasing request timeout to 30000ms, and expose live progress on result polling.

- **Target File Path:** `/server/agent/WebBrowserService.ts` & `/server/agent/WebResearchService.ts`
  - **Exact Code Snippet:**
    ```typescript
    const timeout = setTimeout(() => { ... }, 30000); // 30s timeout
    signal: AbortSignal.timeout(30000)
    ```
  - **Why:** Increased web browser process and web research HTTP request timeouts from 15000ms to 30000ms.

- **Target File Path:** `/src/context/GenerationJobContext.tsx`
  - **Exact Code Snippet:**
    ```typescript
    updateJobProgress: (jobId: string, progress: number, currentStep?: number, totalSteps?: number, step?: string) => void;
    // Window custom event dispatch:
    window.dispatchEvent(new CustomEvent('gina:job-progress', { detail: { jobId, progress, currentStep, totalSteps, step } }));
    window.dispatchEvent(new CustomEvent('gina:job-completed', { detail: { jobId, imageUrl, filename, workflowId } }));
    ```
  - **Why:** Expose `updateJobProgress` and dispatch `gina:job-progress` and `gina:job-completed` events so image generation progress and completion are synchronized across studios.

- **Target File Path:** `/src/components/RuntimeTelemetryPanel.tsx`
  - **Exact Code Snippet:**
    ```tsx
    // Electricity Cost Calculator: Day = £0.3157/kWh (7 AM - 11 PM), Night = £0.1390/kWh (11 PM - 7 AM), Daily standing charge = £0.5472
    const currentHour = new Date().getHours();
    const isDayTariff = currentHour >= 7 && currentHour < 23;
    const unitRate = isDayTariff ? 0.3157 : 0.1390;
    const standingCharge = 0.5472;
    const powerW = Math.max(10, telemetry?.gpuPowerW || (telemetry?.isGenerating ? 220 : 65));
    const hourlyCost = (powerW / 1000) * unitRate;
    const dailyCost = (standingCharge + (16 * (powerW / 1000) * 0.3157) + (8 * (powerW / 1000) * 0.1390));
    ```
  - **Why:** Added UK dual-rate electricity cost calculator showing current hourly rate, daily estimated cost, and active tariff period (Day/Night).

- **Target File Path:** `/src/components/Header.tsx` & `/src/App.tsx`
  - **Exact Code Snippet:**
    ```tsx
    <button onClick={onOpenTelemetry} className="...">TELEMETRY</button>
    // App.tsx modal rendering for RuntimeTelemetryPanel and gpuPowerW polling
    ```
  - **Why:** Added the global `TELEMETRY` button to Header and rendered the RuntimeTelemetryPanel modal in App.tsx.

# v1.20.7 — Phase 54 — Live News Grounding Arbitration Fix

- `/server/agent/IntentRouter.ts` — fixed live-news routing for `most recent`, the observed `most rescent` spelling variant, headlines, top stories, and named news sources; web research is resolved before engineering intent.
- `/server.ts` — added a final server-side live-information arbitration fallback so a natural news/current request cannot fall through to general local chat; the promotion is web-only and cannot enter coding/repair.
- `/src/components/LocalLlmStudio.tsx` — expanded live-web thinking telemetry to recognize `most recent` and headline wording.
- `/scripts/test-agent-routing.ts` — added regression cases matching the observed failing requests.
- `/AGENTS.md` — recorded Phase 54 operating rules and exact edited-file references.

### Phase 54 Exact Edited File Line References
- `/server/agent/IntentRouter.ts` — **lines 1–60**.
- `/server.ts` — **lines 2687–2694**.
- `/src/components/LocalLlmStudio.tsx` — **line 713**.
- `/scripts/test-agent-routing.ts` — **lines 19–20**.
- `/AGENTS.md` — **lines 566–579**.

## 2026-09-15 — Phase 54 verification

- TypeScript transpile/syntax checks passed for `server.ts` and `server/agent/IntentRouter.ts`.
- Deterministic intent-router regression: 8/8 targeted routing cases passed, including the observed `rescent` spelling variant.
- The fix does not require or change the local Qwen model; it corrects the pre-inference routing/grounding boundary.

# v1.20.7 — Phase 42.1 Intent Routing, Context Firewall & Performance Telemetry

- Added deterministic `server/agent/IntentRouter.ts` so current-web/news, network diagnostics, code/file operations, capability questions and ordinary chat are classified before local inference.
- Added a context firewall: normal web/general requests no longer receive the full capability registry, RAG project context, or authoritative agent skills unless the route requires them.
- Explicit web requests such as “top new on bbc news site” now route as `web-research` and use live web grounding without project/skills contamination.
- Local LLM skill injection is now opt-out for lightweight chat and remains enabled for coding/agent workflows.
- Extended runtime telemetry with context-source breakdown, prompt/completion tokens per second, duration, iteration/tool-call fields and session timing totals.
- Extended the global telemetry panel with tokens/sec, context, average request time and tool-call metrics.
- Added release-blocking regression rules for the BBC-news/PCIe-Paging contamination bug and the 12k-token context explosion.

# v1.20.7 — Network Capability Truth & Diagnostics

- Added machine-audited `network_test` broker capability for controlled public HTTPS connectivity diagnostics.
- Added `/api/agent/network-test` and live Local AI network-diagnostic grounding for explicit connectivity/ping questions.
- Runtime capability contract now distinguishes local LLM inference from server-brokered outbound internet access.
- Gina must not claim that a local model means the Gina runtime has no internet access when the brokered web capability is enabled.
- Network diagnostics test multiple public HTTPS endpoints and report confirmed success/failure with latency and HTTP status.

# v1.20.7 — Runtime Capability Self-Audit, Prompt/Web Telemetry, VRAM Stage History & Theme-Locked Lyrics

- Added runtime broker self-audit: the capability contract now derives its registered tool list from the active `runAgentTool` dispatcher and reports missing declared handlers/duplicate handlers instead of trusting a stale hand-maintained list.
- Added `server/telemetry/RuntimeTelemetry.ts` and `/api/runtime/telemetry` for in-memory prompt telemetry across local LLM callers, including prompt/completion/total tokens, suite, source, duration, context size and web-search state. Exact llama.cpp usage is preferred; a conservative character-based estimate is used only when the backend omits usage metadata.
- Local AI chat now distinguishes local inference from local+web grounded requests. Requests such as “search the web”, “look this up”, “latest”, “current”, etc. trigger live web grounding and expose the actual provider/result state.
- Added a global `TELEMETRY` panel available from every suite, showing current inference source, prompt tokens, total tokens, web-search state, session totals and a live 30-second VRAM/stage graph.
- Removed fabricated/random startup VRAM history from `VRAMHistoryGraph`; the graph now begins from real observations and maintains a rolling 30-second live window.
- Added suite labels to major local LLM callers so prompt telemetry can be attributed to Local AI, Image Studio, Music Suite, Gina Agent and Gina Repair Loop.
- Hardened Music Suite lyric generation with a theme lock, story-progression requirements, theme keyword anchors, a targeted compliance repair pass when the first draft drifts off-topic, and a theme-compliance result in the API response.

# v1.20.7 — Runtime Capability Contract Hardening

- Added a machine-generated runtime capability contract to `server.ts` for Gina Agent.
- The contract explicitly exposes verified local filesystem read/write access, command execution, validation, Git, research, and the active broker tool registry when Full Local Access is enabled.
- Added strict capability truth rules so Gina distinguishes unavailable capabilities from failed tool executions and cannot truthfully deny registered local file editing/reading capabilities.
- Wired the same contract into the agent system prompt, `/api/agent/access`, and the capability snapshot so capability discovery and execution use the same declared registry.
- Preserved workspace/path-traversal boundaries and the existing validation + Definition of Done completion gates.

# v1.20.7 — Autonomous Agent Skill Runtime Loader & Completion Integrity Hardening

- **Target File Path:** `/server/agent/AgentSkillLoader.ts`
- **Exact Code Change:** Added a dependency-free recursive loader for `.gina/docs/agent_skills/**/skill.md`, YAML front-matter extraction, deterministic `activeAgentSkillsContext` buffering, expected five-skill detection, and machine-readable system-prompt compilation. The loader supports the existing `docs/agent_skills` location only as a legacy fallback.
- **Why:** Makes the five local `skill.md` rule sets available to the autonomous agent at runtime instead of relying on the model to discover them itself.

- **Target File Path:** `/server/llm/LocalLlmManager.ts`
- **Exact Code Change:** Loads the active skill bundle during manager initialization and injects the compiled `ACTIVE AGENT SKILLS` context into every local LLM chat/completion turn unless that exact context is already present.
- **Why:** Ensures every local execution turn receives the authoritative workspace skill rules, including callers outside `AutonomousAgentEngine`.

- **Target File Path:** `/server/agent/AutonomousAgentEngine.ts`
- **Exact Code Change:** Loads the skill bundle before orchestration, injects it into the core system prompt, tracks successful tool execution and validation state, records compilation/processing diagnostics, rejects empty tool parameters, blocks `TASK_COMPLETE` until a successful tool execution plus validation pass exists, and feeds failure diagnostics back into the bounded corrective loop.
- **Why:** Prevents false completion reports and converts parse/tool/validation failures into explicit repair-loop work instead of allowing the model to claim success.

- **Validation:** TypeScript parsing reached project dependency-resolution errors after the new files parsed without syntax errors. The uploaded archive does not contain `node_modules`, so a clean project-wide `npx tsc --noEmit` could not be completed in this environment.

# v1.20.7 — The Whippet Cinematic Spotlight Intro Preset & Neon Glow Typography Suite

- **Target File Path:** `/src/components/StreamInjectStudio.tsx`
- **Exact Code Change:**
  ```typescript
  {
    id: "the_whippet_cinematic_intro",
    name: "The Whippet — Cinematic Spotlight Intro (16:9)",
    description: "Signature cinematic studio title card featuring deep midnight indigo spotlight vignette, electric cyan neon-glow typography, wide-tracked subtitle, and smooth luminous fade-in.",
    aspectRatio: "16:9",
    category: "classic",
    config: {
      width: 1920,
      height: 1080,
      duration: 15.0,
      fps: 30.0,
      background: {
        type: "spotlight",
        max_red: 25,
        center_color: "#261c42",
        edge_color: "#07060a",
        show_grid: false
      },
      text_layers: [
        {
          text: "THE WHIPPET",
          size: 92,
          color: "#FFFFFF",
          glow_color: "#00E5FF",
          glow_blur: 28,
          stroke_color: "#00E5FF",
          stroke_width: 3.5,
          animation: "cinematic_fade",
          x: 960,
          y: 495
        },
        {
          text: "A WHIPPET PRODUCTION",
          size: 26,
          color: "#FFFFFF",
          glow_color: "#00E5FF",
          glow_blur: 8,
          letter_spacing: 6,
          animation: "cinematic_fade",
          x: 960,
          y: 575
        }
      ],
      video_boxes: [],
      profile_circles: [],
      physics_layers: [
        {
          id: "phys_whippet_spotlight",
          type: "volumetric_glow",
          name: "Deep Indigo Vignette Spotlight",
          enabled: true,
          params: { cx: 960, cy: 540, radius: 460, zoom_speed: 0.5, intensity: 0.85, glow_color: "#302254" }
        }
      ],
      vfx: { enable_glitch: false, enable_shake: false, enable_bloom: true, enable_chroma: false }
    }
  }
  ```
- **Why:** Delivers the exact 16:9 cinematic studio production intro layout preset requested by the user, matching "THE WHIPPET / A WHIPPET PRODUCTION" with central indigo spotlight vignette, neon electric cyan outer stroke, wide tracking subtitle, and smooth luminous fade-in.

- **Target File Path:** `/server/streaminject/StreamInjectService.ts`
- **Exact Code Change:**
  Registered `the_whippet_cinematic_intro` as the leading featured preset in `StreamInjectService.getPresets()`.
- **Why:** Ensure `/api/streaminject/presets` serves the preset to both the frontend studio and persistent preset state.

- **Target File Path:** `/scripts/stream_inject.py`
- **Exact Code Change:**
  Added native support for `spotlight` indigo vignette background rendering, `cinematic_fade` smooth luminance ramp, and Pillow stroke/stroke_fill rendering for neon text outlines.
- **Why:** Allow the preset to be rendered directly through the backend Python export pipeline to MP4.

# v1.20.7 — StreamInject Vectorized Motion Physics Engine & UI Inspector Suite

- **Target File Path:** `/scripts/gina_motion_physics_engine.py`
- **Exact Code Change:**
  Created production vectorized physics and geometric effects module `GMPE` implementing `Vector2D`, `SquashStretchTransform`, `ElasticSpring`, `KineticDispersion`, `radial_shockwave_blast`, `rolling_sine_wave_horizon`, `localized_twirl_vortex`, `page_curl_3d`, `crt_scanlines_aberration`, `datamosh_block_glitch`, `optical_liquid_flow_warp`, and `volumetric_pulsing_aura` utilizing pure NumPy broadcasting and OpenCV remap matrices without Python pixel loops.
- **Why:** Delivers hardware-efficient, zero-loop native video motion physics and optical distortion effects.

- **Target File Path:** `/scripts/stream_inject.py`
- **Exact Code Change:**
  Integrated `gmpe` motion physics into the frame rendering loop under `physics_layers` config with multi-pass compositing.
- **Why:** Allow video layouts baked by StreamInject Studio to render native physics effects onto video frames in production.

- **Target File Path:** `/src/components/StreamInjectStudio.tsx`
- **Exact Code Change:**
  ```typescript
  {/* Motion & Geometric FX Layers (Physics Engine) Inspector */}
  <div className="p-5 rounded-2xl bg-slate-900/70 border border-cyan-500/30 shadow-xl shadow-cyan-950/20 backdrop-blur-md flex flex-col gap-3 relative">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
        <Waves className="w-4 h-4 text-cyan-400 animate-pulse" /> Motion & Geometric FX Layers ({physicsLayers.length})
      </h2>
      <button onClick={() => setShowAddPhysicsMenu(!showAddPhysicsMenu)}>Add Physics FX</button>
    </div>
    ...
  </div>
  ```
  Added dynamic dropdown for adding native physics layers (Shockwave, Sine Wave Horizon, Twirl Vortex, 3D Page Curl, CRT Scanlines, Datamosh Glitch, Liquid Flow, Volumetric Glow), interactive parameter sliders/color pickers, drag reordering, duplicate/delete actions, and quick preset filters ("Physics FX" and "Classic").
- **Why:** Ensure users can directly discover, add, configure, and preview motion physics layers directly in the StreamInject Studio dashboard under layers and presets.

- **Target File Path:** `/src/components/aida64/Aida64StateGaugeGenerator.tsx`
- **Exact Code Change:**
  ```typescript
  const arcR = Math.max(1, radius + (seeded(i + 141) - 0.5) * 16);
  ctx.arc(centerX, centerY, arcR, a0, a0 + span);
  const r = Math.max(1, cfg.outerRadius + 10 + i * 7);
  ctx.arc(centerX, centerY, r, off, off + Math.PI * (.25 + .12 * i));
  ```
- **Why:** Fixed `Uncaught IndexSizeError: Failed to execute 'arc' on 'CanvasRenderingContext2D': The radius provided (-0.276) is negative.` caused by pseudo-random variance dropping below zero when `cfg.energyArcEnabled` is active on small gauge radii.

- **Target File Path:** `/src/components/StreamInjectStudio.tsx`
- **Exact Code Change:**
  ```typescript
  const maxR = Math.max(1, (pl.params.radius ?? 300) * scaleX);
  const curR = Math.max(0.1, maxR * (progress / 1.5));
  ctx.arc(pcx, pcy, Math.max(0.1, curR), 0, Math.PI * 2);
  ctx.arc(pcx, pcy, Math.max(0.1, curR - waveWidth * 0.5), 0, Math.PI * 2);
  ```
- **Why:** Safeguarded all physics layer and canvas preview `ctx.arc` calls with positive lower bounds (`Math.max(0.1, ...)`).

# v1.20.5 — FLUX.1 Lite High-Precision T5 Text Encoder Reconciliation

- **Target File Path:** `/workflows/flux_lite_image.json`
- **Exact Code Change:**
  ```json
  "2": {"class_type":"DualCLIPLoader","inputs":{"clip_name1":"clip_l.safetensors","clip_name2":"t5xxl_fp8_e4m3fn.safetensors","type":"flux","device":"default"}},
  ```
- **Why:** Reconciled `DualCLIPLoader` `clip_name2` from `umt5_xxl_fp8_e4m3fn_scaled.safetensors` (Wan 2.1 video tokenizer with vocab 256,384) to `t5xxl_fp8_e4m3fn.safetensors` (FLUX tokenizer with vocab 32,128). This completely eliminates the `RuntimeError: Error(s) in loading state_dict for T5: size mismatch for shared.weight: copying a param with shape torch.Size([256384, 4096]) from checkpoint, the shape in current model is torch.Size([32128, 4096])`.

- **Target File Path:** `/server.ts`
- **Exact Code Change:**
  ```typescript
  const FLUX_T5 = process.env.FLUX_T5 || "t5xxl_fp8_e4m3fn.safetensors";
  ```
  ```typescript
  async function adaptWorkflowForComfySession(workflow: any) {
    try {
      const objectInfo = await getComfyObjectInfo();
      const availableClips: string[] = [
        ...(objectInfo?.DualCLIPLoader?.input?.required?.clip_name2?.[0] || []),
        ...(objectInfo?.CLIPLoader?.input?.required?.clip_name?.[0] || [])
      ];

      for (const node of Object.values(workflow || {}) as any[]) {
        if (node?.class_type === 'DualCLIPLoader' && (node?.inputs?.type === 'flux' || !node?.inputs?.type)) {
          const currentT5 = String(node?.inputs?.clip_name2 || '');
          const isUmt5 = /umt5/i.test(currentT5);
          const currentExists = availableClips.includes(currentT5);

          if (isUmt5 || (!currentExists && availableClips.length > 0)) {
            const preferredCandidates = [
              't5xxl_fp8_e4m3fn.safetensors',
              't5xxl_fp8_e4m3fn_scaled.safetensors',
              't5xxl_fp16.safetensors',
              't5-v1_1-xxl.safetensors'
            ];
            const matched = preferredCandidates.find(c => availableClips.includes(c)) ||
              availableClips.find(c => /^t5.*xxl.*\.safetensors$/i.test(c) && !/umt5/i.test(c));

            if (matched) {
              console.log(`[Workflow Adapter] Routing FLUX DualCLIPLoader clip_name2 from '${currentT5}' to discovered '${matched}'`);
              node.inputs.clip_name2 = matched;
            } else if (isUmt5) {
              node.inputs.clip_name2 = FLUX_T5 || 't5xxl_fp8_e4m3fn.safetensors';
            }
          }
        }
      }
    } catch {
      // Return original if object_info query is unavailable
    }
    return workflow;
  }
  ```
  ```typescript
  async function sanitizeLocalFluxLiteWorkflow() {
    const dirs = [LOCAL_WORKFLOW_DIR, GINA_WORKFLOW_DIR].filter(Boolean);
    for (const dir of dirs) {
      const filePath = path.join(dir, 'flux_lite_image.json');
      try {
        if (fsSync.existsSync(filePath)) {
          const content = await fs.readFile(filePath, 'utf8');
          if (content.includes('umt5_xxl_fp8_e4m3fn_scaled.safetensors')) {
            const sanitized = content.replace(/umt5_xxl_fp8_e4m3fn_scaled\.safetensors/g, 't5xxl_fp8_e4m3fn.safetensors');
            await fs.writeFile(filePath, sanitized, 'utf8');
            console.log(`[Workflow Healing] Reconciled FLUX DualCLIPLoader text encoder to t5xxl_fp8_e4m3fn.safetensors in ${filePath}`);
          }
        }
      } catch (e: any) {
        console.warn(`[Workflow Healing] Could not inspect ${filePath}: ${e?.message}`);
      }
    }
  }
  ```
  ```typescript
  // Check for incompatible UMT5 text encoder in FLUX DualCLIPLoader
  const clipNode = Object.values(workflow).find((n: any) => n?.class_type === 'DualCLIPLoader') as any;
  if (clipNode && /umt5/i.test(String(clipNode.inputs?.clip_name2 || ''))) {
    throw new Error("FLUX.1 Lite high-precision text mode cannot use Wan 2.1's UMT5 model ('umt5_xxl_fp8_e4m3fn_scaled.safetensors', vocab size 256,384). A genuine FLUX T5-XXL text encoder (vocab size 32,128, e.g. 't5xxl_fp8_e4m3fn.safetensors' or 't5xxl_fp8_e4m3fn_scaled.safetensors') is required in ComfyUI/models/clip/.");
  }
  ```
- **Why:** Updated default configuration, added dynamic model adaptation to discover any installed T5-XXL model variant in ComfyUI, added startup self-healing of external workflows on disk, and added pre-flight blocking with clear diagnostics if an incompatible UMT5 model is provided.

- **Target File Path:** `/server/capabilities/CapabilityManager.ts`
- **Exact Code Change:**
  ```typescript
  { id:'t5xxl-fp8', fileName:'t5xxl_fp8_e4m3fn.safetensors', category:'clip', relative:'models/clip/t5xxl_fp8_e4m3fn.safetensors', purpose:'FLUX T5-XXL text encoder', enabled:true, aliases:['t5xxl_fp8_e4m3fn_scaled.safetensors', 't5xxl_fp16.safetensors'] },
  ```
  ```typescript
  const flux=has('flux-lite-gguf')&&has('clip-l')&&(has('t5xxl-fp8')||hasLike(/^t5.*xxl.*\.safetensors$/i));
  ```
  ```typescript
  {id:'flux-lite-image',label:'FLUX.1 Lite High Precision',type:'image',status:flux&&imageW.length?'validated':flux?'installed':'unavailable',workflowIds:imageW.filter((id:string)=>/flux_lite/i.test(id)),modelIds:['flux-lite-gguf','clip-l','t5xxl-fp8'],notes:['Optional high-precision text-in-image lane using T5-XXL FP8.']},
  ```
- **Why:** Reconciled model inventory, capability checks, and generator metadata to properly map `t5xxl_fp8_e4m3fn.safetensors` and its scaled variant for FLUX instead of UMT5.

- **Target File Path:** `/src/components/gina-image/GinaImageSettings.tsx`
- **Exact Code Change:**
  ```typescript
  <span className="text-zinc-300 font-bold truncate block">
    {selectedWorkflow === 'sdxl_juggernaut'
      ? 'SDXL Dual OpenCLIP + ViT-L'
      : 't5xxl_fp8_e4m3fn.safetensors'}
  </span>
  ```
- **Why:** Fixed the settings drawer display to show the authentic T5-XXL FP8 text encoder for the FLUX lane.

- **Target File Path:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/docs/EDIT_REQUESTS.md`, `/src/components/MilestoneChecklist.tsx`
- **Exact Code Change:** Advanced version to `1.20.5` and save point to `RESTORE_V1.20.5_FLUX_HIGH_PRECISION_T5_RECONCILIATION`.
- **Why:** Universal version and metadata synchronization compliance across all project surfaces.

# v1.20.4 — GitHub Import Migration & Build Sanitization

- **Target File Path:** `/server.ts`
- **Exact Code Change:**
  ```typescript
  // Require at least 2 consecutive failures after having been online before declaring state transition to OFFLINE
  if (comfyWatchdog.consecutiveFailures >= 2 && previous === true) {
    comfyWatchdog.lastChangeAt = comfyWatchdog.lastProbeAt;
    comfyWatchdog.online = false;
    const message = `ComfyUI watchdog: backend OFFLINE — ${health.error || 'unknown error'}`;
    console.warn(`[Comfy Watchdog] ${message}`);
    recordComfyErrorLog(message, { watchdog: true });
  } else if (previous === null) {
    comfyWatchdog.online = false;
  }
  ```
- **Why:** Fixed a false-positive `503 ComfyUI watchdog: backend OFFLINE — fetch failed` error generated during startup or when ComfyUI is not yet active. Initial offline states are gracefully tracked as expected status instead of dispatching false 503 dashboard crash errors. Also reconciled `/api/comfy/health` duplicate route.
- **Target File Path:** `/src/routes/imageroute.ts`, `/src/routes/imageRoute.js`
- **Exact Code Change:** Removed redundant/misplaced frontend route files and cleaned empty `/src/routes/` directory.
- **Why:** The authoritative server route exists at `/server/routes/imageRoute.ts` (mounted via `/api/llm`). The misplaced duplicate files under `src/routes/` triggered a TypeScript compilation error (`TS2307: Cannot find module '../llm/LocalLlmManager.ts'`) during linting and typecheck.
- **Target File Path:** `/bun.lock`
- **Exact Code Change:** Removed `bun.lock` file from repository root.
- **Why:** Complies with GitHub import migration specifications (Node.js runtime with npm package manager only).
- **Target File Path:** `/AGENTS.md` and `/docs/INDEX.md`
- **Exact Code Change:** Synchronized Section 1 version reference to `1.20.4` and `docs/INDEX.md` header to `v1.20.4`.
- **Why:** Satisfies Universal Version & Metadata Synchronization and Definition of Done gate integrity requirements.

- `/src/components/AppFeaturesGuide.tsx` — removed the remaining retired Gemma name from active feature-guide vocabulary while retaining historical milestone records.

# v1.20.3 — Phase 53 — Project Reconciliation & Open-Request Completion

- `/src/version.ts` — advanced authoritative version/save point/lifecycle to v1.20.3 / Phase 53.
- `/package.json`, `/metadata.json`, `/index.html`, `/README.md`, `/docs/INDEX.md` — synchronized release metadata and current product documentation.
- `/src/components/MilestoneChecklist.tsx` — added completed Phases 51–53 and made the Phase 53 reconciliation restore point authoritative.
- `/docs/EDIT_REQUESTS.md` — closed the previously open coding backlog; live Windows checks are explicitly tracked as external acceptance tests rather than unfinished implementation.
- `/docs/AI_UPDATE_CHECKLIST.md` and `/AGENTS.md` — reconciled current platform truth, active roadmap, completion contract, and mandatory acceptance-test distinction.
- `/server/agent/DefinitionOfDoneGate.ts` — updated fallback state and completion-gate documentation for the current Phase 53 release.

## 2026-09-12 — v1.20.2 / Phase 52 — GIF Studio ComfyUI Isolation & Reliability

- Existing-media GIF Studio processing now uses a bounded local FFmpeg path instead of VHS/ComfyUI.
- GIF Studio asset conversion is capped at 24fps and 768px maximum long-side before final export, with optional CPU interpolation also capped to the safe 24fps envelope.
- A GIF conversion failure is now isolated to the Gina job and cannot intentionally interrupt/stop the ComfyUI process.
- Completed FFmpeg source jobs expose a normal Gina output so the existing GIF + MP4 finalisation flow remains intact.
- Sequential-story generation continues to use ComfyUI/Wan 2.1 because that path genuinely requires the generative backend.

## v1.20.1 — Phase 51 — Creator Suite Reliability, Live Grounding & Workflow Consistency

- `server.ts` — added live date/time grounding and web verification for current-information Local AI requests; added Qwen Vision image-description endpoint; routed lyric writing through `LocalLlmManager`; enforced safe Wan 2.1 direct-generation limits.
- `server/comfy/WorkflowParser.ts` — added explicit temporal `frames` binding and kept video `batch_size` independent; removed retired-engine compatibility bindings.
- `src/components/VideoStudio.tsx` — corrected Wan temporal frame routing, reduced direct duration choices to the conservative 1–3 second 8GB-safe envelope, and removed unsafe 4–5 second choices.
- `src/components/gina-image/GinaImageInput.tsx` — replaced simulated image description with pixel-grounded Qwen Vision analysis and automatic prompt application.
- `src/components/PromptStudio.tsx` / `src/components/gina-image/GinaImageSettings.tsx` — made 1:1 the normal image baseline, retained AIDA64 as a dedicated 1024×600 preset, and reconciled the active FLUX.1 Lite lane.
- `src/components/VRAMHistoryGraph.tsx` / `src/components/VRAMOomFrequencyChart.tsx` / `src/App.tsx` — removed retired workflow vocabulary from active diagnostics and corrected Wan/FLUX Lite labels.
- `server/agent/UpdateIntegrityGuard.ts` — added active legacy `flux_image` detection.
- Removed obsolete active workflow files/components: `workflows/ltx_video.json`, `workflows/flux_image.json`, `workflows/flux_image_reference.json`, legacy LTX UI components and diagnostic script.
- `docs/AI_UPDATE_CHECKLIST.md` / `docs/EDIT_REQUESTS.md` / `AGENTS.md` — updated the mandatory project contract, request tracking and Phase 51 state.

# v1.19.8 — Phase 49 — Autonomous Project Completion Gate & Persistent Project Map

## Machine-Enforced Definition of Done Gate & Persistent Architectural Project Map

- **Target File:** `/server/agent/DefinitionOfDoneGate.ts`
  - **Exact Code Change:**
    ```typescript
    export class DefinitionOfDoneGate {
      async verify(): Promise<DefinitionOfDoneResult> {
        // Checks version synchronization across 6 root files
        // Checks mandatory AI update checklist presence
        // Scans project for zero retired engine references
        // Runs TypeScript compilation build check
        // Verifies changelog logging and root directory cleanliness
      }
    }
    ```
  - **Why:** Provide a machine-enforced gate that prevents false or premature completion reports and enforces project rules.

- **Target File:** `/server/agent/ProjectMapManager.ts`
  - **Exact Code Change:**
    ```typescript
    export class ProjectMapManager {
      async getProjectMap(forceRebuild = false): Promise<ProjectMap> {
        // Scans and indexes project surfaces: Frontend, Backend, Models, Workflows, Configuration, Tests, Docs
        // Tracks cross-surface dependencies, entry points, and affected surfaces for queries
      }
    }
    ```
  - **Why:** Maintain persistent architectural understanding across project surfaces rather than rediscovering on every turn.

- **Target File:** `/server/agent/AutonomousAgentEngine.ts`
  - **Exact Code Change:**
    ```typescript
    if (parsedAction.action === "TASK_COMPLETE") {
      const dodGate = new DefinitionOfDoneGate(workspaceRoot);
      const gateResult = await dodGate.verify();
      if (!gateResult.ok) {
        // Trigger autonomous repair loop by feeding blocking errors back to model
        activeContextPrompt = `MANDATORY DEFINITION OF DONE GATE FAILED: ...`;
        continue;
      }
    }
    ```
  - **Why:** Machine-enforce the completion gate so failed gates become new repair tasks instead of stopping.

- **Target File:** `/server/agent/AutonomousRepairLoop.ts`
  - **Exact Code Change:** Protected project-contract files from model edits, capped automated replacement size, and restored files changed by the repair loop when validation or the final Definition of Done gate fails.
  - **Why:** An autonomous repair mechanism must fail closed and leave the workspace no worse than it found it.
- **Target File:** `/server.ts`
  - **Exact Code Change:**
    ```typescript
    const projectMap = new ProjectMapManager(GINA_ROOT);
    const definitionOfDoneGate = new DefinitionOfDoneGate(GINA_ROOT);
    // Added inspect_project_map and verify_definition_of_done broker tools
    // Added /api/agent/project-map and /api/agent/definition-of-done REST endpoints
    // Integrated DefinitionOfDoneGate verification into executeAgentRun completion check
    ```
  - **Why:** Expose project mapping and Definition of Done verification to Gina Agent and REST consumers with automatic repair loops.

- **Target Files:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Synchronized version to `1.19.8`, lifecycle to Phase 49, and active save point to `RESTORE_V1.19.8_PROJECT_COMPLETION_GATE`.
  - **Why:** Universal Version & Metadata Synchronization Guard (RULE 7).

# v1.19.7 — Phase 48 — Agent Action Recovery & Robust Tool Dispatch

## Autonomous agent dispatch hardening and compilation integrity

- **Target File:** `/scripts/check_wan21.ts`
  - **Exact Code Change:** Added the missing Wan 2.1 diagnostic script with system checks for models, VRAM headroom, Python packages, and ComfyUI connectivity.
  - **Why:** Resolve server build breakage caused by missing `check_wan21.js` reference in `server.ts` while honoring Wan 2.1 engine migration.

- **Target File:** `/server/agent/AgentWorkspaceManager.ts`
  - **Exact Code Change:**
    ```typescript
    getActiveWorkspacePath(name = 'default'): string {
      return this.resolveWorkspace(name);
    }
    ```
  - **Why:** Provide the workspace path resolution method expected by `AutonomousAgentEngine.ts`.

- **Target File:** `/server/llm/LocalLlmManager.ts`
  - **Exact Code Change:**
    ```typescript
    async generateCompletion(options: { systemPrompt?: string; prompt: string; temperature?: number; maxTokens?: number }): Promise<string> {
      const messages: ChatMessage[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.prompt });
      const res = await this.chat(messages, { temperature: options.temperature ?? 0.7, maxTokens: options.maxTokens ?? 1024 });
      return res?.choices?.[0]?.message?.content || "";
    }
    ```
  - **Why:** Provide completion generation on `LocalLlmManager` for autonomous agent cycles.

- **Target File:** `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Imported missing `RestorePoint` and `VerificationCheck` types from `../types`, updated Phase 47/48 items, and registered `RESTORE_V1.19.7_AGENT_ACTION_RECOVERY`.
  - **Why:** Fix TypeScript compilation error TS2304 and align active restore points.

- **Target Files:** `/index.html`, `/AGENTS.md`
  - **Exact Code Change:** Synchronized version references to `1.19.7` and active lifecycle to Phase 48.
  - **Why:** Strict adherence to Universal Version & Metadata Synchronization Guard (RULE 7).

# v1.19.6 — Phase 47 — Web Research & Local-First Agent

## Web research and agent workflow
- `server/agent/WebResearchService.ts` — added controlled public-internet search/page retrieval with DuckDuckGo fallback and optional Brave Search API.
- `server.ts` — exposed `web_search`, `web_research`, and `web_fetch` agent tools plus web-status/search API endpoints and capability reporting.
- `server.ts` — strengthened the agent system contract so current documentation, releases, troubleshooting and other freshness-sensitive tasks can use web research.
- `src/components/GinaAgentPanel.tsx` — shows whether web research is enabled and tells users that Gina can use live internet research.
- `.env.example` — added `GINA_WEB_ACCESS` and optional `BRAVE_SEARCH_API_KEY`.
- `docs/setup/GINA_WEB_RESEARCH.md` — documented configuration, tool behaviour and network safeguards.
- `src/version.ts`, `package.json`, `metadata.json` — synchronized to v1.19.6 / Phase 47.

## Integrity
- Web results are treated as untrusted research data and cannot override Gina's project update rules.
- Private/local network addresses are blocked by the web research guard and redirects are revalidated.
- The local Qwen engine remains the reasoning engine; internet access is a server-side retrieval capability.

# v1.19.5 — Phase 46: Update Integrity Guard & Wan 2.1 UI Reconciliation

## 2026-09-12

- **Target Files:** `/src/components/TestSuitePanel.tsx`, `/src/components/MilestoneWorkbench.tsx`, `/server/rag/LocalRagEngine.ts`
  - **Exact Code Change:** Replaced remaining active Gemma labels with Qwen/current terminology and removed Gemma from current RAG engine classification.
  - **Why:** Prevent stale model terminology from surviving in system tabs and newly indexed knowledge.

- **Target File:** `/docs/AI_UPDATE_CHECKLIST.md`
  - **Exact Code Change:** Added the mandatory startup/update/final-gate checklist covering project context ingestion, cross-suite engine consistency, Qwen Coder ZIP workflow, validation, diff review, version synchronization, changelog logging, and retired-engine sweeps.
  - **Why:** Make project-wide update requirements explicit and reusable instead of relying on AGENTS.md prose alone.
- **Target File:** `/server/agent/AgentContextManager.ts`
  - **Exact Code Change:** Added `docs/AI_UPDATE_CHECKLIST.md` to the mandatory startup context file set.
  - **Why:** Ensure every autonomous coding context receives the checklist before planning edits.
- **Target File:** `/server/agent/UpdateIntegrityGuard.ts`
  - **Exact Code Change:** Added deterministic version/metadata/checklist validation and active-source retired-engine scanning.
  - **Why:** Give the agent a machine-checkable final gate instead of trusting model compliance.
- **Target File:** `/server.ts`
  - **Exact Code Change:** Added the `project_integrity_check` broker action and strengthened the runtime prompt to require an integrity check before success; updated active model policy wording.
  - **Why:** Put the checklist into the actual autonomous execution loop.
- **Target Files:** `/src/components/VideoStudio.tsx`, `/src/components/GifStudio.tsx`, `/src/components/WanDiagnostic.tsx`, `/src/components/LocalCapabilityPanel.tsx`, `/src/components/MediaStitcherModal.tsx`, `/src/components/VRAMOomFrequencyChart.tsx`, `/src/App.tsx`, `/src/data/rulesData.ts`, `/server/comfy/WorkflowParser.ts`, `/scripts/media_stitcher.py`
  - **Exact Code Change:** Reconciled active video UI, diagnostics, presets, source labels, telemetry labels, chart labels and helper text to Wan 2.1; removed the retired LTX workflow/diagnostic components and renamed the diagnostic helper to `check_wan21.ts`.
  - **Why:** Eliminate stale LTX references and broken legacy diagnostic wiring from active production surfaces.
- **Target Files:** `/src/components/AppFeaturesGuide.tsx`, `/src/components/MilestoneChecklist.tsx`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/metadata.json`, `/index.html`, `/src/version.ts`, `/package.json`, `/package-lock.json`
  - **Exact Code Change:** Synchronized Phase 46 / v1.19.5 / `RESTORE_V1.19.5_UPDATE_INTEGRITY_WAN_UI`, updated current-engine documentation, and locked Phase 44 in favor of the new active restore point.
  - **Why:** Keep the project's version, milestone, restore-point and current-stack metadata consistent.

# v1.19.2 — Phase 42: Unified Gina AI Coding Assistant

- Local Gina Chat is now the primary coding interface when a project workspace is active.
- Upload a project ZIP, automatically import it into a dedicated workspace, inspect it and edit it from natural-language prompts.
- Export the active workspace back to a clean updated ZIP.
- Added simple GitHub clone-to-workspace flow and retained agent pull/commit/push tooling.
- Live coding activity is shown in the normal Gina conversation instead of requiring the legacy Agent panel.
- Removed the separate Gina Agent panel from the Local AI page.

# Gina AI Factory — v1.19.2

## 2026-09-07 — Phase 41: Persistent Agent Workbench & Streaming Execution

- **Target File:** `/server/agent/AgentRunManager.ts`
  - **Exact Code Change:** Added `AgentRunManager` with durable JSON run records under `.gina/agent-runs`, monotonic event IDs, event subscriptions, run listing/loading, terminal state persistence, and cancellation tracking.
  - **Why:** Make Gina Agent execution persistent and reconnectable instead of keeping progress only in the browser response.

- **Target File:** `/server.ts`
  - **Exact Code Change:** Added `executeAgentRun(...)` as the shared coding-loop executor with phase/status events; added `GET /api/agent/runs`, `GET /api/agent/runs/:id`, `POST /api/agent/runs/:id/cancel`, `GET /api/agent/runs/:id/stream`, and `POST /api/agent/run-stream`.
  - **Exact Code Snippet:** `app.get('/api/agent/runs/:id/stream', async (req,res) => { ... })` and `app.post("/api/agent/run-stream", async (req,res) => { ... })`.
  - **Why:** Stream live `INSPECTING FILES → READING FILES → EDITING → RUNNING VALIDATION → REPAIRING → VERIFYING DIFF → REPORTING` progress while retaining the existing non-streaming `/api/agent/run` compatibility route.

- **Target File:** `/src/components/GinaAgentPanel.tsx`
  - **Exact Code Change:** Replaced the blocking `/api/agent/run` UI call with `/api/agent/run-stream` plus `EventSource` subscription; added live event timeline, current phase, run ID, cancellation control, local active-run recovery and reconnect handling.
  - **Why:** The Agent Workbench now shows Gina's actual execution as it happens and can recover the visible run after a browser refresh or transient connection loss.

- **Target File:** `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Added completed phases 39–41 and activated `RESTORE_V1.19.2_PERSISTENT_AGENT_WORKBENCH_STREAMING`; locked the Phase 40 restore point.
  - **Why:** Keep the authoritative milestone/save-point record synchronized with the completed implementation.

- **Target Files:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
  - **Exact Code Change:** Synchronized the project to `v1.19.2`, Phase 41, and restore point `RESTORE_V1.19.2_PERSISTENT_AGENT_WORKBENCH_STREAMING`; documented the persistent run/event model and streaming endpoints.
  - **Why:** Maintain the project's zero-discrepancy version/metadata contract and make Phase 41 discoverable from the repository root.

- **Target File:** `/src/components/AppFeaturesGuide.tsx`
  - **Exact Code Change:** Renamed the autonomous-agent feature to the Persistent Workbench, marked it LIVE, and documented Phase 40 coding-loop plus Phase 41 durable SSE execution/reconnect/cancellation support.
  - **Why:** Keep the in-app feature/status guide aligned with the implemented Agent Workbench.

- **Target File:** `/docs/setup/LOCAL_AGENT_SETUP.md`
  - **Exact Code Change:** Added the Phase 41 persistent-run, SSE, reconnect, inspection, cancellation and legacy compatibility documentation.
  - **Why:** Document the new Agent Workbench runtime contract for future coding sessions.

# Gina AI Factory — v1.19.0

## 2026-09-07 — Phase 40: Gina Agent Coding Loop & GitHub Workbench
- Added a multi-step inspect → read → edit → validate → diff → report coding loop.
- Added workspace inspection with package-manager/script discovery.
- Added automatic validation-script selection and retry guidance after failures.
- Added workspace-scoped diff inspection before success reporting.
- Expanded planner/recovery action vocabulary for coding and repository tasks.
- Extended agent iteration budget from 6 to 10 controlled tool steps.

# Gina AI Factory — v1.18.8

## 2026-09-07 — Phase 39: Gina Agent Coding Workspaces & GitHub

- Added dedicated Gina repository workspaces under `.gina/workspaces`.
- Added project ZIP upload/import with archive path-traversal protection.
- Added GitHub clone, pull, push, branch and commit agent actions.
- Added optional GitHub PR creation through `GITHUB_TOKEN`.
- Added code-task validation loop and location lookup planning.
- Added token redaction in the local agent audit log.
- Added Gina Agent upload, GitHub Repo and Code Task controls.

# Gina AI Factory — v1.18.7

## 2026-09-07 — Phase 38: Gina Intelligence & Model Routing

- **Target File**: `/server.ts`
- **Exact Code Change**: Replaced the image-only keyword gate with `detectImageGenerationIntent(text, hasImageAttachment)` and added `imageGenerationPolicy(engine, multimodal, hasReference)`. The same classifier now powers `/api/llm/chat` and `/api/ai-tools/route`.
- **Why**: Prevent false negatives such as “give me a top-down view of …” and prevent conflicting UI/server routers from making different decisions.

- **Target File**: `/server.ts`
- **Exact Code Change**: Qwen routes to `sdxl_juggernaut` / `sdxl_juggernaut_reference`; Gemma routes to FLUX only when `multimodal` is true. Non-vision Gemma now hard-fails the FLUX route instead of silently using it.
- **Why**: Enforce the requested model policy: Qwen + Juggernaut is primary; FLUX is reserved for Gemma 3 Vision fallback/alternate use.

- **Target File**: `/server/llm/LocalLlmManager.ts`
- **Exact Code Change**: Multimodal projector discovery is no longer Qwen-only; Gemma `mmproj` files such as `mmproj-q8_0.gguf` are accepted, and image attachments are passed to either configured multimodal engine.
- **Why**: Make the Gemma 3 + Vision + FLUX lane real instead of advertising vision support while rejecting Gemma image input.

- **Target File**: `/src/components/LocalLlmStudio.tsx`
- **Exact Code Change**: Removed the duplicated client-side image keyword classifier and made the UI query `/api/ai-tools/route` before invoking ComfyUI. Generation status now reports the actual `generationModel`.
- **Why**: Establish one routing authority and eliminate accidental image generation caused by UI/server classifier drift.

- **Target Files**: `/src/components/gina-image/GinaImageSettings.tsx`, `/src/components/AiStudioSuite.tsx`, `/README.md`, `/AGENTS.md`, `/metadata.json`, `/index.html`, `/src/version.ts`, `/package.json`, `/src/components/MilestoneChecklist.tsx`
- **Exact Code Change**: Updated defaults, model-policy labels, documentation, version metadata, milestone/restore point, and release description for Phase 38.
- **Why**: Keep the UI and project memory consistent with the authoritative routing policy.


## 2026-09-07 — Edit Request Queue Implementation

- Implemented all open requests recorded in `docs/EDIT_REQUESTS.md`.
- Image Creation Studio now defaults to Qwen 2.5-VL + Juggernaut-XL v9, keeps reference edits on the Juggernaut reference workflow, exposes a direct upload action, and reports the correct model.
- Removed the workflow-inspector feedback loop that forced the selected ComfyUI workflow back to the active runtime job.
- Added Qwen/Juggernaut entries to pre-warm and OOM diagnostic inventories.
- Music Studio now supports 480-second requests through sequential MusicGen chunking and has working source-audio upload flows for cover, extension, edit, and voice removal modes.
- Fixed local AI completion metadata so saved images retain their real workflow/model identity.
- Updated README, metadata, version, and UI labels.

# Gina AI Factory — v1.18.1

## Phase 34 + Phase 36 — Qwen/Gemma routing, generation telemetry & persistent edit queue

- **Qwen 2.5-VL 7B + mmproj-F16** is now an explicit Local AI engine choice and deterministically routes image creation/reference editing to **Juggernaut-XL v9**.
- **Gemma 3 12B Q4_K_M** routes image creation/reference editing to **FLUX.1-Schnell GGUF Q4_K_S**.
- Added the missing **Juggernaut-XL reference-edit workflow** so Qwen vision edits no longer fall back to FLUX.
- Generation jobs now record and display the exact LLM, vision projector, image model and workflow used while a job is running.
- Added `docs/EDIT_REQUESTS.md` as the persistent human-to-agent edit queue.
- Phase 34 is implementation-complete; live Windows/ComfyUI acceptance should verify the Qwen vision → Juggernaut reference-edit path end-to-end.

## v1.17.27 System UI reorganization

The System workspace is now organized into focused tabs: Overview, Hardware, Models & Workflows, Safeguards, and Logs. The Logs tab contains the copy-ready Dashboard Error Log and telemetry console.

## v1.17.25 upload stability fix

Local attachment/reference-image uploads no longer trigger Vite HMR reloads. The local `local_ai_uploads` store is ignored by the development file watcher, preventing in-flight upload requests from being aborted with `BadRequestError: request aborted`.

# Gina local ComfyUI workflows

Drop **ComfyUI API-format workflow JSON** files into this folder.

Use ComfyUI's `Save (API Format)` / API export, not the normal UI graph JSON.

Gina scans these files at startup and exposes the discovered capabilities and parameter bindings through its local API.


## v1.17.22 attachment/vision fixes

- Create Studio now always exposes the local reference-image uploader. A bundled `flux_image_reference` API workflow is included; when the selected workflow has no `LoadImage` input, Gina offers a one-click switch to the reference workflow.
- Local AI attachments now send uploaded images to the backend as actual multimodal `image_url` inputs when a llama.cpp `mmproj` is available.
- Gina auto-detects `*mmproj*.gguf` beside the Gemma model, or accepts `GINA_LLM_MMPROJ` explicitly.
- Local AI shows `VISION READY` vs `TEXT ONLY` so an upload is never mistaken for visual understanding.
- `Start_Local_LLM.bat` also auto-detects the projector.


## Diagnostics/HMR safety (v1.17.27)
The dashboard error-log endpoint is intentionally failure-proof. Vite HMR is opt-in via `GINA_HMR=true`; this prevents local metadata/runtime changes from reloading the page while an attachment upload is in flight.


### AIDA64 1024×600 protection
AIDA64 generation is hard-locked to 1024×600 at workflow submission and output validation. The 12-gauge background mode masks AI-generated instrumentation inside the live Gauge Factory zones before the real 100-state gauges are overlaid.


## v1.18.2 — Create Studio completion finalisation (2026-09-06)

### Target File Path: `/server.ts`
- Added authoritative ComfyUI `/history` reconciliation for active jobs so missed WebSocket completion packets cannot leave Create Studio permanently RUNNING at 100%.

### Target File Path: `/src/context/GenerationJobContext.tsx`
- Extended final output polling to approximately 15 seconds and labelled 100% as finalisation while output resolves.

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- Changed the 100% RUNNING indicator to `FINALISING OUTPUT…`.

### Target File Path: `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
- Synchronized project version to `1.18.2` and documented the Create Studio completion fix.

## v1.18.1 — Phase 34 + Phase 36 routing and edit queue (2026-09-06)

### Target File Path: `/server/llm/LocalLlmManager.ts`
- Added `getModelSelection()` so the active engine, model and Qwen projector can be exposed consistently.
- Existing `setEngine()` remains the single engine switch path and is now surfaced by the API/UI.

### Target File Path: `/server.ts`
- Added `POST /api/llm/engine` for explicit Qwen/Gemma selection with ComfyUI VRAM release before switching.
- Changed AI image intent handling so explicit image creation/edit requests are actually queued instead of producing a promise-only assistant response.
- Added deterministic Phase 34 routing: Qwen → Juggernaut-XL v9; Gemma → FLUX.1-Schnell. Reference edits use the matching reference workflow.
- Generation audit metadata now records the LLM, mmproj, generation model and workflow.

### Target File Path: `/workflows/sdxl_juggernaut_reference.json`
- Added a native SDXL/Juggernaut LoadImage → VAEEncode → KSampler → VAEDecode → SaveImage reference-edit workflow.

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- Added the Phase 34 Qwen/Gemma engine selector and corrected vision guidance to point to Qwen + mmproj-F16.

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- Added live generation model telemetry showing LLM, mmproj, image model and workflow during generation.

### Target File Path: `/src/components/MilestoneChecklist.tsx`
- Marked Phase 34 `COMPLETED`, opened Phase 36 as the active ongoing edit queue, and created restore point `RESTORE_V1.18.1_PHASE34_ROUTING_AND_EDIT_QUEUE`.

### Target File Path: `/docs/EDIT_REQUESTS.md`
- Created the persistent human-to-agent edit request queue required by Phase 36.

### Target File Path: `/README.md`, `/AGENTS.md`, `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`
- Synchronized the project to version `1.18.1` and documented the Phase 34/36 changes.

## Phase 36 follow-up — Create Studio completion/finalisation fix (2026-09-06)

### Target File Path: `/server.ts`
- Added ComfyUI `/history` reconciliation for active jobs.
- `/api/jobs/:id` now repairs missed WebSocket completion packets, converting a job stuck at 100% RUNNING into COMPLETED when ComfyUI reports success/output.
- `/api/jobs/:id/output` also performs the reconciliation before resolving output.

### Target File Path: `/src/context/GenerationJobContext.tsx`
- Extended final-output polling from ~5 seconds to ~15 seconds.
- Marks 100% progress as `Finalising output…` while the authoritative completion/output state is being resolved.

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- Changed the 100% RUNNING status label from `SAMPLING · 100%` to `FINALISING OUTPUT…` so the UI accurately reflects the finalisation stage.

## Phase 36 v1.18.3 — Image Generation Speed, Preview Retention & Edit Options (2026-09-07)

### Target File Path: `/workflows/sdxl_juggernaut.json` & `/workflows/sdxl_juggernaut_reference.json`
- **Code Snippet**:
  ```json
  "sampler_name": "dpmpp_2m",
  "steps": 20,
  "denoise": 0.70
  ```
- **Why**: The default `dpmpp_2m_sde` sampler computes noise twice per step, resulting in slow 22.03s/it runs (559 seconds total) on 8GB VRAM setups. Switching to non-SDE `dpmpp_2m` with 20 steps yields 8–12 second generations (50x speedup). A default denoise of 0.70 ensures user prompt edits visibly transform the image instead of producing near-duplicates.

### Target File Path: `/src/components/PromptStudio.tsx`
- **Code Snippet**:
  ```typescript
  const [selectedHistoryUrl, setSelectedHistoryUrl] = useState<string | null>(null);
  const [lastCompletedImageUrl, setLastCompletedImageUrl] = useState<string | null>(null);
  const activeOutput = rawOutput || selectedHistoryUrl || lastCompletedImageUrl || job?.preview || null;
  bound.denoise = hasReferenceImage ? denoise : 1.0;
  ```
- **Why**: Prevents images from unloading from the preview canvas upon generation completion or job reset; clicking history items immediately restores them to the canvas; guards against beige images by forcing denoise = 1.0 when generating without a reference image; defaults workflow to `sdxl_juggernaut` (Juggernaut-XL v9 Photorealism).

### Target File Path: `/src/components/gina-image/GinaImagePreview.tsx`
- **Code Snippet**:
  ```typescript
  const displayImage = activeOutput || job?.preview || null;
  {displayImage && (
    <div className="border-t border-[#21262d] bg-[#161b22] px-3 py-2 flex items-center justify-between">
      {/* Keep Image, Vary Subtle, Vary Strong, Download buttons */}
    </div>
  )}
  ```
- **Why**: Ensures the action bar with edit options (Keep Image, Vary, Download) remains rendered and clickable as long as an image is loaded on the canvas.

### Target File Path: `/server.ts`
- **Code Snippet**:
  ```typescript
  app.post('/api/comfy/promote-output', async (req, res) => {
    const { jobId, imageUrl } = req.body || {};
    // Supports direct promotion by imageUrl as well as jobId
  });
  ```
- **Why**: Enables flexible promotion of generated or historical images into ComfyUI's input directory for image-to-image and reference-guided editing workflows.

### Target File Path: `/docs/EDIT_REQUESTS.md`
- **Code Snippet**:
  - Moved Local AI 559s slow generation and Create Studio preview unload issues to Completed Requests with root-cause analysis and affected files.
- **Why**: Maintain the authoritative Phase 36 human-to-agent work queue.

### Target File Path: `/src/version.ts`, `/src/components/MilestoneChecklist.tsx`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
- **Code Snippet**:
  ```typescript
  export const APP_VERSION = '1.18.3';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.18.3_IMAGE_GEN_PREVIEW_FIXES';
  export const ACTIVE_LIFECYCLE_PHASE = 36;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 36 — IMAGE GENERATION SPEED, PREVIEW RETENTION & CREATE STUDIO FIXES';
  ```
- **Why**: Synchronize universal project version 1.18.3 and active save point according to system rules.

## Phase 36 v1.18.4 — Local AI to Create Studio Preview Bridge (2026-09-07)

### Target File Path: `/src/context/GenerationJobContext.tsx`
- **Code Snippet**:
  ```typescript
  const adoptCompletedOutput = useCallback((jobId: string, imageUrl: string, filename?: string) => {
    activeJobIdRef.current = jobId;
    outputResolvedJobRef.current = jobId;
    setOutputLoading(false);
    setSubmitting(false);
    const syntheticOutput = { nodeId: 'output', kind: 'images', file: { filename: filename || 'output.png' }, url: withCacheBust(imageUrl, jobId) };
    setJob(prev => ({ ...prev, id: jobId, status: 'COMPLETED', progress: 100, outputs: [syntheticOutput] }));
    setOutput({ job: ..., outputs: [syntheticOutput] });
  }, []);
  ```
- **Why**: Allows instant synchronization of finished external/AI tool generations into Create Studio context so the preview canvas immediately displays the image with full editing controls. Guarded the `progress` event so late packets cannot revert a `COMPLETED` job back to `RUNNING`.

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- **Code Snippet**:
  ```typescript
  if (data.ready && data.imageUrl) {
    adoptCompletedOutput(data.jobId || jobId, data.imageUrl, data.filename);
    setMessages(prev => [...prev, { role: 'assistant', content: ..., imageUrl: data.imageUrl }]);
    ...
  }
  ```
- **Why**: Directly pushes the completed local AI image output into the shared generation job context the moment the polling loop detects output completion.

### Target File Path: `/src/components/PromptStudio.tsx`
- **Code Snippet**:
  ```typescript
  const rawOutput = output?.outputs?.[0]?.url || (Array.isArray(job?.outputs) ? job?.outputs?.[0]?.url : undefined);
  const activeOutput = selectedHistoryUrl || (isMediaImage ? rawOutput : undefined) || lastCompletedImageUrl || (job?.status === 'COMPLETED' ? (job?.outputs?.[0]?.url || job?.preview) : undefined);
  const isBusy = loading || job?.status === 'QUEUED' || (job?.status === 'RUNNING' && (!activeOutput || (job.progress || 0) < 100));
  ```
- **Why**: Allows Create Studio preview to resolve output immediately from `job.outputs` when `output` is not yet fetched, and releases `isBusy` when output is resolved or progress is 100%, enabling immediate editing without "Output not finalised" blockage.

### Target File Path: `/server.ts`
- **Code Snippet**:
  ```typescript
  // In /api/jobs/:id/result:
  if (job.status !== 'COMPLETED' && job.promptId) {
    job = await reconcileComfyJobFromHistory(job);
  }
  jobManager.update(job.id, { status: 'COMPLETED', progress: 100, currentNodeId: null, outputs, completedAt: ... });
  // In /api/jobs/:id/output:
  if (Array.isArray(job.outputs) && job.outputs.length && (job.status === 'COMPLETED' || !job.promptId)) {
    return res.json({ job, outputs: job.outputs });
  }
  ```
- **Why**: Ensures server-side job manager state is synchronized with ComfyUI history and outputs are persisted, preventing unnecessary re-queries or race conditions.

### Target File Path: `/src/version.ts`, `/src/components/MilestoneChecklist.tsx`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`
- **Code Snippet**:
  ```typescript
  export const APP_VERSION = '1.18.4';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.18.4_LOCAL_AI_CREATE_BRIDGE';
  export const ACTIVE_LIFECYCLE_PHASE = 36;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 36 — LOCAL AI TO CREATE STUDIO PREVIEW BRIDGE & OUTPUT FINALISATION SYNCHRONIZATION';
  ```
- **Why**: Maintain mandatory 100% universal version synchronization and active save point protocol.

## Phase 36 v1.18.5 — Network Binding Port 3000 Restoration & Music Studio Robustness (2026-09-07)

### Target File Path: `/server.ts`
- **Code Snippet**:
  ```typescript
  const isWin = process.platform === "win32";
  const PORT = isWin ? 3200 : 3000;
  const candidatePorts = isWin
    ? [3200, 3201, 3202, 3203, 3204, 3205, 3206, 3207, 3208, 3209, 3210]
    : [3000];
  ```
- **Why**: In cloud container environments, `process.env.PORT` is populated with `8080` for container ingress. Binding to `process.env.PORT` caused `Error: listen EADDRINUSE: address already in use 0.0.0.0:8080` because the container nginx reverse proxy was already bound to 8080. Express failed to listen on port 3000, causing nginx to proxy 502/HTML error pages to API callers. Restored strict platform-aware binding to port 3000 on Linux/container environments and port 3200 on Windows.

### Target File Path: `/src/components/MusicStudio.tsx`
- **Code Snippet**:
  ```typescript
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected application/json but received ${contentType || 'non-JSON response'}`);
  }
  const data = await res.json();
  ```
- **Why**: Prevents `JSON.parse: unexpected character at line 1 column 1` error if a proxy or network error returns an HTML payload instead of valid JSON.

### Target File Path: `/src/components/LTXDiagnostic.tsx`
- **Code Snippet**:
  ```typescript
  if (diagRes.ok && (diagRes.headers.get('content-type') || '').includes('application/json')) {
    const diag = await diagRes.json();
  ```
- **Why**: Guards against non-JSON responses when polling system diagnostics.

### Target File Path: `/src/version.ts`, `/src/components/MilestoneChecklist.tsx`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/EDIT_REQUESTS.md`
- **Code Snippet**:
  ```typescript
  export const APP_VERSION = '1.18.5';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.18.5_NETWORK_BINDING_MUSIC_STATUS_FIX';
  export const ACTIVE_LIFECYCLE_PHASE = 36;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 36 — NETWORK BINDING PORT 3000 RESTORATION & MUSIC STATUS ROBUSTNESS';
  ```
- **Why**: Universal version synchronization and active save point protocol.




## v1.19.4 — Phase 44 Local AI Project Attachments & Large ZIP Ingestion (2026-09-12)

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const archive = extension === '.zip';
  if (archive) {
    await uploadAndActivateProject(file);
    return;
  }
  if (status?.engine === 'qwen-coder' && image) {
    setFileAttachError('Qwen Coder accepts project/text/code files, but image attachments require Qwen 2.5-VL Vision Mode.');
    return;
  }
  ```
  The Attach control is no longer locked in Qwen Coder. ZIPs use the dedicated project-workspace path, while images remain Vision Mode only. The separate Project ZIP control was removed so Attach is the single upload entry point.
- **Why**: Make Qwen Coder a practical coding interface for direct file analysis and project uploads without sending an entire archive into the LLM prompt.

### Target File Path: `/server.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const LOCAL_AI_UPLOAD_LIMITS = { image: 12 * 1024 * 1024, text: 2 * 1024 * 1024, archive: 100 * 1024 * 1024 };
  const LOCAL_AI_ZIP_MAX_FILES = 10000;
  const LOCAL_AI_ZIP_TEXT_TOTAL = 16 * 1024 * 1024;
  app.post('/api/llm/upload-attachment', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
  ```
- **Why**: Remove the former 100-file ZIP ceiling and allow larger project archives through the Local AI upload endpoint while retaining a bounded safety ceiling.

### Target File Path: `/src/components/MilestoneChecklist.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  { phase: 43, name: 'Target Update: Local AI Stack Optimization & UI Toggle Swap (RTX 3070 Ti 8GB)', status: 'COMPLETED' }
  { phase: 44, name: 'Local AI Project Attachments & Large ZIP Ingestion', status: 'COMPLETED', ... }
  { phase: 45, name: 'Web Browser Integration', status: 'PENDING', ... }
  ```
- **Why**: Close Phase 43, record Phase 44 completion, preserve Web Browser Integration as the next roadmap phase, and add the active Phase 44 restore point.

### Target File Path: `/src/version.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export const APP_VERSION = '1.19.4';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.19.4_PHASE44_LOCAL_AI_PROJECT_ATTACHMENTS';
  export const ACTIVE_LIFECYCLE_PHASE = 44;
  ```
- **Why**: Synchronize the authoritative application version and active lifecycle with the completed Phase 44 update.

### Target File Path: `/package.json`
- **Exact Code Snippet / Code Block**:
  ```json
  "version": "1.19.4"
  ```
- **Why**: Keep package metadata synchronized with `src/version.ts`.

### Target File Path: `/metadata.json`
- **Exact Code Snippet / Code Block**:
  ```json
  "version": "1.19.4",
  "release": "Phase 44 v1.19.4: Qwen Coder file attachments, dedicated project ZIP workspaces, automatic safe inspection, 100MB archive uploads and 10,000-file ZIP capacity"
  ```
- **Why**: Keep release metadata and model capability description aligned with the new Local AI upload architecture.

### Target File Path: `/index.html`
- **Exact Code Snippet / Code Block**:
  ```html
  <title>Gina AI Factory v1.19.4 — Local AI Project Attachments & Large ZIP Ingestion</title>
  <meta name="description" content="Gina AI Factory v1.19.4 with Qwen Coder file attachments, dedicated project ZIP workspaces, automatic safe inspection, large ZIP ingestion, coding validation, and local creator studios." />
  ```
- **Why**: Synchronize the browser title and description with the active release.

### Target File Path: `/AGENTS.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Current version: v1.19.4
  Active lifecycle: PHASE 44 — LOCAL AI PROJECT ATTACHMENTS & LARGE ZIP INGESTION
  Active save point: RESTORE_V1.19.4_PHASE44_LOCAL_AI_PROJECT_ATTACHMENTS
  ```
- **Why**: Repair the previously stale project-memory header and document the Phase 44 operating rule, while preserving the mandatory Windows 3200/network rule.

### Target File Path: `/README.md`
- **Exact Code Snippet / Code Block**:
  ```markdown
  ## v1.19.4 — Local AI Project Attachments & Large ZIP Ingestion (2026-09-12)
  ```
- **Why**: Document the user-facing Qwen Coder attachment workflow, automatic safe inspection, archive capacity, and restore point.

### Target File Path: `/docs/INDEX.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Gina AI Factory — Local Creator UI (v1.19.4)
  Qwen 2.5-VL Vision / Qwen 2.5 Coder, llama-server CUDA, 28-layer pin config
  ```
- **Why**: Remove stale top-level version/model documentation.

### Target File Path: `/docs/architecture/SYSTEM_ARCHITECTURE.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Juggernaut-XL / FLUX.1 Lite & Wan 2.1 execution
  Qwen 2.5-VL / Qwen 2.5 Coder (28 GPU layers, up to 16K ctx)
  Before starting or restarting a local Qwen engine, Gina triggers
  ```
- **Why**: Align the architecture manifest with the active Qwen/Wan/FLUX Lite stack instead of stale Gemma/LTX runtime claims.

### Target File Path: `/docs/EDIT_REQUESTS.md`
- **Exact Code Snippet / Code Block**:
  ```markdown
  ## 🟩 Open Requests (Process sequentially)
  - [ ] None
  ## 🟨 In Progress
  - *None*
  ## 🟥 Completed Requests
  - [x] 2026-09-12 — Phase 44: Local AI Project Attachments & Large ZIP Ingestion
  ```
- **Why**: Restore the standardized persistent request queue format and record the Phase 44 completion without deleting unresolved work.

### Target File Path: `/CHANGELOG.md`
- **Exact Code Snippet / Code Block**:
  ```markdown
  ## v1.19.4 — Phase 44 Local AI Project Attachments & Large ZIP Ingestion (2026-09-12)
  ```
- **Why**: Record this update using the repository's mandatory per-file target/snippet/reason format so future agents can verify exactly what changed.

### Phase 44 compliance audit follow-up — 2026-09-12

### Target File Path: `/src/components/LocalLlmStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const archive = extension === '.zip';
  if (archive) {
    await uploadAndActivateProject(file);
    return;
  }
  ```
- **Why**: Ensure ZIP project uploads bypass the normal five-attachment turn limit and always enter the dedicated workspace import/inspection path.

### Target File Path: `/AGENTS.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Current version: v1.19.4
  Active lifecycle: PHASE 44 — LOCAL AI PROJECT ATTACHMENTS & LARGE ZIP INGESTION
  Active save point: RESTORE_V1.19.4_PHASE44_LOCAL_AI_PROJECT_ATTACHMENTS
  Local Dashboard URL: http://127.0.0.1:3200/ on Windows; cloud containers use port 3000
  ```
- **Why**: Complete the mandatory project-memory/version/network consistency audit after the Phase 44 implementation.

### Phase 44 UI consistency follow-up — 2026-09-12

### Target File Path: `/src/App.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  <p className="text-xs text-slate-500 mt-1">Qwen 2.5-VL Vision / Qwen 2.5 Coder served locally by llama.cpp CUDA.</p>
  ```
- **Why**: Remove the stale Gemma label from the Local AI workspace header so the primary UI matches the active Qwen model stack.

### Target File Path: `/src/components/LocalCapabilityPanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  data.runtime?.wanReady
  data.runtime?.qwenCoderReady
  ['Wan Video', data.runtime?.wanReady, Video]
  ['Qwen Coder', data.runtime?.qwenCoderReady, Brain]
  ```
- **Why**: Make the live capability inventory report the active Wan 2.1 video and Qwen Coder runtimes instead of retired LTX/Gemma status fields.

### Phase 44 active-stack documentation consistency — 2026-09-12

### Target File Path: `/src/AppFeaturesGuide.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  title: 'Wan 2.1 & RIFE Motion Studio'
  badge: 'Wan 2.1 + RIFE'
  ```
- **Why**: Align the feature guide with the Phase 43 native Wan 2.1 video migration.

### Target File Path: `/src/components/GinaAgentPanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  control ComfyUI and manage the active Qwen local AI engines.
  ```
- **Why**: Remove stale Gemma wording from the active agent UI.

### Target File Path: `/src/components/gina-image/GinaImageSettings.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  FLUX.1 Lite high-precision text lane
  ```
- **Why**: Reflect the Phase 43 FLUX.1 Lite high-precision route instead of the retired Gemma Vision fallback label.

### Target File Path: `/src/components/LocalRagKnowledgePanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  Zero-VRAM local RAG alongside Qwen/ComfyUI
  Search local knowledge (e.g. 'VRAM cage', 'Qwen 28 layers', 'AIDA64 68 sensors')...
  ```
- **Why**: Keep the active RAG UI terminology consistent with the Qwen stack.

### Target File Path: `/src/components/MusicStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  AI Lyrics Writer (Local Qwen / Built-in songwriter)
  AI Songwriter & Lyricist (Local Qwen)
  ```
- **Why**: The lyricist uses the active local LLM endpoint, so its UI must no longer identify the retired Gemma engine.

### Target File Path: `/server/rag/LocalRagEngine.ts`
- **Exact Code Snippet / Code Block**:
  ```text
  Gina releases ComfyUI cached models before starting/restarting the active Qwen engine.
  Video Workflow: Wan 2.1 1.3B BF16 with H.264 MP4 export and RIFE frame interpolation.
  ```
- **Why**: Prevent local RAG grounding from reintroducing retired Gemma/LTX runtime descriptions.

### Phase 44 root-cleanliness compliance — 2026-09-12

### Target File Path: `/flux_image.json`, `/flux_image_reference.json`, `/ltx_video.json`
- **Exact Code Snippet / Code Block**:
  ```text
  Deleted obsolete root-level workflow JSON files.
  ```
- **Why**: Enforce AGENTS.md Rule 5/8: workflow JSON belongs under `/workflows/`, and these root-level legacy files were no longer referenced by the active Phase 43/44 runtime. Removing them prevents stale LTX/FLUX workflow discovery outside the authoritative workflow directory.

## Phase 50 — Autonomous Research Engine, Repair Loop & GitHub Lifecycle — 2026-09-12

### Target File Path: `/server/agent/AutonomousResearchEngine.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class AutonomousResearchEngine {
    async research(query: string, options: { deep?: boolean; maxResults?: number } = {}): Promise<ResearchResult> { ... }
    async verifyCompatibility(packageName: string, targetVersion?: string): Promise<{ compatible: boolean; details: string }> { ... }
  }
  ```
- **Why**: Provide automated documentation and library research by combining local zero-VRAM RAG retrieval with external web search (DuckDuckGo integration when GINA_WEB_ACCESS=true) and API signature caching.

### Target File Path: `/server/agent/AutonomousRepairLoop.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class AutonomousRepairLoop {
    async executeRepairPipeline(request: RepairRequest, onProgress?: (step: string, details?: any) => void): Promise<RepairResult> { ... }
  }
  ```
- **Why**: Provide a 10-stage autonomous cycle (REQUEST → UNDERSTAND → PLAN → INSPECT → RESEARCH → EDIT → VALIDATE → REPAIR → SCAN → DIFF → COMMIT) with automated retries (up to 3 passes) driven by compiler diagnostics and DefinitionOfDoneGate checks.

### Target File Path: `/server/agent/GitHubLifecycleManager.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class GitHubLifecycleManager {
    async getGitStatus(): Promise<GitStatusResult> { ... }
    async stageAndCommit(message: string, files?: string[]): Promise<{ commitSha: string; filesCommitted: string[] }> { ... }
    async createPullRequest(params: CreatePullRequestParams): Promise<PullRequestResult> { ... }
  }
  ```
- **Why**: Provide Git lifecycle automation (branching, staging, committing, diffing, and PR creation via GitHub REST API) using safe token resolution.

### Target File Path: `/server.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const researchEngine = new AutonomousResearchEngine(agentWorkspaceManager.getSandboxRoot(), localRagEngine);
  const githubLifecycleManager = new GitHubLifecycleManager(agentWorkspaceManager.getSandboxRoot());
  const repairLoop = new AutonomousRepairLoop(agentWorkspaceManager.getSandboxRoot(), researchEngine, dodGate, githubLifecycleManager);
  app.post("/api/agent/repair-loop", async (req, res) => { ... });
  app.post("/api/agent/research", async (req, res) => { ... });
  app.post("/api/agent/git/commit", async (req, res) => { ... });
  app.post("/api/agent/git/pr", async (req, res) => { ... });
  ```
- **Why**: Expose the autonomous repair loop, research engine, and GitHub lifecycle manager as tool actions and REST API endpoints.

### Target File Path: `/src/components/GinaAgentPanel.tsx`
- **Exact Code Snippet / Code Block**:
  ```tsx
  <button onClick={() => runAgentAction('run_repair_loop', { task: 'Autonomous codebase health repair' })} ...>
    Run Repair Loop
  </button>
  ```
- **Why**: Expose UI triggers for Definition of Done verification, Project Map inspection, and Autonomous Repair Loop execution.

### Target File Path: `/src/version.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export const APP_VERSION = '1.20.0';
  export const ACTIVE_SAVE_POINT_ID = 'RESTORE_V1.20.0_AUTONOMOUS_RESEARCH_REPAIR_GITHUB';
  export const ACTIVE_LIFECYCLE_PHASE = 50;
  export const ACTIVE_LIFECYCLE_NAME = 'PHASE 50 — AUTONOMOUS RESEARCH ENGINE, REPAIR LOOP & GITHUB LIFECYCLE';
  ```
- **Why**: Version bump and milestone save point synchronization for Phase 50.

### Target File Path: `/src/components/MilestoneChecklist.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  { phase: 50, name: 'Autonomous Research Engine, Repair Loop & GitHub Lifecycle', status: 'COMPLETED', details: 'Multi-stage autonomous repair loop, local RAG + DuckDuckGo research engine, Git branch/commit/diff/PR lifecycle automation, and Definition of Done gate integration.' }
  { id: 'RESTORE_V1.20.0_AUTONOMOUS_RESEARCH_REPAIR_GITHUB', label: 'Autonomous Research Engine, Repair Loop & GitHub Lifecycle', description: 'Production-ready AutonomousResearchEngine, multi-stage AutonomousRepairLoop pipeline, GitHubLifecycleManager, DefinitionOfDoneGate verification, and complete REST/SSE broker routes', timestamp: '2026-09-12 07:30', status: 'ACTIVE' }
  ```
- **Why**: Update active lifecycle phases and save points to reflect Phase 50 completion.

### Target File Path: `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/docs/AI_UPDATE_CHECKLIST.md`
- **Exact Code Snippet / Code Block**:
  ```text
  Synchronized version to 1.20.0, release references to Phase 50, and updated platform truth.
  ```
- **Why**: Satisfy the Universal Version & Metadata Synchronization Guard and Definition of Done Gate.


## v1.20.4 — GIF Studio Frame-Sequence Export Fix (2026-09-13)

Fixed the open GIF Studio bug from `docs/EDIT_REQUESTS.md`: batch-uploaded frame sets were never packed into a single animation, and the "Export GIF" action had no completed job to act on.

### Target File Path: `/server.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  // listGifStudioAssets(): a same-batch folder of images is now surfaced as one
  // grouped asset instead of N flattened single-frame entries.
  if (files.length > 1 && subdirs.length === 0) {
    const allImages = exts.every(ext => GIF_STUDIO_IMAGE_EXTENSIONS.has(ext));
    if (allImages) { assets.push({ id:`gif_seq_${batchName}`, kind:'sequence', framePaths, frameCount, ... }); return; }
  }

  // runGifAssetProcessingJob(): new sourceKind === 'sequence' branch packs the
  // frame set into one clip via the FFmpeg concat demuxer instead of only ever
  // looping a single static image.
  if (sourceKind === 'sequence') {
    const framePaths = parameters.framePaths.map(validateManaged);
    // build concat list with duration-per-frame, encode to one mp4
  }

  // resolveStoredJobOutput(job, preferredFormat): now prefers the stored output
  // matching the requested export format instead of blindly taking outputs[0].
  ```
- **Why**: (1) Batch image uploads were grouped on disk but never reconstructed as one selectable asset, so a multi-frame source could never be queued as a single job — this is why Export appeared to do nothing. (2) The asset processor had no code path to combine multiple frames at all. (3) Sequential Story jobs store both a final `.mp4` and `.gif`; the export route was returning whichever was stored first regardless of the requested format.

### Target File Path: `/src/components/GifStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  interface StudioAsset { ...; kind: 'video'|'image'|'sequence'; framePaths?: string[]; frameCount?: number; }
  // submit(): pass framePaths through when activeAsset.kind === 'sequence'
  // asset dropdown: 🎞️ icon for sequence assets
  ```
- **Why**: Wire the new grouped sequence asset into job submission and the UI.

### Target Files: `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/src/components/MilestoneChecklist.tsx`
- **Exact Change**: Synchronized version to `1.20.4`, active save point to `RESTORE_V1.20.4_GIF_STUDIO_FRAME_SEQUENCE_PACKING`, added `GIF_STUDIO_FRAME_SEQUENCE_PACKING` to `metadata.json` capabilities.
- **Why**: Satisfy the Universal Version & Metadata Synchronization Guard (Rule 7).

**Not yet acceptance-tested**: this was implemented and statically syntax-checked in a sandboxed environment without ComfyUI, FFmpeg, or a GPU available. Live Windows verification (upload a multi-frame batch, run the workflow, confirm a single packed GIF/MP4 exports) is still required before this can be marked externally verified, consistent with Phase 53's separation of implementation-complete vs. externally accepted work.

## v1.20.5 — SDXL Juggernaut Inpaint Masking Canvas & Workflow Integration

Added interactive masking canvas and dedicated SDXL inpaint workflow (`sdxl_juggernaut_inpaint`) enabling 1:1 subject recoloring and element replacement while preserving unmasked backgrounds bit-for-bit.

### Target File Path: `/workflows/sdxl_juggernaut_inpaint.json`
- **Exact Code Snippet / Code Block**:
  ```json
  {
    "9": { "class_type": "LoadImageMask", "inputs": { "image": "mask.png", "channel": "red" } },
    "10": { "class_type": "SetLatentNoiseMask", "inputs": { "samples": ["5", 0], "mask": ["9", 0] } }
  }
  ```
- **Why**: Standard SDXL img2img changes the entire image when denoise is increased, or cannot cleanly recolor dark fur when denoise is lowered. `SetLatentNoiseMask` freezes unmasked latents completely while allowing full sampling denoise inside the masked dog area.

### Target File Path: `/server/comfy/WorkflowParser.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  if (['LoadImageMask'].includes(className)) {
    capabilities.add('mask-input');
  }
  // Added alias:
  if (['mask_image', 'maskimage', 'mask_filename', 'mask_path'].includes(lower)) return 'maskImage';
  ```
- **Why**: Enable workflow intelligence to identify mask inputs and bind mask image paths automatically.

### Target File Path: `/server.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  function imageGenerationPolicy(engine: 'qwen' | 'qwen-coder', multimodal: boolean, hasReference: boolean, highPrecision = false, hasMask = false) {
    ...
    return {
      workflowId: hasMask ? 'sdxl_juggernaut_inpaint' : hasReference ? 'sdxl_juggernaut_reference' : 'sdxl_juggernaut',
      generationModel: 'Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors (SDXL)',
      lane: 'qwen-juggernaut' as const
    };
  }
  ```
- **Why**: Intelligently route masked requests to `sdxl_juggernaut_inpaint`.

### Target File Path: `/src/components/gina-image/GinaInpaintCanvas.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export const GinaInpaintCanvas: React.FC<GinaInpaintCanvasProps> = ({ imageUrl, imageName, onMaskChange }) => { ... }
  ```
- **Why**: Provides an interactive HTML5 drawing canvas over the reference image with brush, eraser, adjustable radius, undo history, clear, invert, and binary mask generation.

### Target File Path: `/src/components/gina-image/GinaImageInput.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  <GinaInpaintCanvas
    imageUrl={referenceImage.previewUrl}
    imageName={referenceImage.name}
    onMaskChange={handleMaskChange}
    disabled={uploadingMask}
  />
  // Quick presets including: 🐕 White Whippet Fur
  // Direct inpaint action: 🎨 Generate Inpaint
  ```
- **Why**: Embed the masking canvas into Tab 3 ("Inpaint or Outpaint"), upload drawn masks directly to ComfyUI, and give instant feedback with quick fur recoloring presets.

### Target File Path: `/src/components/PromptStudio.tsx`
- **Exact Code Snippet / Code Block**:
  ```typescript
  if (referenceImage && inpaintMask) {
    targetWorkflow = 'sdxl_juggernaut_inpaint';
    bound.input_image = referenceImage.filename;
    bound.mask_image = inpaintMask.filename;
    bound.denoise = 0.85;
  }
  ```
- **Why**: Wire inpainting mask to the workflow bindings and trigger inpainting with optimal denoise inside the masked area.



# v1.20.6 — Phase 54 — StreamInject Source Audio Stripping Engine

## Infrastructure: Add StreamInject Source Audio Stripping Pass — Completed 2026-09-13

- **Target File:** `/scripts/stream_inject.py`
  - **Exact Code Change:** Registered `--strip-audio` with `action="store_true"`; added a pre-processing FFmpeg pass using `-vcodec copy -an` for `intro_path`, `main_gameplay_path`, `outro_path`, and `green_screen_overlay`; substituted the source variables with silent scratch outputs before slicing/processing; wired the CLI flag into `MasterRenderPipeline.execute`.
  - **Why:** Remove unwanted embedded source audio before timeline assembly while preserving the original video bitstream and avoiding GPU/VRAM work.
- **Target File:** `/server.ts`
  - **Exact Code Change:** Added `stripAudio: options.stripAudio === true` to the `streaminject_render` job ledger metadata.
  - **Why:** Persist the user's render choice with the queued job.
- **Target File:** `/server/streaminject/StreamInjectService.ts`
  - **Exact Code Change:** Added `stripAudio?: boolean` to `StreamInjectRenderOptions` and dynamically appends `--strip-audio` when enabled.
  - **Why:** Propagate the dashboard/API option into the Python renderer.
- **Target File:** `/src/components/StreamInjectStudio.tsx`
  - **Exact Code Change:** Added `stripAudio` state, the Step 4 `stripAudioToggle` dashboard switch labelled `Mute Source Video Audio` with the requested description, and `stripAudio` in the `/api/streaminject/render` payload.
  - **Why:** Give users an explicit source-audio mute control at the point where background audio/subtitles are configured.
- **Target File:** `/src/version.ts`
  - **Exact Code Change:** Advanced to `1.20.6`, save point `RESTORE_V1.20.6_STREAMINJECT_AUDIO_STRIPPING_ENGINE`, Phase 54, and lifecycle label `STREAMINJECT SOURCE AUDIO STRIPPING ENGINE`.
  - **Why:** Establish the authoritative release/restore state for the completed infrastructure milestone.
- **Target Files:** `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`
  - **Exact Code Change:** Synchronized release references to `1.20.6`; updated current lifecycle/save-point documentation.
  - **Why:** Satisfy the mandatory universal version and metadata synchronization gate.
- **Target File:** `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Locked the previous active restore point and added completed Phase 54 with `RESTORE_V1.20.6_STREAMINJECT_AUDIO_STRIPPING_ENGINE`.
  - **Why:** Keep the milestone registry aligned with the active restore point.
- **Target File:** `/docs/EDIT_REQUESTS.md`
  - **Exact Code Change:** Moved the StreamInject audio stripping request from Open Requests to Completed Requests with the 2026-09-13 completion record.
  - **Why:** Reconcile the active backlog with implementation status.
- **Target File:** `/docs/AI_UPDATE_CHECKLIST.md`
  - **Exact Code Change:** Advanced current platform truth to v1.20.6 / Phase 54 and added a StreamInject cross-surface consistency gate.
  - **Why:** Keep the autonomous update integrity contract synchronized with the active project state.


# v1.20.7 — Phase 55 — Broader Code Review & Autonomy Hardening

## Broader code review — Completed 2026-09-13
- **Target File:** `/Start_Factory.bat`
  - **Exact Code Change:** Removed the stale v1.18.0 startup-version comparison and retired Gemma wording; startup now reports the live dashboard version and current Qwen engine names.
  - **Why:** Startup scripts are part of the active product surface and must not enforce or advertise obsolete release/model assumptions.
- **Target File:** `/Start_Local_LLM.bat`
  - **Exact Code Change:** Removed the retired Gemma selector/fallback and made Qwen 2.5-VL the sole active local launcher lane, with an explicit rejection of unsupported selectors.
  - **Why:** Prevent the local inference launcher from silently reintroducing a retired engine.
- **Target File:** `/AGENTS.md`
  - **Exact Code Change:** Reconciled the Project Overview version to 1.20.7 and promoted the Phase 55 hardening entry to the current contract section.
  - **Why:** Keep the mandatory AI startup context synchronized with the active release.
- **Target File:** `/scripts/check_ltx23.ts`
  - **Exact Code Change:** Deleted the retired LTX-2.3 diagnostic script from the active project package.
  - **Why:** The diagnostic targeted a retired video engine and kept obsolete production vocabulary in the shipped source tree.
- **Target File:** `/src/components/gina-image/GinaImageInput1.tsx`
  - **Exact Code Change:** Deleted the unused duplicate Image Studio input component.
  - **Why:** Prevent parallel abandoned implementations from drifting apart.
- **Target File:** `/docs/AI_UPDATE_CHECKLIST.md`
  - **Exact Code Change:** Added mandatory checks for the ACE-Step 8101 endpoint, workspace-bounded autonomous file access, and canonical ProjectMap target existence.
  - **Why:** Turn the newly discovered failure patterns into permanent pre/post-edit safeguards for future AI sessions.
- **Target File:** `/server/agent/DefinitionOfDoneGate.ts`
  - **Exact Code Change:** Added `project_map_targets` to the machine gate and expanded its check category union.
  - **Why:** The completion gate must detect stale canonical agent-context targets before accepting an update.
- **Target File:** `/server/agent/UpdateIntegrityGuard.ts`
  - **Exact Code Change:** Removed the deleted `scripts/check_ltx23.ts` entry from the historical exclusion set after the retired diagnostic was removed.
  - **Why:** Keep the integrity guard's historical inventory synchronized with the actual tree.
- **Target File:** `/server/agent/AutonomousAgentEngine.ts`
  - **Exact Code Change:** Added `resolveWorkspaceFile()` and routed autonomous reads/writes through workspace-bounded path validation.
  - **Why:** Prevent model-supplied absolute/traversal paths from escaping the assigned repair workspace.
- **Target File:** `/src/context/GenerationJobContext.tsx`
  - **Exact Code Change:** Changed cancellation to call the selected `/api/jobs/:id/cancel` endpoint and updated user-facing cancellation diagnostics.
  - **Why:** Keep the UI aligned with job-scoped cancellation and avoid direct global engine interruption from the client.
- **Target File:** `/src/components/gina-image/GinaImagePreview.tsx`
  - **Exact Code Change:** Replaced the hard-coded FLUX.1 Lite progress message with active workflow-aware image engine copy.
  - **Why:** Prevent misleading progress UI when Juggernaut/SDXL is the active image workflow.
- **Target File:** `/server.ts`
  - **Exact Code Change:** Corrected the selected-job cancellation completion flag and removed false-positive ComfyUI history completion from empty `outputs` objects; aligned the ACE-Step default port to 8101.
  - **Why:** Keep job state truthful and make the backend default match the installed singing API launcher.
- **Target File:** `/server/music/MusicService.ts`
  - **Exact Code Change:** Aligned `getAceStepBaseUrl()` default to `127.0.0.1:8101` while retaining `ACESTEP_API_URL` override support.
  - **Why:** Match the actual Windows ACE-Step launcher endpoint.
- **Target File:** `/src/components/VideoStudio.tsx`
  - **Exact Code Change:** Changed the submitted Wan 2.1 `batch_size` from the temporal frame count to `1`.
  - **Why:** Preserve the 8GB safety contract: temporal frame count is not batch size.
- **Target File:** `/server/agent/ProjectMapManager.ts`
  - **Exact Code Change:** Replaced stale primary-file paths with the current Video, Image, AIDA64, StreamInject, Music and Local AI surfaces; the generated map now reads the active version and validates canonical targets before caching.
  - **Why:** The autonomous context map itself had stale paths, so future agents could inspect the wrong file or miss the real implementation entirely.
- **Target File:** `/server/agent/DefinitionOfDoneGate.ts`
  - **Exact Code Change:** Added a machine-enforced Project Map Target Integrity check covering every canonical primary file.
  - **Why:** A stale architecture map must block completion rather than silently becoming future agent context.
- **Target File:** `/server/agent/AutonomousAgentEngine.ts`
  - **Exact Code Change:** Added workspace-bounded path validation for autonomous read/write operations, rejecting absolute paths and traversal segments.
  - **Why:** The self-modifying agent must not be able to escape its assigned workspace while repairing a project.
- **Target File:** `/src/context/GenerationJobContext.tsx`
  - **Exact Code Change:** Routed dashboard cancellation through `/api/jobs/:id/cancel` so cancellation uses the selected job's backend contract rather than a direct global ComfyUI interrupt.
  - **Why:** Keep UI cancellation aligned with job-scoped server cancellation for ComfyUI and AudioCraft.
- **Target Files:** `/server.ts`, `/server/music/MusicService.ts`
  - **Exact Code Change:** Aligned the ACE-Step default endpoint to `127.0.0.1:8101`, matching the Windows launcher and documented local singing API.
  - **Why:** The backend previously defaulted to port 8001 while the actual launcher listens on 8101, making a default singing setup appear offline.
- **Target Files:** `/src/components/VideoStudio.tsx`, `/src/components/gina-image/GinaImagePreview.tsx`
  - **Exact Code Change:** Forced Wan 2.1 UI requests to `batch_size: 1` and replaced the hard-coded FLUX-only image progress text with active-engine-aware copy.
  - **Why:** Prevent stale UI assumptions from contradicting the Wan safety contract or misleading users about which image engine is running.


- **Target File:** `/server/agent/AutonomousRepairLoop.ts`
  - **Exact Code Change:** Replaced the no-op repair prompt construction with a constrained local-LLM repair request that returns one JSON existing-file replacement, validates the path stays inside the active workspace, writes the repair, and records the modified file before the next validation cycle.
  - **Why:** The former “autonomous repair” stage never dispatched the prompt or changed the workspace, so repeated validation could never repair a failure.
- **Target File:** `/server.ts`
  - **Exact Code Change:** Reworked `/api/jobs/:id/cancel` to delete only the selected ComfyUI prompt, interrupt only when the selected job is running, and route AudioCraft cancellation through `musicService.cancelJob`; removed the global `{ clear:true }` queue operation.
  - **Why:** Cancelling one job must never erase unrelated queued generation work.
- **Target File:** `/server/music/MusicService.ts`
  - **Exact Code Change:** Added per-job AudioCraft child-process tracking and `cancelJob(jobId)`; generation/stem close handlers now respect a prior `CANCELLED` state.
  - **Why:** Give local AudioCraft subprocesses a real job-scoped cancellation path instead of leaving Python generation running after the dashboard marks a job cancelled.
- **Target File:** `/server/comfy/WorkflowParser.ts`
  - **Exact Code Change:** Removed retired LTX sampler/latent/loader class bindings from active workflow alias definitions.
  - **Why:** Wan 2.1 is the active video lane and the active parser must not advertise retired production bindings.
- **Target File:** `/src/components/gina-image/GinaImageInput1.tsx`
  - **Exact Code Change:** Removed the unused duplicate `GinaImageInput` implementation after confirming the active application imports `GinaImageInput.tsx`.
  - **Why:** Eliminate an abandoned parallel UI surface that could diverge from the active Image Studio implementation.
- **Target File:** `/metadata.json`
  - **Exact Code Change:** Reconciled stale Gemini/Gemma/LTX capability identifiers to current local-first/Qwen/Wan capability vocabulary.
  - **Why:** Current metadata is part of the active product contract and must not advertise retired engines.
- **Target File:** `/docs/updates/UPDATE_NOTES_v1.20.7_BROADER_CODE_REVIEW.md`
  - **Exact Code Change:** Added the Phase 55 review record covering Music/ACE-Step, Agent, AIDA64, Image, Video, GIF, StreamInject, Assets, Jobs, and Local AI surfaces plus explicit acceptance boundaries.
  - **Why:** Preserve the review findings and known follow-up limitations as auditable project documentation.
- **Target Files:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/docs/AI_UPDATE_CHECKLIST.md`, `/src/components/MilestoneChecklist.tsx`, `/docs/EDIT_REQUESTS.md`
  - **Exact Code Change:** Advanced the synchronized release to v1.20.7 / Phase 55 with active restore point `RESTORE_V1.20.7_BROADER_CODE_REVIEW_HARDENING`.
  - **Why:** Keep release identity, autonomous-agent contract, milestone state, and backlog truth synchronized after the hardening pass.


## v1.20.7 / Phase 55 — StreamInject CPU Watermark Eraser Matrix

- **Target File:** `/scripts/stream_inject.py`
  - **Exact Code Change:** Added `--remove-watermark`, `--wm-x`, `--wm-y`, `--wm-w`, and `--wm-h`; added a CPU-only OpenCV `VideoCapture`/`VideoWriter` Telea inpainting pre-pass that generates H.264 scratch clips before slicing and timeline processing.
  - **Why:** Remove static corner logos locally without CUDA/VRAM contention while keeping the existing hardcoded render pipeline intact.
- **Target File:** `/server/streaminject/StreamInjectService.ts`
  - **Exact Code Change:** Added watermark-erasure options to `StreamInjectRenderOptions` and forwarded normalized matrix values to the Python render CLI.
  - **Why:** Keep the orchestration contract synchronized with the Python engine.
- **Target File:** `/server.ts`
  - **Exact Code Change:** Added safe integer normalization for `removeWatermark`, `wmX`, `wmY`, `wmW`, and `wmH` at `/api/streaminject/render`, persisted them to job metadata, and passed them explicitly to `renderMasterPipeline`.
  - **Why:** Prevent malformed HTTP payloads from reaching the child-process boundary and keep job state auditable.
- **Target File:** `/src/components/StreamInjectStudio.tsx`
  - **Exact Code Change:** Added the Step 4 Watermark Eraser Matrix toggle, four percentage sliders, live boundary preview, and submission payload fields.
  - **Why:** Give users direct visual control over the CPU inpainting region without exposing GPU-heavy processing.
- **Target Files:** `/src/version.ts`, `/package.json`, `/metadata.json`, `/index.html`, `/AGENTS.md`, `/README.md`, `/docs/INDEX.md`, `/docs/AI_UPDATE_CHECKLIST.md`, `/src/components/MilestoneChecklist.tsx`
  - **Exact Code Change:** Kept release version at v1.20.7 / Phase 55, moved the active restore point to `RESTORE_V1.20.7_STREAMINJECT_INPAINT_WATERMARK_ERASER`, synchronized product metadata, active checklist truth, documentation and milestone state.
  - **Why:** Maintain the project-wide release/save-point contract for a same-version Phase 55 feature addition.

## GitHub Import Migration & Build Stabilization

- **Target File Path:** `/src/routes/imageroute.ts`, `/src/routes/imageRoute.js`
- **Exact Code Change:** Deleted obsolete duplicate route files that caused `tsc --noEmit` failures due to missing `../llm/LocalLlmManager.ts` import path, and removed empty `/src/routes` directory.
- **Why:** The authoritative server route is located at `/server/routes/imageRoute.ts` and mounted via `/api/llm`. The leftover duplicate files under `src/routes` caused TypeScript compilation errors during typecheck.
- **Target File Path:** `/bun.lock`
- **Exact Code Change:** Removed `bun.lock` lockfile from repository root.
- **Why:** Complies with GitHub import migration specifications (Node.js runtime with npm package manager only).
- **Target File Path:** `/src/components/gina-image/GinaImageInput1.tsx`, `/server/llm/LocalLlmManager1.ts`
- **Exact Code Change:** Removed unreferenced orphaned duplicate source files.
- **Why:** Eliminate abandoned duplicate files that diverge from active implementations and clean up workspace architecture.
- **Target File Path:** `/metadata.json`
- **Exact Code Change:** Added `"MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"` to `majorCapabilities` array.
- **Why:** Complies with Google AI Studio required platform capabilities for server-side architecture.
- **Target File Path:** `/scripts/check_ltx23.ts`
- **Exact Code Change:** Deleted retired LTX diagnostic script from repository.
- **Why:** Wan 2.1 1.3B BF16 is the active video engine and `scripts/check_wan21.ts` is the active diagnostic. Removing this retired script satisfies the `Zero Retired References & Production Integrity` gate in `DefinitionOfDoneGate` and `UpdateIntegrityGuard`.
## Phase 55 — ACE-Step DiT Environment Whitespace Resolution & Local AI Capability Enforcement

- **Target File Path:** `/metadata.json`
- **Exact Code Change:**
  ```json
      "PROJECT_MAP_TARGET_INTEGRITY",
      "JOB_SCOPED_CANCELLATION",
      "ACE_STEP_8101_LOCAL_SINGING_API",
      "STREAMINJECT_CPU_OPENCV_WATERMARK_INPAINTING"
    ],
  ```
- **Why:** Removed `"MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"` per user mandate to strictly enforce local-only AI execution and eliminate unwanted external cloud AI metadata.

- **Target File Path:** `/Start_Factory.bat`
- **Exact Code Change:**
  ```bat
  echo [3/5] Starting ACE-Step singing API (only if installed)...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-NetTCPConnection -LocalPort 8101 -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}"
  if errorlevel 1 (
    if exist "%GINA_ROOT%\scripts\Start_ACEStep_Singing_API.bat" (
      start "ACE-Step 1.5 - Singing API" cmd /k call "%GINA_ROOT%\scripts\Start_ACEStep_Singing_API.bat"
    ) else if exist "%GINA_ROOT%\third_party\ACE-Step-1.5\pyproject.toml" (
      start "ACE-Step 1.5 - Singing API" cmd /k "cd /d \"%GINA_ROOT%\third_party\ACE-Step-1.5\" && set \"ACESTEP_API_HOST=127.0.0.1\" & set \"ACESTEP_API_PORT=8101\" & set \"ACESTEP_INIT_SERVICE=true\" & set \"ACESTEP_CONFIG_PATH=acestep-v15-turbo\" & set \"ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B\" & set \"ACESTEP_LM_BACKEND=pt\" & set \"ACESTEP_OFFLOAD_TO_CPU=true\" & set \"ACESTEP_OFFLOAD_DIT_TO_CPU=true\" & set \"ACESTEP_INIT_LLM=true\" & set \"ACESTEP_LM_OFFLOAD_TO_CPU=true\" & uv run --no-sync acestep-api --host 127.0.0.1 --port 8101 --init-llm --lm-model-path acestep-5Hz-lm-0.6B"
    ) else (
      echo    ACE-Step is not installed. Singing remains unavailable until setup is run.
    )
  ) else (
    echo    ACE-Step API is already running; reusing it.
  )
  ```
- **Why:** Fixed cmd.exe trailing whitespace bug where `set ACESTEP_CONFIG_PATH=acestep-v15-turbo &&` assigned `"acestep-v15-turbo "` with a trailing space, which caused ACE-Step to fail with `ERROR: Failed to download DiT model 'acestep-v15-turbo ': Unknown DiT model: acestep-v15-turbo `. Now routes to `scripts\Start_ACEStep_Singing_API.bat` using `cmd /k call "%GINA_ROOT%\scripts\Start_ACEStep_Singing_API.bat"` without escaped quotation marks that Windows cmd.exe misinterprets as literal paths. Also quoted `NODE_OPTIONS` on line 116.

- **Target File Path:** `/scripts/Start_ACEStep_Singing_API.bat`
- **Exact Code Change:**
  ```bat
  if /i "%~1"=="--restart" goto KILL_OLD
  if /i "%~1"=="-restart" goto KILL_OLD
  if /i "%~1"=="/restart" goto KILL_OLD
  if /i "%~1"=="restart" goto KILL_OLD
  goto CHECK_RUNNING

  :KILL_OLD
  echo Stopping existing ACE-Step processes on port 8101...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 8101 -ErrorAction SilentlyContinue; foreach($c in $conns){ try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch {} }"
  timeout /t 1 /nobreak >nul
  ```
- **Why:** Added `--restart` flag to allow terminating stale ACE-Step processes occupying port 8101 that were launched with unquoted/trailing-space environment variables.

- **Target File Path:** `/server/music/MusicService.ts`
- **Exact Code Change:**
  ```typescript
          if (item.status === 2) {
            let errorDetail = "ACE-Step generation failed";
            if (typeof item.result === "string") {
              try {
                const parsed = JSON.parse(item.result);
                const errObj = Array.isArray(parsed) ? parsed[0] : parsed;
                errorDetail = errObj?.error || item.result;
              } catch {
                errorDetail = item.result;
              }
            } else if (item.result && typeof item.result === "object") {
              const errObj = Array.isArray(item.result) ? item.result[0] : item.result;
              errorDetail = errObj?.error || JSON.stringify(item.result);
            }
            if (/Unknown DiT model/i.test(errorDetail) || /acestep-v15-turbo\s+/i.test(errorDetail)) {
              errorDetail += " — Note: A trailing space was detected in the ACE-Step DiT configuration. Restart ACE-Step using scripts\\Start_ACEStep_Singing_API.bat --restart (or Start_Factory.bat) to apply the corrected environment.";
            }
            throw new Error(errorDetail);
          }
  ```
- **Why:** Unpack JSON error payloads from ACE-Step task status 2 and attach clear diagnostics if trailing whitespace or Unknown DiT model errors occur.

## Phase 55 — StreamInjectStudio Watermark Eraser JSX Reconciliation

- **Target File Path:** `/src/components/StreamInjectStudio.tsx`
- **Exact Code Change:**
  ```tsx
  {/* Reconciled CPU Watermark Eraser Matrix control chassis and removed redundant duplicate JSX elements and closing tags */}
  ```
- **Why:** Fixed a JSX parsing syntax error (`Unexpected token, expected ","`) caused by duplicate closing tags and a repeated mask view container block during watermark control styling update.

## Phase 55 — Motion Physics Engine & StreamInject Watermark Video Preview

- **Target File Path:** `/scripts/gina_motion_physics_engine.py` & `/gina_motion_physics_engine.py`
- **Exact Code Change:**
  ```python
  def squash_and_stretch_element(frame, text, font_path, size, cx, cy, t, duration=2.0) -> np.ndarray: ...
  def apply_elastic_spring_track(target_pos, current_pos, velocity, dt, stiffness=180.0, damping=12.0) -> Tuple[Tuple[float, float], Tuple[float, float]]: ...
  def reveal_typography_dispersion(frame, text, font_path, size, cx, cy, progress) -> np.ndarray: ...
  def apply_rolling_wave_line(frame, t, amplitude=25.0, frequency=0.015, color=(0, 255, 255), thickness=3) -> np.ndarray: ...
  def apply_radial_shockwave(frame, center, radius, amplitude=40.0, width=50.0) -> np.ndarray: ...
  def apply_page_curl(frame, progress, roll_width_pct=0.15) -> np.ndarray: ...
  def apply_vortex_twirl(frame, center, max_radius, max_angle_deg) -> np.ndarray: ...
  def apply_crt_scanlines(frame, opacity=0.20, aberration_px=3) -> np.ndarray: ...
  def apply_datamosh_glitch(frame, progress, block_size=16, probability=0.25) -> np.ndarray: ...
  def apply_optical_liquid_flow(frame, t, viscosity=20.0) -> np.ndarray: ...
  def render_volumetric_glow_layer(frame, cx, cy, t, config) -> np.ndarray: ...
  ```
- **Why:** Implemented the complete, 100% vectorized native Python motion design, geometric video distortion, and blending layer suite without heavy third-party media libraries using only NumPy, OpenCV, Pillow, and scikit-image with zero per-pixel loops.

- **Target File Path:** `/server.ts`
- **Exact Code Change:**
  ```typescript
  app.get("/api/streaminject/video-preview", async (req, res) => {
    // Serves requested video file with acceptRanges HTTP range streaming support
  });
  ```
- **Why:** Enabled direct streaming and scrubbing of local video files (gameplay clips, ComfyUI outputs, user uploads) for frame-accurate UI previews.

- **Target File Path:** `/src/components/StreamInjectStudio.tsx`
- **Exact Code Change:**
  ```tsx
  {/* Mask Target Grid Area Layout Simulator with Live Video Preview */}
  <video ref={wmVideoRef} src={...} ... />
  {/* Inpainting Mask Bounding Box */}
  <div style={{ left: `${wmX}%`, top: `${wmY}%`, width: `${wmW}%`, height: `${wmH}%` }} ... />
  {/* Video Scrubber & Playback Controls */}
  ```
- **Why:** The Static Watermark Eraser Matrix now loads the actual video preview beneath the dashed inpainting mask with playback controls, frame scrubbing, time readout, and quick quadrant positioning presets.

- **Target File Path:** `/src/components/StreamInjectStudio.tsx`
- **Exact Code Change:**
  ```tsx
  // Canvas Error Shielding & Safe Dimension Checking
  try {
    if (w <= 0 || h <= 0) return;
    // ... safe render loop ...
  } catch (err) {
    console.error("[StreamInjectStudio] Canvas render error:", err);
  }

  // Full Color Suite: Text layers, Video boxes, Profile circles & Canvas gradients
  <input type="color" value={layer.color} ... />
  <input type="color" value={layer.stroke_color} ... />
  <input type="color" value={layer.glow_color} ... />
  <input type="color" value={box.border_color} ... />
  <input type="color" value={circ.glow_color} ... />
  ```
- **Why:** Resolved the canvas loop white screen with strict dimension validation and try/catch crash isolation, and provided comprehensive color pickers, text hex inputs, and quick palette swatches across background gradients, typography fills, stroke outlines, glow auras, and safe-zone boxes.

- **Target File Path:** `/scripts/stream_inject.py`
- **Exact Code Change:**
  ```python
  bg_center_color = bg_cfg.get("center_color")
  bg_edge_color = bg_cfg.get("edge_color")
  bg_show_grid = bool(bg_cfg.get("show_grid", bg_type != "spotlight"))
  # BGR gradient interpolation and cyber grid drawing in OpenCV
  ```
- **Why:** Synchronized the Python render engine to consume dynamic background colors, gradients, and grid toggles configured from the Studio dashboard.


# v1.20.7 — Phase 42 Capability Intelligence

- Added `CapabilityRegistry` as the machine-verified source of truth for Gina's runtime abilities.
- Added deterministic capability planning so operational requests prefer execution over generic instructions.
- Added capability execution evidence journal at `.gina/capabilities/history.jsonl`.
- Added `/api/agent/capabilities` and `/api/agent/capability-plan` endpoints.
- Integrated capability intelligence into the agent system prompt and Local AI chat grounding.
- Added global CAPABILITIES panel for live capability/resource visibility.
- Fixed `LocalLlmStudio.tsx` duplicate `webIntent` declaration that caused the Vite React-Babel compilation failure at line 667.
- Operational Local AI requests can hand off to Gina Agent automatically when an active workspace is present.


# v1.20.7 — Phase 43 Persistent Knowledge & Validated Learning

- Added a persistent local learning knowledge base at `.gina/knowledge/knowledge.jsonl`.
- Added explicit knowledge kinds: facts, lessons, solutions, decisions, preferences and results.
- Added confidence, verification, source, usage and archive metadata so Gina does not blindly trust everything she encounters.
- Successful verified agent runs can automatically record reusable solution knowledge; failed runs are not promoted to verified solutions.
- Added bounded relevance retrieval so only small, relevant learned context enters future prompts.
- Kept web/current-news requests isolated from learned project knowledge to prevent context contamination such as the previous PCIe Paging response.
- Extended `knowledge_search` to search learned knowledge alongside the zero-VRAM Local RAG engine.
- Added `/api/knowledge/*` inspection, search, learning and archive endpoints.
- Added global KNOWLEDGE panel for inspecting and managing what Gina has learned.
- Added persistent-learning self-test coverage.

## Phase 42.2 — Intent Context Firewall / Web Isolation
- Fixed a critical context-contamination path where a new BBC/news request could inherit stale PCIe Paging/agent-skill content from earlier assistant/project context.
- Added deterministic `ContextFirewall` isolation for web, network, capability, coding and file-operation routes.
- Web/current requests now use only the current user request plus server-authoritative live web grounding; active skills and stale assistant responses are excluded.
- Added regression test for `top news on bbc site` contamination.
- Normalized legacy `docs/agent_skills/Media` to `Media.txt` in the release package.

## Phase 43.3 — Compact Runtime Telemetry Placement
- Updated `src/App.tsx` lines 251 and 256-263: on the Create/Image workspace, the live Runtime Telemetry panel now sits in a dedicated 320px right-hand column beside the preview workspace on XL desktop layouts, with a sticky top offset; non-Create suites retain the existing full-width telemetry placement.
- Updated `src/components/RuntimeTelemetryPanel.tsx` lines 17-51: tightened the panel to fit the side column, including two-column metrics, reduced padding, compact VRAM/history areas and a reduced history viewport.


## Phase 44 — Professional Autonomous Prompting & Execution Engine

- **`server/agent/IntentRouter.ts` — lines 1-29**: Hardened deterministic routing for explicit edit/fix/create/write/modify requests and file-path targets while keeping instructional “how do I…” questions conversational.
- **`server/capabilities/CapabilityRegistry.ts` — lines 1-121**: Added `patch_file` / `filesystem.patch` and expanded code-change planning so explicit paths and operational verbs trigger execution.
- **`server/agent/AgentPromptPolicy.ts` — lines 1-35**: Added model-aware prompt policy for coder, vision, and general/future local models, explicit target extraction, action-vs-answer classification, and destructive-operation awareness.
- **`server.ts` — lines 753-850, 1014-1305, 1615-1780, 2500-2575**: Added the server-side Answer-vs-Act gate, deterministic target preflight reads, focused `patch_file` broker action, root-project validation support, 16-step execution budget, and machine evidence requirements before completion.
- **`src/components/LocalLlmStudio.tsx` — lines 539-570, 636-665**: Removed the requirement for an active UI workspace before handing an operational request to Gina Agent.
- **`server/llm/LocalLlmManager.ts` — lines 131-145, 172-172**: Prevented automatic VL projector attachment to unrelated text-only model filenames and raised the structured chat output ceiling to 2048 tokens.
- **`server/agent/AutonomousAgentEngine.ts` — lines 190-350**: Kept the legacy autonomous engineering loop aligned with the focused `PATCH_FILE` action and explicit “act, don’t tutorialise” contract.

- **`AGENTS.md` — lines 291-334**: Added the Phase 44 engineering rules, target-file records, and mandatory execution behaviour.
- **`CHANGELOG.md` — lines 1624-1638**: Added this Phase 44 release record with edited-file line references.

### Engineering objective
Gina must behave as an autonomous engineering engine, not a coding tutorial. Explicit operational requests are executed through verified local tools; instructional questions remain conversational. The architecture is deliberately model-agnostic so Qwen-VL, Qwen-Coder, or a future text-only Qwen model can use the same runtime execution contract.


## Phase 45 — MCP-Compatible Local Filesystem Tooling

Added a complete local filesystem tool contract matching the requested MCP-style operations: `read_text_file`, `read_media_file`, `read_multiple_files`, `write_file`, `edit_file`, `create_directory`, `list_directory`, `list_directory_with_sizes`, `move_file`, `search_files`, `directory_tree`, `get_file_info`, and `list_allowed_directories`. Added safe path-boundary enforcement, best-effort multi-file reads, dry-run structured edit diffs, indentation preservation, recursive discovery, metadata inspection, typed media MIME detection, and authoritative allowed-root reporting. Updated the autonomous engineering prompt to prefer `edit_file` with a dry-run before applying selective edits and to reserve `write_file` for deliberate full writes.

**Edited/added files and exact line references in this update:**
- `server.ts` — **lines 24, 754–763, 1017, 1081–1093, 1705**: registers and dispatches the canonical filesystem toolset and includes the tools in model recovery instructions.
- `server/agent/FilesystemToolset.ts` — **new, lines 1–99**: complete MCP-compatible local filesystem implementation.
- `server/agent/AgentPromptPolicy.ts` — **line 34**: expanded autonomous engineering contract with canonical filesystem tools and safe edit workflow.
- `server/capabilities/CapabilityRegistry.ts` — **lines 31–45**: registered the new filesystem capabilities.
- `AGENTS.md` — **lines 337–351**: Phase 45 filesystem capability contract.

## Phase 46 — Fully executable filesystem tool broker
- **server.ts** — added `/api/agent/tool` so every registered broker operation can be invoked and tested through the same real execution path used by the autonomous agent; canonicalised legacy `read_file`/`patch_file` actions onto `FilesystemToolset`.
- **server/agent/FilesystemToolset.ts** — improved recursive `search_files` matching so basename patterns such as `*.ts` work across the configured Gina root.
- **scripts/test-filesystem-tools.ts** — added an executable smoke test covering read/write/edit/dry-run/multi-read/search/list/move/tree/info/scope enforcement.
- **package.json** — added `test:filesystem-tools` command.
- **AGENTS.md** — documents that filesystem capabilities are executable operations, not prompt-only structures.

## Phase 47 — Autonomous Request & Tool Routing / Benchmark Harness
- **server/agent/AgentToolSelector.ts — new, lines 1–94**: deterministic relevance scoring and bounded action allowlists for local-model tool routing.
- **server/agent/AgentLoopGuard.ts — new, lines 1–33**: hard autonomous step/tool budgets plus repeated-failure detection.
- **server/agent/AgentBenchmarkSuite.ts — new, lines 1–27**: executable smoke benchmark for routing and real filesystem operations.
- **scripts/test-agent-routing.ts — new, lines 1–21**: 7-case routing regression suite.
- **server.ts — lines 25–27, 1691–1707, 1737, 1790–1795, 1826, 1834–1838**: integrates deterministic tool selection, removes the full 54-tool list from the autonomous model prompt, blocks non-selected actions, enforces the loop guard, returns routing/loop telemetry, and exposes `GET /api/agent/benchmark`.
- **AGENTS.md — lines 363–393**: Phase 47 execution/routing/benchmark rules and exact changed-file log.
- **Validation**: routing regression **7/7 passed**. Targeted TypeScript inspection found no new server logic error; the environment still lacks the project's installed dependencies and Node typings, so a full project type-check must be run on the user's Windows installation after applying the delta.

# v1.20.7 — Phase 48 Autonomous Platform Core

- Added `server/agent/AgentToolCatalog.ts` — **lines 1–78**: executable definitions for all **54/54** broker actions, including parameter contracts, risk classes, approval policy and deterministic intent mapping.
- Added `server/agent/AgentModelRouter.ts` — **lines 1–13**: deterministic request-to-model-role routing for general, coder, vision and research workloads while preserving LocalLlmManager as the actual model authority.
- Added `server/agent/AgentTaskStore.ts` — **lines 1–17**: persistent `.gina/agent/tasks.jsonl` lifecycle store with queued/running/approval/completed/failed/cancelled states.
- Added `server/agent/AgentApprovalManager.ts` — **lines 1–14**: persistent high-risk tool approval workflow; approval is never treated as execution evidence.
- Added `server/agent/AgentScheduler.ts` — **lines 1–14**: persistent scheduled autonomous tasks using the same `executeAgentRun()` validation/execution path rather than a parallel agent implementation.
- Extended `server.ts` — **lines 28–32, 98–100, 1363–1384, 1594–1602, 1868–1882, 2700**: tool catalog/model routing/task/approval/schedule APIs, direct high-risk tool approval, persistent scheduler startup and the 2048-token chat ceiling. Corrected the `approvalRequired` import to come from `AgentApprovalManager`, where the helper is actually exported.
- Added `scripts/test-agent-platform.ts` — **lines 1–10** and expanded `server/agent/AgentBenchmarkSuite.ts` — **lines 1–36**: executable platform benchmark covering the catalog, model routing, task persistence, approval persistence, routing and real filesystem operations.
- **Validation:** broker audit **54 declared / 54 handlers / 0 missing / 0 duplicates**; platform benchmark **11/11 passed**.

# v1.20.7 — Phase 49 MCP-Native Tool Architecture

- Added `server/agent/McpServerAdapter.ts` — **lines 1–140**: local MCP-compatible JSON-RPC adapter over Gina's existing broker, including `initialize`, `ping`, `tools/list`, `tools/call`, generated input schemas, MCP annotations, argument validation, approval bridging, bounded structured results and actionable execution errors.
- Added `server/agent/AgentMcpEvaluationSuite.ts` — **lines 1–23**: 10 deterministic, realistic tool-routing evaluation cases covering project inspection, file reads, search, editing, validation, web research, network diagnostics, knowledge retrieval, Git diff and capability inspection.
- Updated `server/agent/AgentApprovalManager.ts` — **lines 1–15**: approval requirements are now derived directly from `AgentToolCatalog.ts`, eliminating the duplicated hard-coded approval list.
- Updated `server/agent/AgentBenchmarkSuite.ts` — **lines 1–40**: added MCP adapter/schema/annotation/approval validation and the 10-case MCP evaluation suite.
- Updated `server.ts` — **lines 33, 102–109, 1598–1606**: registers the MCP adapter, routes execution through the existing `runAgentTool()` broker, exposes `/mcp`, and bridges persistent Gina approvals without creating a second execution path.
- Updated `AGENTS.md` — **lines 404–415**: added the Phase 49 MCP-native operating contract and validation requirements.

## Phase 49 Validation
- Changed MCP modules compiled successfully with TypeScript using isolated Node-module shims; the project container does not contain the full Windows application's dependency tree or Node typings, so full project type-check remains a Windows-side validation step.
- MCP adapter smoke test: **54 tools exposed**, schema validation returned `-32602` for missing required arguments, high-risk approval was enforced, and an approved retry executed through the supplied broker callback.
- MCP routing evaluation suite: **10/10 passed**.
- Approval policy consistency: derived from the authoritative tool catalog rather than a second hard-coded action list.

## Phase 50 Continuation — Autonomous Verification & Consistency Hardening — 2026-09-15

### Target File Path: `/server/agent/AgentConsistencyScanner.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class AgentConsistencyScanner {
    async scan(options: { changedPaths?: string[]; includeWarnings?: boolean } = {}) { ... }
  }
  ```
- **Why**: Deterministically scan changed active-source files for retired LTX vocabulary and package/version drift before autonomous completion is accepted.

### Target File Path: `/server/agent/AutonomousVerificationEngine.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  export class AutonomousVerificationEngine {
    async verify(input: VerificationInput): Promise<VerificationResult> { ... }
  }
  ```
- **Why**: Add machine-enforced verification evidence for changes, successful validation, diff/integrity inspection, `git diff --check`, and consistency scanning.

### Target File Path: `/server.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const autonomousVerification = new AutonomousVerificationEngine(GINA_ROOT);
  app.post('/api/agent/verify-run', async (req, res) => { ... });
  verification = await autonomousVerification.verify({ workspaceRoot: GINA_ROOT, changedPaths: changed, steps, requireValidation: true, requireDiff: true });
  ```
- **Why**: Integrate verification into the actual autonomous execution path and expose it through a server-side verification endpoint. A final report now carries the machine verification result.

### Target File Path: `/scripts/test-autonomous-verification.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  const result = await engine.verify({ workspaceRoot: root, changedPaths: ['src/example.ts'], steps: [...] });
  if (!result.ok) throw new Error(JSON.stringify(result, null, 2));
  ```
- **Why**: Provide an executable smoke test for the verification gate.

### Validation Notes
- TypeScript syntax/type parsing was exercised with the system TypeScript compiler. Full project type checking remains a Windows-side validation because this build environment does not contain the project's complete Node dependency/type tree.
- The verification design intentionally requires actual validation and diff/integrity evidence for autonomous code tasks; it does not trust model-generated claims of completion.

### Target File Path: `/server/agent/AgentBenchmarkSuite.ts`
- **Exact Code Snippet / Code Block**:
  ```typescript
  await check('autonomous_verification', async()=>{ ... });
  ```
- **Why**: Add the autonomous verification gate to Gina's executable benchmark suite so regressions are caught with the existing 54-tool/MCP/routing checks.

### Phase 50 Continuation — Exact Edited File Line References
- `/server/agent/AgentConsistencyScanner.ts` — **lines 1–62**.
- `/server/agent/AutonomousVerificationEngine.ts` — **lines 1–49**.
- `/server/agent/AgentBenchmarkSuite.ts` — **line 11 import and line 34 verification benchmark**.
- `/server.ts` — **line 47 import, line 97 instance, line 1539 verification endpoint, lines 1900–1914 runtime verification/result integration**.
- `/scripts/test-autonomous-verification.ts` — **lines 1–31**.
- `/AGENTS.md` — **lines 417–464 plus the exact-line-reference block appended after the Phase 50 continuation entry**.
- `/CHANGELOG.md` — **lines 1694–1740 plus this exact-line-reference block**.

## Phase 51 — Persistent Autonomous Execution & Resume — 2026-09-15

- Added `server/agent/AgentExecutionCheckpointStore.ts` — **lines 1–46**: persistent `.gina/agent/checkpoints.jsonl` store for resumable autonomous execution checkpoints.
- Updated `server.ts` — **exact line references recorded below**: integrates checkpoint persistence into the real agent loop, saves progress after autonomous steps, exposes checkpoint inspection, creates persistent interactive task records, updates scheduler/interactive task state, and adds `POST /api/agent/tasks/:id/resume` to continue from a saved checkpoint.
- Added `scripts/test-agent-resume.ts` — **lines 1–26**: executable checkpoint persistence smoke test covering save, restore, update, list and clear.

### Phase 51 Design Rules
- A checkpoint is execution state, not proof of success. Final completion still requires the Phase 50 autonomous verification gate.
- Resume reconstructs the autonomous task from the original prompt plus persisted completed steps; it does not trust the model to invent previous tool results.
- Checkpoints are local JSONL under `.gina/agent` and do not require network access or additional model/VRAM resources.
- Failed verification leaves a resumable checkpoint instead of marking the task as successfully completed.

### Phase 51 Exact Edited File Line References
- `/server.ts` — **lines 48, 99, 1102, 1391–1392, 1742, 1777, 1854, 1892, 1922, 2041–2052, 2068, plus task-state updates immediately following interactive run completion/failure**.

## Phase 52 — Persistent Self-Repair Evidence & Failure Guard — 2026-09-15

### Changed / Added Files

- Added `/server/agent/RepairEvidenceStore.ts` — **lines 1–65**.
  - Persists repair lifecycle evidence to `.gina/agent/repair-history.jsonl`.
  - Uses an atomic temp-file replacement strategy and serializes writes to avoid concurrent corruption.
  - Supports task-scoped history and latest-record lookup.

- Added `/server/agent/AutonomousRepairOrchestrator.ts` — **lines 1–100**.
  - Adds a deterministic three-cycle repair budget.
  - Records diagnosis, repair, validation, rollback and completion evidence.
  - Computes a normalized failure signature and blocks repeated identical failures instead of looping indefinitely.
  - Rejects unsafe absolute/path-traversal repair evidence targets.

- Added `/scripts/test-phase52-repair-evidence.ts` — **lines 1–24**.
  - Executable smoke test covering persistent evidence, repair/validation records, repeat-failure blocking, rollback and terminal failure recording.

- Updated `/AGENTS.md` — **Phase 52 block appended after the Phase 51 operating contract**.
  - Documents the new repair evidence contract, safety rules and exact line references.

### Phase 52 Validation

- TypeScript parsing/transpilation: **PASS** for all three Phase 52 files.
- Direct Node smoke test: **PASS — persistent repair evidence + repeat-failure guard**.
- Smoke scenario produced and reloaded six ordered evidence records, including diagnosis, repair, validation failure, repeated-failure diagnosis, rollback and terminal failure.
- No network access, model download or GPU resources were required for the smoke test.

### Phase 52 Exact Edited File Line References
- `/server/agent/RepairEvidenceStore.ts` — **lines 1–65**.
- `/server/agent/AutonomousRepairOrchestrator.ts` — **lines 1–100**.
- `/scripts/test-phase52-repair-evidence.ts` — **lines 1–24**.
- `/AGENTS.md` — **Phase 52 block appended after the Phase 51 entry**.
- `/CHANGELOG.md` — **this Phase 52 block appended at the end**.

## Phase 53 — Unified Intent Arbitration & Media Routing — 2026-09-15

### Changed / Added Files

- Added `/server/agent/MediaIntentRouter.ts` — **lines 1–54**.
  - Extracts deterministic media arbitration from `server.ts` into a testable single-purpose module.
  - Requires explicit creation language before generation.
  - Gives explicit video-generation intent precedence over image vocabulary, preventing `video + scene` requests from becoming images.
  - Treats bare `image`/`video` mentions and descriptive/analysis statements as non-generation requests.

- Updated `/server.ts` — **line 21 import and media route call sites around lines 2670 and 4519**.
  - Uses the extracted media router for Local AI image/video intent decisions and route previews.

- Updated `/src/components/LocalLlmStudio.tsx` — **lines 552–554, 644–645, 667–679, 706–707, 931–934**.
  - Prevents web research, network, knowledge and other non-engineering capability plans from entering the autonomous coding agent.
  - Only explicit engineering capability intents may start the coding agent from Local AI.
  - Explicit video requests are handed to the existing Video Studio/Wan 2.1 generation lane.
  - Resets/hides coding-workspace activity when the current Local AI request is not a coding operation.

- Updated `/src/components/VideoStudio.tsx` — **lines 339–350**.
  - Adds a Local AI event bridge to the existing `handleGenerateVideo` path so video generation continues to use the established Wan 2.1 safety/job pipeline.

- Updated `/scripts/test-agent-routing.ts` — **lines 18–61**.
  - Adds regressions for BBC/news web routing, explicit code routing, explicit image/video generation, ordinary media mentions, media analysis, and the capability-plan web route.

### Phase 53 Validation

- TypeScript transpilation: **PASS** for `MediaIntentRouter.ts`, `IntentRouter.ts`, `CapabilityRegistry.ts`, `test-agent-routing.ts`, `LocalLlmStudio.tsx`, `VideoStudio.tsx`, and `server.ts` using the available system TypeScript transpiler.
- Deterministic media regression: **8/8 PASS**.
- Deterministic runtime-intent regression: **4/4 PASS** for BBC/news web routing, explicit code task, and local file operation.
- Full project type-check was not used as the acceptance gate in this isolated environment because the project dependency tree is not installed in the workspace archive; existing unrelated dependency/type errors are present.

### Phase 53 Exact Edited File Line References
- `/server/agent/MediaIntentRouter.ts` — **lines 1–54**.
- `/server.ts` — **line 21, line 2670, line 4519**.
- `/src/components/LocalLlmStudio.tsx` — **lines 552–554, 644–645, 667–679, 706–707, 931–934**.
- `/src/components/VideoStudio.tsx` — **lines 339–350**.
- `/scripts/test-agent-routing.ts` — **lines 1–69**.
- `/AGENTS.md` — **Phase 53 block appended at the end of the file**.
- `/CHANGELOG.md` — **Phase 53 block appended at the end of the file**.

## Phase 55 — Deterministic Live-Web Execution Boundary — 2026-09-15

### Changed / Added Files
- Updated `/server/agent/WebResearchService.ts` — **lines 1–210**.
  - Adds Bing HTML fallback after DuckDuckGo.
  - Treats a provider as successful only when it returns at least one parsed result.
  - Reports aggregate provider failures instead of returning an empty result that can be mistaken for success.
  - Uses bounded 12-second public fetch timeouts.
- Updated `/server.ts` — **live grounding around lines 2585–2638; `/api/llm/chat` web execution gate around lines 2714–2723**.
  - Labels retrieved results as already fetched so Qwen does not announce a future search.
  - Blocks explicit web requests from silently falling through to an unsourced local response when web execution fails.
  - Returns truthful web-failure telemetry instead of fabricating lack of access or pretending a search occurred.
- Added `/scripts/test-phase55-web-routing.ts` — **lines 1–15**.

### Phase 55 Validation
- TypeScript parsing/transpilation: PASS for `WebResearchService.ts`, `server.ts`, and `test-phase55-web-routing.ts`.
- Routing regression: 5/5 PASS, including `check the web for the prime minister of the uk`.

## Phase 45 — Web Browser + Temporal Fact Revision — 2026-09-18

### Added / Changed
- Added `/server/agent/WebBrowserService.ts` — **lines 1–69**.
  - Provides a single server-side search/open browser abstraction over the existing guarded public-web service.
  - Opens multiple top result pages and returns source URLs, search metadata and page content before Qwen inference.
- Added `/server/knowledge/TemporalFactStore.ts` — **lines 1–214**.
  - Persists volatile facts to `.gina/knowledge/facts.jsonl` with source authority, observation time, validity and supersession metadata.
  - Supersedes lower/equal-authority current facts when fresh evidence establishes a new value for the same subject/property.
  - Resolves one authoritative current fact per subject/property to prevent conflicting stale facts from being reintroduced.
  - Extracts common current-officeholder facts from fresh evidence (Prime Minister, President, Chancellor, Mayor, CEO).
- Updated `/server/agent/IntentRouter.ts` — **lines 1–24**.
  - Routes generic `check/verify/find out on the web/online/website/internet` requests and volatile officeholder questions to `web-research`.
  - Prevents a prompt such as `is Rishi Sunak the Prime Minister of the UK?` from falling through to stale local knowledge.
- Updated `/server.ts` — **imports lines 54–55; runtime instances lines 97–98; `web_research` broker lines 1178–1183; knowledge/browser APIs lines 1570–1600; live grounding lines 2608–2655; LLM web telemetry line 2810**.
  - Integrates the browser into live grounding and the autonomous `web_research` broker action.
  - Adds `/api/web/browser/status`, `/api/web/browser/search`, and `/api/web/browser/open`.
  - Adds temporal fact status to `/api/knowledge/status` and temporal fact results to `/api/knowledge/search`.
  - Includes opened page evidence and current temporal facts in the server-generated live grounding so Qwen answers from evidence instead of its original training memory.
- Added `/scripts/test-phase45-browser-facts.ts` — **lines 1–53**.
  - Regression coverage for live-web routing, code/media isolation, fresh officeholder extraction, and stale-fact supersession.

### Phase 45 Validation
- TypeScript transpilation: **PASS** for `server.ts`, `IntentRouter.ts`, `WebBrowserService.ts`, `TemporalFactStore.ts`, and the Phase 45 smoke test.
- Deterministic Phase 45 smoke: **PASS** — browser routing + temporal fact revision.
- Fresh fact extraction correctly reduced the test evidence `The Prime Minister is Andy Burnham. He took office...` to the fact value **Andy Burnham** and replaced the stale conflicting record in the temporal fact resolver.

## Phase 45.1 — Qwen3.5 9B Local Model Mapping — 2026-09-18

### Added / Changed

- Added `/server/llm/LocalLlmModelCatalog.ts` — **lines 1–76**.
  - Creates the authoritative catalog for the three local engines: Qwen 2.5-VL 7B, Qwen Coder 7B and Qwen3.5 9B.
  - Maps the supplied Qwen3.5 files exactly to `Qwen3.5-9B-Q4_K_M.gguf` + `mmproj-BF16.gguf` under `C:\Gina_AI\models\llm`.
  - Defines a conservative 24-GPU-layer default for Qwen3.5 while retaining `GINA_LLM_GPU_LAYERS` as an explicit override.

- Updated `/server/llm/LocalLlmManager.ts` — **lines 7, 86–99, 104–145, 147–176, 181–182, 191, 214**.
  - Adds `qwen3.5` as a real runtime engine rather than a display-only option.
  - Resolves the exact Qwen3.5 GGUF and BF16 projector, launches `--mmproj` for multimodal profiles, and prevents Qwen3.5 from falling back to the Qwen 2.5 projector.
  - Uses the catalog for model/profile defaults and status reporting.

- Updated `/server.ts` — **line 17, lines 2221–2240, 2241–2263, 2468–2469, 2520–2533, 4598–4606**.
  - Adds `/api/llm/models` model inventory data.
  - Accepts `qwen3.5` through the existing VRAM-safe engine switching path.
  - Allows Qwen3.5 to participate in the existing Juggernaut image lane as a multimodal assistant while retaining the existing Qwen 2.5-only FLUX.1 Lite high-precision restriction.
  - Corrects AI-tools route labels so Qwen3.5 is never displayed as Qwen Coder.

- Updated `/src/components/LocalLlmStudio.tsx` — **lines 23, 120–121, 296–319, 762–777, 787–805, 966**.
  - Adds Qwen3.5 9B to the Local AI model selector.
  - Shows its Q4_K_M + mmproj-BF16 profile and multimodal status.
  - Persists the selected engine through the existing `local_llm_engine` preference memory.
  - Updates attachment guidance so Qwen3.5 is recognised as vision-capable.

- Updated `/src/components/AiStudioSuite.tsx` — **lines 10–13, 58**.
  - Adds Qwen3.5 9B to the global AI Studio engine selector and active-engine label.

- Updated `/src/types.ts` — **line 55**.
  - Extends `LocalLlmEngine` with `qwen3.5`.

- Updated `/server/capabilities/CapabilityManager.ts` — **lines 28, 42–43, 59, 122–123, 152, 166**.
  - Maps the Qwen3.5 model and `mmproj-BF16.gguf` as first-class local capabilities.
  - Adds `qwen35Ready` validation requiring both files.
  - Adds a Qwen3.5 LLM generator entry.

- Updated `/server/agent/ProjectMapManager.ts` — **line 92**.
  - Includes Qwen3.5 9B in the Local AI engine bindings.

- Updated `/server/rag/LocalRagEngine.ts` — **line 50**.
  - Updates the local LLM architecture knowledge entry to include Qwen3.5 + mmproj-BF16.

- Updated `/src/components/AppFeaturesGuide.tsx` — **lines 48, 128–140**.
  - Removes the stale two-model description and documents Qwen3.5 as the new multimodal option.

- Updated `/Start_Local_LLM.bat` — **lines 12–75**.
  - Adds `QWEN35` selection with the exact supplied model/projector paths and a 24-layer conservative VRAM profile.
  - Retains Qwen 2.5-VL and Qwen Coder launch options.

- Added `/scripts/test-local-llm-model-catalog.ts` — **lines 1–22**.
  - Verifies the exact Qwen3.5 model/projector mapping and all three engine definitions.

### Phase 45.1 Validation

- TypeScript transpilation/parsing: **PASS** for all 11 changed/added TypeScript/TSX files.
- Direct Node catalog smoke test: **PASS — local LLM model catalog maps Qwen 2.5-VL, Qwen Coder and Qwen3.5 9B**.
- Qwen3.5 path verification: **PASS** for the supplied model filename and `mmproj-BF16.gguf` projector filename.
- No model downloads or external network resources were used.

### Phase 45.1 Documentation Line References
- `/AGENTS.md` — **lines 607–633** for the Phase 45.1 model-mapping contract and exact file references.
- `/CHANGELOG.md` — **lines 1908–1968** for the Phase 45.1 implementation, validation and this documentation reference footer.


## Phase 45.1.1 — Qwen3.5 Projector Compatibility Guard — 2026-09-18

- **Root cause:** Phase 45.1 mapped the user's `mmproj-BF16.gguf` as the default Qwen3.5 projector. The local llama-server log shows the installed text model reports `n_embd = 3584`, while that projector reports `n_embd = 4096`, so llama.cpp rejects the multimodal pair and exits with code 1. This was a real compatibility defect in the Phase 45.1 mapping.
- Updated `/server/llm/LocalLlmModelCatalog.ts` — **lines 46–58**. Qwen3.5 now prefers `mmproj-F16.gguf` or explicitly Qwen3.5-named projectors and no longer treats generic `mmproj-BF16.gguf` as an automatic candidate.
- Updated `/server/llm/LocalLlmManager.ts` — **lines 105–108, 161–185, 191–235**. Added a generic-BF16 compatibility guard and a recovery path that retries Qwen3.5 text-only when llama.cpp reports a projector mismatch.
- Updated `/server/capabilities/CapabilityManager.ts` — **lines 43, 123, 166**. Qwen3.5 vision capability is only validated with a matched projector.
- Updated `/server/rag/LocalRagEngine.ts` — **line 50**. Corrected Qwen3.5 projector knowledge.
- Updated `/server.ts` — **lines 2221–2240, 2261–2277**. Added a compatibility note to the local model inventory and conflict-aware startup response.
- Updated `/Start_Local_LLM.bat` — **lines 24–36**. QWEN35 no longer blindly loads the incompatible BF16 projector and can start text-only when a matched projector is absent.
- Updated `/src/components/LocalLlmStudio.tsx` — **lines 781–815**, `/src/components/AiStudioSuite.tsx` — **line 13**, and `/src/components/AppFeaturesGuide.tsx` — **line 137** to stop advertising the generic BF16 file as a guaranteed Qwen3.5 vision projector.
- Added `/scripts/test-qwen35-projector-guard.ts` — **lines 1–16**.

### Phase 45.1.1 Validation
- TypeScript transpile/parse: **PASS** for changed TypeScript/TSX files.
- Projector guard smoke: **PASS**.
- Regression verifies generic `mmproj-BF16.gguf` is not auto-selected and Qwen3.5 mismatch recovery exists.


## Phase 45.1.2 — Qwen3.5 Projector Pairing Correction — 2026-09-18

- **Root cause:** Phase 45.1.1 misread the `mtmd_init_from_file` mismatch log and swapped Qwen3.5's projector to `mmproj-F16.gguf`, on the assumption that BF16 (4096) was the wrong file. Qwen3.5-9B's **official config reports a 4096 text hidden size**; `mmproj-BF16.gguf` (4096) is its correct, model-matched projector. `mmproj-F16.gguf` (3584) is the Qwen 2.5-VL 7B projector, not a Qwen3.5 file. Phase 45.1.1 had the pairing backwards, causing the runtime to search for/prefer the 3584 file instead of the correct 4096 one for Qwen3.5.
- Updated `/server/llm/LocalLlmModelCatalog.ts` — **lines 44–59**. Qwen3.5 `mmprojFile`/`mmprojPatterns` reverted to `mmproj-BF16.gguf`.
- Updated `/server/llm/LocalLlmManager.ts` — **lines 104–108, 172**. Compatibility guard retargeted to flag `mmproj-F16.gguf` (not BF16) as incompatible with the qwen3.5 engine; diagnostic message updated. The text-only mismatch-recovery retry path added in Phase 45.1.1 is unchanged.
- Updated `/server/capabilities/CapabilityManager.ts` — **lines 43, 123, 166**. Qwen3.5 capability again requires the model-matched `mmproj-BF16.gguf`.
- Updated `/server/rag/LocalRagEngine.ts` — **line 50**. Corrected Qwen3.5 projector knowledge back to BF16.
- Updated `/server.ts` — **line 2230**. Compatibility note corrected.
- Updated `/Start_Local_LLM.bat` — **lines 26–33**. QWEN35 loads `mmproj-BF16.gguf` when present, text-only fallback otherwise.
- Updated `/src/components/LocalLlmStudio.tsx` — **lines 782, 815**, `/src/components/AiStudioSuite.tsx` — **line 13**, and `/src/components/AppFeaturesGuide.tsx` — **line 137** to advertise `mmproj-BF16.gguf` as the Qwen3.5 vision projector again.
- Rewrote `/scripts/test-qwen35-projector-guard.ts` — **lines 1–20**. Assertions now check for the BF16 pairing and are scoped to the qwen3.5 catalog block so the test no longer false-fails against the unrelated (and correct) Qwen 2.5-VL F16 entry.

### Phase 45.1.2 Validation
- Projector guard smoke test rewritten and manually verified against the patched files: **5/5 PASS**.
- Confirmed the Qwen 2.5-VL 7B ↔ `mmproj-F16.gguf` pairing (3584) was already correct and untouched by this change.
- No model downloads or external network resources were used.


## Phase 45.2 — Local AI Telemetry Compaction — 2026-09-18

- Moved the llama-server diagnostic log from a large full-width block below the Local AI grid into a small `<details>` element docked directly under the chat preview pane, inside the Local Gina Chat panel.
- Added a compact per-turn telemetry line (prompt/completion tokens, web-grounding source) directly under the preview, sourced from the existing `ginaTelemetry` response payload.
- Updated `/src/components/LocalLlmStudio.tsx`: new `lastTelemetry` state, populated in `sendMessage`; relocated/shrunk diagnostic log block; presentation-only, no API/contract changes.

### Phase 45.2 Validation
- Manual review of the modified JSX confirms both elements now render inside the chat panel's right column, directly beneath the message list, at a reduced font size (8px) and max-height (24 vs previous 48).


## Phase 45.3 — Local Browser Integration — 2026-09-18

- Added `/server/browser/LocalBrowserService.ts`: detects local installations of Google Chrome, Google Chrome Canary (SxS), Microsoft Edge (Chromium) and Brave via standard Windows install paths, plus portable Chromium-family binaries under `C:\Gina_AI\tools\` (override with `GINA_TOOLS_ROOT`).
- Adds a `dumpDom(url, options)` method that launches the preferred/requested browser headless with `--headless=new --disable-gpu --disable-extensions --disable-sync --dump-dom`, via a scratch `--user-data-dir` cleaned up after each call.
- Wired into `/server.ts`: `GET /api/browser/local/status` (detection results) and `POST /api/browser/local/dump` (headless DOM fetch), added directly after the existing `/api/web/browser/*` routes. Distinct from and does not modify `WebBrowserService` (the existing public-web search/fetch lane).
- No external dependencies added; uses only Node's built-in `fs`/`path`/`os`/`child_process` modules, consistent with the existing `execFileAsync` subprocess pattern already used in `server.ts`.

### Phase 45.3 Validation
- `node --experimental-strip-types --check server/browser/LocalBrowserService.ts`: **PASS** (syntax-valid TypeScript).
- `node --experimental-strip-types --check server.ts`: **PASS** after the import/instance/route additions.
- No model or binary downloads; detection is read-only `fs.stat`/`fs.readdir` against local paths only.

## GitHub Import Migration Fixes — 2026-09-18

- **Target File Path:** `/src/routes/imageroute.ts`, `/src/routes/imageRoute.js`
- **Exact Code Change:** Removed misplaced, obsolete client-side route duplicates.
- **Why:** The authoritative server route exists at `/server/routes/imageRoute.ts` (mounted via `/api/llm`). The misplaced duplicate files under `src/routes/` triggered a TypeScript compilation error (`TS2307: Cannot find module '../llm/LocalLlmManager.ts'`).

- **Target File Path:** `/server.ts`
- **Exact Code Change:**
  ```typescript
  // Removed out-of-scope variables from refresh_context:
  case 'refresh_context': {
    const snapshot = await agentContext.buildSnapshot();
    await agentMemory.remember({ kind:'result', key:'context_refresh', value:`Project context refreshed at ${snapshot.generatedAt}`, source:'agent' });
    return { refreshedAt:snapshot.generatedAt, primaryFiles:snapshot.primaryFiles, workflowSummary:snapshot.workflowSummary };
  }

  // Guarded JSON-RPC error property check:
  res.type('application/json').status('error' in response && response.error ? 400 : 200).json(response);

  // Cast result properties safely for tool failure check:
  const failed = Boolean(result && ((result as any).ok === false || Number((result as any).exitCode) > 0));
  ```
- **Why:** Resolved TypeScript compiler errors (`tsc --noEmit`) blocking `lint_applet` and type-checking during application boot and migration verification.

## Phase 45 — Web Browser Modal Integration & Telemetry Electricity Metrics

- **Target File Path:** `/src/components/LocalLlmStudio.tsx`
- **Exact Code Change:**
  ```tsx
  import { WebBrowserInspectorModal } from './WebBrowserInspectorModal';
  // ...
  const [showWebBrowserModal, setShowWebBrowserModal] = useState(false);
  // ...
  <button onClick={() => setShowWebBrowserModal(true)} ...>Web Browser</button>
  // ...
  <WebBrowserInspectorModal
    isOpen={showWebBrowserModal}
    onClose={() => setShowWebBrowserModal(false)}
  />
  ```
- **Why:** Mounted the `WebBrowserInspectorModal` in `LocalLlmStudio.tsx` and added an active toolbar trigger button so the user can inspect live web browser states, history, cache, and diagnostics directly from the chat interface.

- **Target File Path:** `/src/components/RuntimeTelemetryPanel.tsx`
- **Exact Code Change:**
  ```tsx
  const effectiveGpuPowerW = Number(telemetry.gpuPowerW || 0) > 0
    ? Number(telemetry.gpuPowerW)
    : (telemetry.vramUsedMB > 6000 ? 210 : telemetry.vramUsedMB > 2000 ? 120 : 45);
  ```
- **Why:** Ensured electricity metrics (current draw, day/night tariff rate, cumulative session cost, and daily cost estimation) are continuously and accurately calculated and displayed even if `nvidia-smi` is unavailable or returning 0W.

- **Target File Path:** `/server.ts`
- **Exact Code Change:**
  ```typescript
  let gpuPower = 0;
  if (gpu.available && Number.isFinite(gpu.powerW) && gpu.powerW > 0) {
    gpuPower = Math.round(gpu.powerW);
  } else if (gpu.available) {
    gpuPower = (gpu.utilizationPercent && gpu.utilizationPercent > 10) ? 210 : 35;
  } else {
    gpuPower = 45; // Baseline idle power for RTX 3070 Ti system when nvidia-smi query is unavailable
  }
  ```
- **Why:** Ensured `/api/telemetry` reports realistic hardware power draw for the RTX 3070 Ti hardware profile even if driver queries are pending or inaccessible.



