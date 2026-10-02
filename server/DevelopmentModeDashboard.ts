import "dotenv/config";
import express from "express";
import path from "path";
import { spawn, type ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";

const ROOT = process.env.GINA_ROOT || (process.platform === "win32" ? "C:\\Gina_AI" : process.cwd());
const DASHBOARD_PORT = Number(process.env.GINA_DASHBOARD_PORT || 3200);
const BACKEND_PORT = Number(process.env.GINA_SERVER_PORT || 3201);
const app = express();

let backend: ChildProcess | null = null;

function stopBackend() {
  if (!backend || backend.killed) return;
  try {
    if (process.platform === "win32" && backend.pid) {
      spawn("taskkill.exe", ["/PID", String(backend.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    } else {
      backend.kill("SIGTERM");
    }
  } catch {}
}

async function main() {
  console.log("[Development Mode] Starting lightweight dashboard host.");
  console.log(`[Development Mode] Dashboard: http://127.0.0.1:${DASHBOARD_PORT}`);
  console.log(`[Development Mode] Gina backend: http://127.0.0.1:${BACKEND_PORT}`);

  const tsx = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  backend = spawn(tsx, [path.join(ROOT, "server.ts")], {
    cwd: ROOT,
    env: {
      ...process.env,
      GINA_ROOT: ROOT,
      GINA_SERVER_PORT: String(BACKEND_PORT),
      GINA_BACKEND_NO_VITE: "1",
      GINA_DEV_MODE: "1"
    },
    stdio: "inherit",
    windowsHide: false
  });

  backend.once("error", (error) => {
    console.error("[Development Mode] Gina backend failed to start:", error);
  });
  backend.once("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`[Development Mode] Gina backend exited with code ${code ?? "unknown"}${signal ? ` (${signal})` : ""}.`);
    }
  });

  const vite = await createViteServer({
    root: ROOT,
    configFile: path.resolve(ROOT, "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: true,
      proxy: {
        "/api": { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true },
        "/media": { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true },
        "/comfy": { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true, ws: true },
        "/local-ai-uploads": { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true }
      },
      watch: {
        usePolling: false,
        ignored: [
          "**/ComfyUI_windows_portable/**", "**/g_env/**", "**/.g_env/**",
          "**/models/**", "**/tools/**", "**/output/**", "**/input/**",
          "**/.git/**", "**/.gina/**", "**/dist/**", "**/logs/**",
          "**/docs/**", "**/local_ai_uploads/**", "**/.gina_runtime/**",
          "**/*.safetensors", "**/*.gguf", "**/*.bin", "**/*.pt", "**/*.pth",
          "**/*.mp4", "**/*.bat", "**/*.cmd", "**/*.ps1"
        ]
      }
    },
    appType: "spa"
  });

  app.use(vite.middlewares);
  const server = app.listen(DASHBOARD_PORT, "127.0.0.1", () => {
    console.log(`[Development Mode] Dashboard ready: http://127.0.0.1:${DASHBOARD_PORT}`);
  });

  const shutdown = () => {
    stopBackend();
    void vite.close().finally(() => server.close(() => process.exit(0)));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[Development Mode] Lightweight dashboard boot failed:", error);
  stopBackend();
  process.exit(1);
});
