import { readFile } from 'fs/promises';

const root = process.cwd();
const catalog = await readFile(`${root}/server/llm/LocalLlmModelCatalog.ts`, 'utf8');
const manager = await readFile(`${root}/server/llm/LocalLlmManager.ts`, 'utf8');
const launcher = await readFile(`${root}/Start_Local_LLM.bat`, 'utf8');

// Qwen3.5-9B's official config reports a 4096 text hidden size. mmproj-BF16.gguf (4096) is its
// verified model-matched projector; mmproj-F16.gguf (3584) belongs to Qwen 2.5-VL 7B and must
// never be auto-paired with the qwen3.5 engine.
const qwen35Block = catalog.slice(catalog.indexOf('"qwen3.5": {'), catalog.indexOf('};', catalog.indexOf('"qwen3.5": {')));

const checks = [
  ['Qwen3.5 default projector is the model-matched BF16 file', /mmprojFile:\s*"mmproj-BF16\.gguf"/.test(qwen35Block)],
  ['Qwen 2.5-VL-only F16 projector is not an auto candidate for qwen3.5', !/mmprojPatterns:\s*\[\/\^mmproj-F16/.test(qwen35Block)],
  ['runtime guard ignores the mismatched Qwen 2.5-VL F16 projector for qwen3.5', /isKnownIncompatibleMmproj\(engine:LocalLlmEngine/.test(manager) && /mmproj-F16/.test(manager)],
  ['Qwen3.5 retries text-only on projector mismatch', /retrying text-only startup without projector/.test(manager)],
  ['launcher loads the model-matched mmproj-BF16.gguf for QWEN35', /set "MMPROJ=%MODEL_ROOT%\\mmproj-BF16\.gguf"/.test(launcher)],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
