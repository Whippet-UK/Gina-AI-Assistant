import path from "path";

export type LocalLlmEngine = "qwen" | "qwen-coder" | "qwen3.5";

export interface LocalLlmModelDefinition {
  engine: LocalLlmEngine;
  label: string;
  description: string;
  role: "vision" | "coding" | "general-vision";
  modelFile: string;
  mmprojFile?: string;
  modelPatterns: RegExp[];
  mmprojPatterns?: RegExp[];
  defaultGpuLayers: number;
  defaultContextSize: number;
  multimodal: boolean;
}

export const LOCAL_LLM_MODELS: Record<LocalLlmEngine, LocalLlmModelDefinition> = {
  qwen: {
    engine: "qwen",
    label: "Qwen 2.5-VL 7B",
    description: "Q4_K_M vision-language model with the existing F16 multimodal projector.",
    role: "vision",
    modelFile: "Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf",
    mmprojFile: "mmproj-F16.gguf",
    modelPatterns: [/^Qwen2\.5-VL-7B-Instruct-Q4_K_M\.gguf$/i, /^qwen.*2\.5.*vl.*\.gguf$/i, /^qwen.*vl.*\.gguf$/i],
    mmprojPatterns: [/^mmproj-F16\.gguf$/i, /^qwen.*mmproj.*\.gguf$/i, /^mmproj.*f16.*\.gguf$/i],
    defaultGpuLayers: 28,
    defaultContextSize: 8192,
    multimodal: true,
  },
  "qwen-coder": {
    engine: "qwen-coder",
    label: "Qwen Coder 7B",
    description: "Q5_K_M text-only coding model for project and code tasks.",
    role: "coding",
    modelFile: "qwen2.5-coder-7b-instruct-q5_k_m.gguf",
    modelPatterns: [/^qwen2\.5-coder-7b-instruct-q5_k_m\.gguf$/i, /^qwen.*coder.*7b.*\.gguf$/i],
    defaultGpuLayers: 28,
    defaultContextSize: 16384,
    multimodal: false,
  },
  "qwen3.5": {
    engine: "qwen3.5",
    label: "Qwen3.5 9B",
    description: "Q4_K_M Qwen3.5-9B model. Vision requires a Qwen3.5-9B-matched projector; the incompatible generic mmproj-BF16.gguf is ignored automatically.",
    role: "general-vision",
    modelFile: "Qwen3.5-9B-Q4_K_M.gguf",
    // Do not auto-pair the generic mmproj-BF16.gguf. The local runtime reported a 3584-vs-4096 embedding mismatch for that file.
    // Qwen3.5-9B GGUF releases commonly ship a model-matched mmproj-F16.gguf; generic projector filenames are intentionally ignored.
    mmprojFile: "mmproj-F16.gguf",
    modelPatterns: [/^Qwen3\.5-9B-Q4_K_M\.gguf$/i, /^qwen3\.5.*9b.*\.gguf$/i],
    mmprojPatterns: [/^mmproj-F16\.gguf$/i, /^qwen3\.5.*mmproj.*\.gguf$/i, /^mmproj.*qwen3\.5.*\.gguf$/i],
    // Conservative default for the project's 8 GB VRAM cage; can be overridden with GINA_LLM_GPU_LAYERS.
    defaultGpuLayers: 24,
    defaultContextSize: 8192,
    multimodal: true,
  },
};

export function getLocalLlmModel(engine: LocalLlmEngine): LocalLlmModelDefinition {
  return LOCAL_LLM_MODELS[engine];
}

export function getLocalLlmModelOptions(root: string) {
  return Object.values(LOCAL_LLM_MODELS).map(model => ({
    engine: model.engine,
    label: model.label,
    description: model.description,
    role: model.role,
    modelPath: path.join(root, model.modelFile),
    mmprojPath: model.mmprojFile ? path.join(root, model.mmprojFile) : null,
    multimodal: model.multimodal,
    defaultGpuLayers: model.defaultGpuLayers,
    defaultContextSize: model.defaultContextSize,
  }));
}
