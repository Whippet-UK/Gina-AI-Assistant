import assert from "node:assert/strict";
import { LOCAL_LLM_MODELS, getLocalLlmModelOptions } from "../server/llm/LocalLlmModelCatalog.js";

const root = "C:\\Gina_AI\\models\\llm";
const models = LOCAL_LLM_MODELS;

assert.equal(models.qwen.modelFile, "Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf");
assert.equal(models.qwen.mmprojFile, "mmproj-F16.gguf");
assert.equal(models["qwen-coder"].modelFile, "qwen2.5-coder-7b-instruct-q5_k_m.gguf");
assert.equal(models["qwen3.5"].modelFile, "Qwen3.5-9B-Q4_K_M.gguf");
assert.equal(models["qwen3.5"].mmprojFile, "mmproj-BF16.gguf");
assert.equal(models["qwen3.5"].multimodal, true);
assert.equal(models["qwen3.5"].defaultGpuLayers, 24);

const options = getLocalLlmModelOptions(root);
assert.deepEqual(options.map(option => option.engine), ["qwen", "qwen-coder", "qwen3.5"]);
const qwen35 = options.find(option => option.engine === "qwen3.5");
assert.ok(qwen35);
assert.match(qwen35?.modelPath || "", /[\\/]Qwen3\.5-9B-Q4_K_M\.gguf$/i);
assert.match(qwen35?.mmprojPath || "", /[\\/]mmproj-BF16\.gguf$/i);

console.log("PASS: local LLM model catalog maps Qwen 2.5-VL, Qwen Coder and Qwen3.5 9B");
