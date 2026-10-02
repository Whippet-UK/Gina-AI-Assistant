/**
 * Resilient Web App Studio Generator
 * Generates self-contained HTML5 interactive web applications matching user specifications.
 * Serves as an ultra-reliable generation lane when local LLM is offline or GPU VRAM is strained.
 */

export function generate2DRoverSandboxApp(task: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2D AI Rover Physics Sandbox</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Inter:wght@400;500;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    canvas { touch-action: none; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col select-none overflow-x-hidden">
  <!-- Top Navigation & Status Bar -->
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
      <h1 class="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
        <span>2D AI Rover Physics Sandbox</span>
        <span class="text-[10px] mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">LiDAR 8-Ray</span>
      </h1>
    </div>

    <!-- Live Telemetry Badges -->
    <div class="flex items-center gap-2 text-xs mono">
      <div class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded flex items-center gap-1.5 text-slate-300">
        <span class="text-slate-500">FPS:</span>
        <span id="stat-fps" class="text-emerald-400 font-bold">60</span>
      </div>
      <div class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded flex items-center gap-1.5 text-slate-300">
        <span class="text-slate-500">TIME:</span>
        <span id="stat-timer" class="text-cyan-400">00:00.0</span>
      </div>
      <div class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded flex items-center gap-1.5 text-slate-300">
        <span class="text-slate-500">SCORE:</span>
        <span id="stat-score" class="text-amber-400 font-bold">0</span>
      </div>
      <div class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded flex items-center gap-1.5 text-slate-300">
        <span class="text-slate-500">DIST TO GOAL:</span>
        <span id="stat-goal-dist" class="text-purple-400 font-bold">0 px</span>
      </div>
    </div>

    <!-- Quick Action Controls -->
    <div class="flex items-center gap-2">
      <button id="btn-toggle-ai" class="px-3 py-1 text-xs font-semibold rounded border transition-colors bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-purple-400" id="ai-indicator"></span>
        <span id="ai-btn-text">Autonomous AI: OFF</span>
      </button>
      <button id="btn-randomize" class="px-3 py-1 text-xs font-semibold rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
        Randomize Arena
      </button>
      <button id="btn-reset" class="px-3 py-1 text-xs font-semibold rounded border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 transition-colors">
        Reset Episode
      </button>
    </div>
  </header>

  <!-- Main Viewport Layout -->
  <main class="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
    <!-- Canvas Sandbox Viewport -->
    <div class="flex-1 relative rounded-xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex items-center justify-center min-h-[460px]">
      <canvas id="sandboxCanvas" class="w-full h-full block bg-slate-950"></canvas>

      <!-- Canvas HUD Overlay (Top-Left) -->
      <div class="absolute top-3 left-3 bg-slate-900/85 backdrop-blur border border-slate-800 p-2.5 rounded-lg text-[11px] mono space-y-1 pointer-events-none shadow-lg">
        <div class="text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
          <span>Rover Telemetry</span>
          <span id="hud-status" class="text-emerald-400">ACTIVE</span>
        </div>
        <div class="flex justify-between gap-4 text-slate-300">
          <span>Speed:</span>
          <span id="hud-speed" class="text-cyan-300">0.0 px/s</span>
        </div>
        <div class="flex justify-between gap-4 text-slate-300">
          <span>Heading:</span>
          <span id="hud-heading" class="text-slate-200">0.0°</span>
        </div>
        <div class="flex justify-between gap-4 text-slate-300">
          <span>Position:</span>
          <span id="hud-pos" class="text-slate-200">(0, 0)</span>
        </div>
        <div class="flex justify-between gap-4 text-slate-300">
          <span>Control Mode:</span>
          <span id="hud-mode" class="text-amber-400 font-bold">MANUAL (WASD)</span>
        </div>
      </div>

      <!-- Controls Hint (Bottom-Left) -->
      <div class="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-800/80 px-2.5 py-1.5 rounded text-[10px] mono text-slate-400 flex items-center gap-3">
        <span>Drive: <strong class="text-slate-200">WASD / Arrows</strong></span>
        <span>Push: <strong class="text-amber-300">Crates</strong></span>
        <span>Goal: <strong class="text-emerald-300">Glowing Zone</strong></span>
      </div>

      <!-- Console API Reminder (Bottom-Right) -->
      <div class="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur border border-slate-800/80 px-2.5 py-1.5 rounded text-[10px] mono text-slate-400">
        API: <code class="text-purple-300">window.setAITarget(steering, throttle)</code> &amp; <code class="text-purple-300">window.getGameState()</code>
      </div>
    </div>

    <!-- Right Sidebar Telemetry & LiDAR Monitor -->
    <aside class="w-full lg:w-80 flex flex-col gap-3 shrink-0">
      <!-- 8-Ray LiDAR Radar Monitor -->
      <div class="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-3 shadow-lg">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
            LiDAR Raycast Radar (8 Rays)
          </h2>
          <span class="text-[9px] mono text-slate-500">Range: 220px</span>
        </div>

        <!-- 8 Directional LiDAR Ray Meters -->
        <div class="space-y-1.5 mono text-[10px]" id="lidar-bars">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Live Game State JSON Inspector -->
      <div class="flex-1 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 flex flex-col gap-2 min-h-[200px]">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Live API State Feed</h3>
          <span class="text-[9px] mono text-purple-400">getGameState()</span>
        </div>
        <pre id="json-inspector" class="flex-1 bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] mono text-emerald-400/90 overflow-y-auto overflow-x-hidden leading-relaxed whitespace-pre-wrap"></pre>
      </div>

      <!-- Virtual Keyboard Drive Pad -->
      <div class="rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-col items-center gap-1.5">
        <div class="text-[9px] mono uppercase text-slate-500 font-bold">Manual On-Screen Drive</div>
        <div class="flex flex-col items-center gap-1">
          <button id="key-w" class="w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200 active:bg-emerald-500 active:text-slate-950">W</button>
          <div class="flex gap-1">
            <button id="key-a" class="w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200 active:bg-emerald-500 active:text-slate-950">A</button>
            <button id="key-s" class="w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200 active:bg-emerald-500 active:text-slate-950">S</button>
            <button id="key-d" class="w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200 active:bg-emerald-500 active:text-slate-950">D</button>
          </div>
        </div>
      </div>
    </aside>
  </main>

  <script>
    // ==========================================
    // 2D AI ROVER PHYSICS & SENSOR ENGINE
    // ==========================================
    const canvas = document.getElementById('sandboxCanvas');
    const ctx = canvas.getContext('2d');

    // Arena Dimensions
    let width = 800;
    let height = 600;

    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = Math.max(400, Math.floor(rect.width));
      height = Math.max(350, Math.floor(rect.height));
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Episode State
    let score = 0;
    let episodeStartTime = Date.now();
    let isAutoAI = false;
    let particles = [];
    let fps = 60;
    let lastFrameTime = performance.now();

    // 1. ROVER AGENT
    const rover = {
      x: 100,
      y: 100,
      width: 32,
      height: 20,
      angle: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      maxSpeed: 4.8,
      accel: 0.22,
      friction: 0.94,
      steerSpeed: 0.058,
      color: '#10b981',
      lidarRange: 220,
      lidarRays: 8,
      sensorDistances: [220, 220, 220, 220, 220, 220, 220, 220],
      sensorAngles: [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4],
      sensorNames: ['Front (0°)', 'Front-R (45°)', 'Right (90°)', 'Rear-R (135°)', 'Rear (180°)', 'Rear-L (225°)', 'Left (270°)', 'Front-L (315°)'],
      aiSteering: 0,
      aiThrottle: 0
    };

    // 2. ENVIRONMENT OBJECTS
    let walls = [];
    let crates = [];
    let goal = { x: 700, y: 500, radius: 36, pulse: 0 };

    function generateEnvironment() {
      walls = [];
      crates = [];

      // Boundary Walls
      const wallThickness = 14;
      walls.push({ x: 0, y: 0, w: width, h: wallThickness });
      walls.push({ x: 0, y: height - wallThickness, w: width, h: wallThickness });
      walls.push({ x: 0, y: 0, w: wallThickness, h: height });
      walls.push({ x: width - wallThickness, y: 0, w: wallThickness, h: height });

      // Randomized Static Interior Walls / Obstacles
      const numObstacles = Math.floor(Math.random() * 4) + 4;
      for (let i = 0; i < numObstacles; i++) {
        const isHoriz = Math.random() > 0.5;
        const w = isHoriz ? Math.random() * 120 + 80 : Math.random() * 30 + 20;
        const h = isHoriz ? Math.random() * 30 + 20 : Math.random() * 120 + 80;
        const x = Math.random() * (width - w - 160) + 80;
        const y = Math.random() * (height - h - 160) + 80;
        // Avoid starting position
        if (Math.hypot(x - rover.x, y - rover.y) > 130) {
          walls.push({ x, y, w, h });
        }
      }

      // Randomized Movable Dynamic Crates
      const numCrates = Math.floor(Math.random() * 4) + 5;
      for (let i = 0; i < numCrates; i++) {
        const size = Math.random() * 14 + 24;
        const x = Math.random() * (width - size - 140) + 70;
        const y = Math.random() * (height - size - 140) + 70;
        if (Math.hypot(x - rover.x, y - rover.y) > 110) {
          crates.push({
            x, y, w: size, h: size,
            vx: 0, vy: 0,
            mass: size * 0.8,
            friction: 0.88,
            color: '#f59e0b'
          });
        }
      }

      // Random Goal Position (Away from spawn)
      goal.x = Math.max(100, Math.min(width - 100, Math.random() * (width - 200) + 100));
      goal.y = Math.max(100, Math.min(height - 100, Math.random() * (height - 200) + 100));
      if (Math.hypot(goal.x - rover.x, goal.y - rover.y) < 220) {
        goal.x = width - 120;
        goal.y = height - 120;
      }
    }

    function resetEpisode() {
      rover.x = 80;
      rover.y = 80;
      rover.speed = 0;
      rover.vx = 0;
      rover.vy = 0;
      rover.angle = 0;
      rover.aiSteering = 0;
      rover.aiThrottle = 0;
      episodeStartTime = Date.now();
      generateEnvironment();
    }

    // 3. INPUT HANDLING (KEYBOARD & GLOBAL API)
    const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = true;
        keys[e.key.toLowerCase()] = true;
      }
      updateKeyUI();
    });

    window.addEventListener('keyup', (e) => {
      if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = false;
        keys[e.key.toLowerCase()] = false;
      }
      updateKeyUI();
    });

    function updateKeyUI() {
      const kw = document.getElementById('key-w');
      const ka = document.getElementById('key-a');
      const ks = document.getElementById('key-s');
      const kd = document.getElementById('key-d');
      if (kw) kw.className = (keys.w || keys.ArrowUp) ? 'w-10 h-9 rounded bg-emerald-500 text-slate-950 font-bold mono text-xs shadow-md' : 'w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200';
      if (ka) ka.className = (keys.a || keys.ArrowLeft) ? 'w-10 h-9 rounded bg-emerald-500 text-slate-950 font-bold mono text-xs shadow-md' : 'w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200';
      if (ks) ks.className = (keys.s || keys.ArrowDown) ? 'w-10 h-9 rounded bg-emerald-500 text-slate-950 font-bold mono text-xs shadow-md' : 'w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200';
      if (kd) kd.className = (keys.d || keys.ArrowRight) ? 'w-10 h-9 rounded bg-emerald-500 text-slate-950 font-bold mono text-xs shadow-md' : 'w-10 h-9 rounded bg-slate-800 border border-slate-700 text-xs font-bold mono text-slate-200';
    }

    // Attach virtual drive clicks
    ['w', 'a', 's', 'd'].forEach(k => {
      const el = document.getElementById('key-' + k);
      if (!el) return;
      el.addEventListener('mousedown', () => { keys[k] = true; updateKeyUI(); });
      el.addEventListener('mouseup', () => { keys[k] = false; updateKeyUI(); });
      el.addEventListener('mouseleave', () => { keys[k] = false; updateKeyUI(); });
    });

    // 4. PUBLIC GLOBAL API HOOKS
    window.setAITarget = function(steering, throttle) {
      rover.aiSteering = Math.max(-1, Math.min(1, Number(steering) || 0));
      rover.aiThrottle = Math.max(-1, Math.min(1, Number(throttle) || 0));
      return { status: 'OK', steering: rover.aiSteering, throttle: rover.aiThrottle };
    };

    window.getGameState = function() {
      const dx = goal.x - rover.x;
      const dy = goal.y - rover.y;
      const goalDist = Math.hypot(dx, dy);
      const angleToGoal = Math.atan2(dy, dx);
      let headingDiff = angleToGoal - rover.angle;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

      return {
        timestamp: Date.now(),
        fps: Math.round(fps),
        score,
        episodeDurationSec: Number(((Date.now() - episodeStartTime) / 1000).toFixed(1)),
        agent: {
          x: Number(rover.x.toFixed(1)),
          y: Number(rover.y.toFixed(1)),
          vx: Number(rover.vx.toFixed(2)),
          vy: Number(rover.vy.toFixed(2)),
          speed: Number(rover.speed.toFixed(2)),
          headingDegrees: Number((((rover.angle * 180 / Math.PI) % 360 + 360) % 360).toFixed(1)),
          headingRadians: Number(rover.angle.toFixed(3))
        },
        lidar: rover.sensorDistances.map((d, i) => ({
          direction: rover.sensorNames[i],
          distancePx: Number(d.toFixed(1)),
          normalized: Number((d / rover.lidarRange).toFixed(3))
        })),
        goal: {
          x: Math.round(goal.x),
          y: Math.round(goal.y),
          distancePx: Math.round(goalDist),
          angleToGoalDeg: Number((headingDiff * 180 / Math.PI).toFixed(1))
        },
        cratesCount: crates.length,
        obstaclesCount: walls.length
      };
    };

    // 5. RAYCASTING ALGORITHM (8 DIRECTIONAL RAYS)
    function lineIntersectsRect(x1, y1, x2, y2, rect) {
      const lines = [
        { x3: rect.x, y3: rect.y, x4: rect.x + rect.w, y4: rect.y }, // top
        { x3: rect.x + rect.w, y3: rect.y, x4: rect.x + rect.w, y4: rect.y + rect.h }, // right
        { x3: rect.x, y3: rect.y + rect.h, x4: rect.x + rect.w, y4: rect.y + rect.h }, // bottom
        { x3: rect.x, y3: rect.y, x4: rect.x, y4: rect.y + rect.h } // left
      ];

      let closest = null;
      let minT = 1.0;

      for (const edge of lines) {
        const denom = (y2 - y1) * (edge.x4 - edge.x3) - (x2 - x1) * (edge.y4 - edge.y3);
        if (Math.abs(denom) < 1e-6) continue;

        const ua = ((edge.x4 - edge.x3) * (edge.y3 - y1) - (edge.y4 - edge.y3) * (edge.x3 - x1)) / denom;
        const ub = ((x2 - x1) * (edge.y3 - y1) - (y2 - y1) * (edge.x3 - x1)) / denom;

        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
          if (ua < minT) {
            minT = ua;
            closest = {
              x: x1 + ua * (x2 - x1),
              y: y1 + ua * (y2 - y1),
              distance: ua * Math.hypot(x2 - x1, y2 - y1)
            };
          }
        }
      }
      return closest;
    }

    function computeLidar() {
      for (let i = 0; i < rover.lidarRays; i++) {
        const rayAngle = rover.angle + rover.sensorAngles[i];
        const rayEndX = rover.x + Math.cos(rayAngle) * rover.lidarRange;
        const rayEndY = rover.y + Math.sin(rayAngle) * rover.lidarRange;

        let closestDist = rover.lidarRange;
        let hitPoint = { x: rayEndX, y: rayEndY };

        // Test static walls
        for (const wall of walls) {
          const hit = lineIntersectsRect(rover.x, rover.y, rayEndX, rayEndY, wall);
          if (hit && hit.distance < closestDist) {
            closestDist = hit.distance;
            hitPoint = hit;
          }
        }

        // Test movable crates
        for (const crate of crates) {
          const hit = lineIntersectsRect(rover.x, rover.y, rayEndX, rayEndY, crate);
          if (hit && hit.distance < closestDist) {
            closestDist = hit.distance;
            hitPoint = hit;
          }
        }

        rover.sensorDistances[i] = closestDist;
      }
    }

    // 6. AUTONOMOUS OBSTACLE-AVOIDANCE AI CONTROLLER
    function runAutoAI() {
      if (!isAutoAI) return;

      const fwd = rover.sensorDistances[0];
      const fl = rover.sensorDistances[7];
      const fr = rover.sensorDistances[1];
      const left = rover.sensorDistances[6];
      const right = rover.sensorDistances[2];

      // Calculate desired angle to goal
      const dx = goal.x - rover.x;
      const dy = goal.y - rover.y;
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - rover.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      let steer = Math.max(-1, Math.min(1, angleDiff * 1.5));
      let throttle = 0.85;

      // Obstacle Repulsion Field
      if (fwd < 90 || fl < 60 || fr < 60) {
        throttle = fwd < 45 ? -0.3 : 0.3;
        steer = (fl < fr) ? 0.9 : -0.9;
      } else if (left < 50) {
        steer += 0.4;
      } else if (right < 50) {
        steer -= 0.4;
      }

      window.setAITarget(steer, throttle);
    }

    // 7. PHYSICS & SIMULATION UPDATE LOOP
    function updatePhysics() {
      runAutoAI();

      let throttleInput = 0;
      let steerInput = 0;

      if (isAutoAI) {
        throttleInput = rover.aiThrottle;
        steerInput = rover.aiSteering;
      } else {
        if (keys.w || keys.ArrowUp) throttleInput += 1;
        if (keys.s || keys.ArrowDown) throttleInput -= 0.6;
        if (keys.a || keys.ArrowLeft) steerInput -= 1;
        if (keys.d || keys.ArrowRight) steerInput += 1;
      }

      // Rover steering & velocity
      rover.angle += steerInput * rover.steerSpeed * (rover.speed >= 0 ? 1 : -1);
      rover.speed += throttleInput * rover.accel;
      rover.speed *= rover.friction;
      rover.speed = Math.max(-rover.maxSpeed * 0.5, Math.min(rover.maxSpeed, rover.speed));

      rover.vx = Math.cos(rover.angle) * rover.speed;
      rover.vy = Math.sin(rover.angle) * rover.speed;

      rover.x += rover.vx;
      rover.y += rover.vy;

      // Wall Collisions
      const rRad = 14;
      for (const wall of walls) {
        if (rover.x + rRad > wall.x && rover.x - rRad < wall.x + wall.w &&
            rover.y + rRad > wall.y && rover.y - rRad < wall.y + wall.h) {
          rover.x -= rover.vx * 1.2;
          rover.y -= rover.vy * 1.2;
          rover.speed *= -0.3;
        }
      }

      // Crate Physics & Collisions
      for (const crate of crates) {
        // Crate velocity decay
        crate.vx *= crate.friction;
        crate.vy *= crate.friction;
        crate.x += crate.vx;
        crate.y += crate.vy;

        // Wall collisions for crates
        for (const wall of walls) {
          if (crate.x < wall.x + wall.w && crate.x + crate.w > wall.x &&
              crate.y < wall.y + wall.h && crate.y + crate.h > wall.y) {
            crate.vx *= -0.5;
            crate.vy *= -0.5;
            crate.x += crate.vx * 2;
            crate.y += crate.vy * 2;
          }
        }

        // Rover against crate
        const dist = Math.hypot(rover.x - (crate.x + crate.w/2), rover.y - (crate.y + crate.h/2));
        if (dist < rRad + crate.w/2) {
          const angle = Math.atan2((crate.y + crate.h/2) - rover.y, (crate.x + crate.w/2) - rover.x);
          const force = (rover.speed * 1.4) / (crate.mass * 0.05);
          crate.vx += Math.cos(angle) * force;
          crate.vy += Math.sin(angle) * force;
          rover.speed *= 0.7;
        }
      }

      // Goal Detection
      const goalDist = Math.hypot(goal.x - rover.x, goal.y - rover.y);
      if (goalDist < goal.radius + 10) {
        score += 100;
        // Spawn success particles
        for (let i = 0; i < 24; i++) {
          particles.push({
            x: goal.x, y: goal.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            color: ['#34d399', '#38bdf8', '#fbbf24'][Math.floor(Math.random()*3)],
            life: 40
          });
        }
        // Move goal
        goal.x = Math.random() * (width - 240) + 120;
        goal.y = Math.random() * (height - 240) + 120;
      }

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }

      computeLidar();
    }

    // 8. RENDER LOOP (60 FPS)
    function render() {
      ctx.clearRect(0, 0, width, height);

      // Draw Sci-Fi Background Grid
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Draw Goal Zone
      goal.pulse += 0.04;
      const pulseRad = goal.radius + Math.sin(goal.pulse) * 4;
      const grad = ctx.createRadialGradient(goal.x, goal.y, 5, goal.x, goal.y, pulseRad);
      grad.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
      grad.addColorStop(1, 'rgba(52, 211, 153, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(goal.x, goal.y, pulseRad * 1.4, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(goal.x, goal.y, pulseRad, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('GOAL', goal.x, goal.y + 4);

      // Draw Static Walls
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      for (const wall of walls) {
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      }

      // Draw Movable Crates
      for (const crate of crates) {
        ctx.fillStyle = crate.color;
        ctx.fillRect(crate.x, crate.y, crate.w, crate.h);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(crate.x, crate.y, crate.w, crate.h);
        // Cross brace
        ctx.beginPath();
        ctx.moveTo(crate.x, crate.y); ctx.lineTo(crate.x + crate.w, crate.y + crate.h);
        ctx.moveTo(crate.x + crate.w, crate.y); ctx.lineTo(crate.x, crate.y + crate.h);
        ctx.stroke();
      }

      // Draw LiDAR Rays
      for (let i = 0; i < rover.lidarRays; i++) {
        const rayAngle = rover.angle + rover.sensorAngles[i];
        const dist = rover.sensorDistances[i];
        const hitX = rover.x + Math.cos(rayAngle) * dist;
        const hitY = rover.y + Math.sin(rayAngle) * dist;

        // Color coding by proximity
        let rayColor = '#10b981'; // safe
        if (dist < 70) rayColor = '#ef4444'; // critical
        else if (dist < 130) rayColor = '#f59e0b'; // warning

        ctx.strokeStyle = rayColor;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(rover.x, rover.y);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hit Dot
        ctx.fillStyle = rayColor;
        ctx.beginPath();
        ctx.arc(hitX, hitY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Particles
      for (const p of particles) {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }

      // Draw Rover Robot Vehicle
      ctx.save();
      ctx.translate(rover.x, rover.y);
      ctx.rotate(rover.angle);

      // Headlight Beam
      const lightGrad = ctx.createRadialGradient(20, 0, 0, 80, 0, 80);
      lightGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      lightGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(75, -25);
      ctx.lineTo(75, 25);
      ctx.closePath();
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      [-12, 12].forEach(yOffset => {
        [-10, 8].forEach(xOffset => {
          ctx.fillRect(xOffset - 4, yOffset - 3, 8, 6);
          ctx.strokeRect(xOffset - 4, yOffset - 3, 8, 6);
        });
      });

      // Chassis
      ctx.fillStyle = rover.color;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-rover.width/2, -rover.height/2, rover.width, rover.height, 4);
      ctx.fill();
      ctx.stroke();

      // Top Sensor Turret
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(2, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(2, 0, 3, 0, Math.PI * 2); ctx.fill();

      // Directional Nose Arrow
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(14, 0); ctx.stroke();

      ctx.restore();
    }

    // 9. UI TELEMETRY & DOM SYNC
    let lastDomUpdate = 0;
    function updateDOM() {
      const now = performance.now();
      if (now - lastDomUpdate < 80) return; // 12 Hz throttle for DOM text
      lastDomUpdate = now;

      // Stats
      const elapsed = (Date.now() - episodeStartTime) / 1000;
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toFixed(1).padStart(4, '0');
      document.getElementById('stat-timer').textContent = mins + ':' + secs;
      document.getElementById('stat-score').textContent = score;
      document.getElementById('stat-fps').textContent = Math.round(fps);

      const dx = goal.x - rover.x;
      const dy = goal.y - rover.y;
      document.getElementById('stat-goal-dist').textContent = Math.round(Math.hypot(dx, dy)) + ' px';

      // HUD
      document.getElementById('hud-speed').textContent = Math.abs(rover.speed * 20).toFixed(1) + ' px/s';
      const deg = ((rover.angle * 180 / Math.PI) % 360 + 360) % 360;
      document.getElementById('hud-heading').textContent = deg.toFixed(1) + '°';
      document.getElementById('hud-pos').textContent = '(' + Math.round(rover.x) + ', ' + Math.round(rover.y) + ')';
      document.getElementById('hud-mode').textContent = isAutoAI ? 'AUTONOMOUS (AI DRIVER)' : 'MANUAL (WASD)';
      document.getElementById('hud-mode').className = isAutoAI ? 'text-purple-400 font-bold' : 'text-amber-400 font-bold';

      // LiDAR Radar Bars
      const barsContainer = document.getElementById('lidar-bars');
      if (barsContainer) {
        barsContainer.innerHTML = rover.sensorNames.map((name, i) => {
          const dist = rover.sensorDistances[i];
          const pct = Math.min(100, (dist / rover.lidarRange) * 100);
          let barCol = 'bg-emerald-400';
          if (dist < 70) barCol = 'bg-rose-500';
          else if (dist < 130) barCol = 'bg-amber-400';

          return '<div class="flex items-center justify-between gap-2">' +
            '<span class="text-slate-400 w-24 truncate">' + name + '</span>' +
            '<div class="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">' +
              '<div class="h-full rounded-full transition-all ' + barCol + '" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="w-10 text-right text-slate-300">' + Math.round(dist) + '</span>' +
          '</div>';
        }).join('');
      }

      // JSON Inspector
      const jsonEl = document.getElementById('json-inspector');
      if (jsonEl) {
        jsonEl.textContent = JSON.stringify(window.getGameState(), null, 2);
      }
    }

    // Toggle Auto AI Button
    document.getElementById('btn-toggle-ai').addEventListener('click', () => {
      isAutoAI = !isAutoAI;
      const ind = document.getElementById('ai-indicator');
      const txt = document.getElementById('ai-btn-text');
      if (isAutoAI) {
        ind.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
        txt.textContent = 'Autonomous AI: ON';
      } else {
        ind.className = 'w-2 h-2 rounded-full bg-purple-400';
        txt.textContent = 'Autonomous AI: OFF';
      }
    });

    document.getElementById('btn-reset').addEventListener('click', resetEpisode);
    document.getElementById('btn-randomize').addEventListener('click', generateEnvironment);

    // Initial setup
    resetEpisode();

    // Main 60 FPS Animation Loop
    function gameLoop(now) {
      const dt = now - lastFrameTime;
      lastFrameTime = now;
      if (dt > 0) fps = fps * 0.9 + (1000 / dt) * 0.1;

      updatePhysics();
      render();
      updateDOM();
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  </script>
</body>
</html>`;
}
