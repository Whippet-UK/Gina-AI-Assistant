import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const ROOT = process.env.GINA_ROOT || (process.platform === "win32" ? "C:\\Gina_AI" : process.cwd());
const DASHBOARD_PORT = Number(process.env.GINA_DASHBOARD_PORT || 3200);
const app = express();

async function main() {
  console.log("[Development Mode] Starting lightweight dashboard host.");
  console.log(`[Development Mode] Dashboard: http://127.0.0.1:${DASHBOARD_PORT}`);
  console.log("[Development Mode] Backend auto-start is disabled.");
  console.log("[Development Mode] This mode starts the dashboard only; server.ts is not launched.");

  const vite = await createViteServer({
    root: ROOT,
    configFile: path.resolve(ROOT, "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: true,
      proxy: {

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
    void vite.close().finally(() => server.close(() => process.exit(0)));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[Development Mode] Lightweight dashboard boot failed:", error);
  process.exit(1);
});
