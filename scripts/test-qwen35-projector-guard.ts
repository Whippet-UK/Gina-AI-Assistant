import { readFile } from 'fs/promises';

const root = process.cwd();
const catalog = await readFile(`${root}/server/llm/LocalLlmModelCatalog.ts`, 'utf8');
const manager = await readFile(`${root}/server/llm/LocalLlmManager.ts`, 'utf8');
const launcher = await readFile(`${root}/Start_Local_LLM.bat`, 'utf8');

const checks = [
  ['Qwen3.5 default projector is model-matched', /mmprojFile:\s*"mmproj-F16\.gguf"/.test(catalog)],
  ['generic BF16 projector is not an auto candidate', !/mmprojPatterns:\s*\[\/\^mmproj-BF16/.test(catalog)],
  ['runtime guard ignores generic Qwen3.5 BF16 projector', /isKnownIncompatibleMmproj\(engine:LocalLlmEngine/.test(manager) && /mmproj-BF16/.test(manager)],
  ['Qwen3.5 retries text-only on projector mismatch', /retrying text-only startup without projector/.test(manager)],
  ['launcher does not blindly load generic Qwen3.5 BF16 projector', !/set "MMPROJ=%MODEL_ROOT%\\mmproj-BF16\.gguf"/.test(launcher)],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
