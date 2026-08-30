import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isWin = process.platform === 'win32';
  const targetPort = isWin ? 3200 : 3000;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: targetPort,
      host: isWin ? '127.0.0.1' : '0.0.0.0',
      allowedHosts: true as const,
      // Gina runs Express and Vite in the same process in dev/middleware mode.
      // Do NOT proxy /api back to the same port: that creates a self-proxy loop
      // and can surface EADDRINUSE/HTTP 500 errors on /api/error-log.
      // Development HMR is enabled for source changes. Mutable runtime/upload assets are ignored below,
      // so replacing/uploading generated files cannot reload the browser and abort an in-flight request.
      hmr: process.env.GINA_HMR !== 'false',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        usePolling: false,
        ignored: [
          '**/ComfyUI_windows_portable/**',
          '**/g_env/**',
          '**/.g_env/**',
          '**/models/**',
          '**/tools/**',
          '**/output/**',
          '**/input/**',
          '**/.git/**',
          '**/.gina/**',
          '**/dist/**',
          '**/logs/**',
          '**/docs/**',
          '**/local_ai_uploads/**',
          '**/*.safetensors',
          '**/*.gguf',
          '**/*.bin',
          '**/*.pt',
          '**/*.pth',
          '**/*.mp4',
          '**/*.png',
          '**/*.webp',
          '**/*.zip',
          '**/*.tar*',
          '**/*.bat',
          '**/*.cmd',
          '**/*.ps1'
        ]
      },
    },
  };
});