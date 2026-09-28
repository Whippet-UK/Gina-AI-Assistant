# Gina updates — apply guide

Copy these into your Gina-AI-Assistant project root (overwrite):

| Update path | Project path |
|-------------|--------------|
| server.ts | server.ts |
| server/agent/FilesystemToolset.ts | server/agent/FilesystemToolset.ts |
| src/components/LocalLlmStudio.tsx | src/components/LocalLlmStudio.tsx |
| src/components/AgentExecutionTrace.tsx | src/components/AgentExecutionTrace.tsx |
| src/lib/ginaMath.ts | src/lib/ginaMath.ts |

Optional WASM (not required): wasm/gina_math/**

After copy: restart Gina server + UI hard refresh.
