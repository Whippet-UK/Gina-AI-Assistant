import { selectAgentTools } from '../server/agent/AgentToolSelector.js';
import { routeRuntimeIntent } from '../server/agent/IntentRouter.js';
import { planCapabilityIntent } from '../server/capabilities/CapabilityRegistry.js';
import { detectMediaIntent } from '../server/agent/MediaIntentRouter.js';

const cases = [
  ['edit src/components/App.tsx and validate it', 'code-task', 'edit_file'],
  ['read src/App.tsx', 'file-operation', 'read_text_file'],
  ['find all references to RuntimeTelemetryPanel', 'file-operation', 'search_files'],
  ['run npm test and fix failures', 'code-task', 'execute_command'],
  ['look this up on the web', 'web-research', 'web_search'],
  ['can you access the internet', 'network-diagnostic', 'network_test'],
  ['remember that validation must run before completion', 'knowledge-query', 'remember'],
];

let failed = 0;

const intentCases = [
  ['check the bbc website for top news story', 'web-research'],
  ['what are the latest BBC headlines?', 'web-research'],
  ['make a video of a dragon flying over London', 'general-chat'],
  ['I made a video yesterday and it looks blurry', 'general-chat'],
  ['make an image of a futuristic London street', 'general-chat'],
  ['fix server.ts routing', 'code-task'],
];
for (const [prompt, expected] of intentCases) {
  const result = routeRuntimeIntent(prompt);
  const ok = result.intent === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'} | intent | ${expected} | ${result.intent} | ${prompt}`);
  if (!ok) failed++;
}

const mediaCases = [
  ['make a video of a dragon flying over London', 'video-generation'],
  ['I made a video yesterday and it looks blurry', 'chat'],
  ['make an image of a futuristic London street', 'image-generation'],
  ['image', 'chat'],
  ['video', 'chat'],
];
for (const [prompt, expected] of mediaCases) {
  const result = detectMediaIntent(prompt);
  const ok = result.intent === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'} | media | ${expected} | ${result.intent} | ${prompt}`);
  if (!ok) failed++;
}

const capabilityRegistry = { capabilities: [
  { id:'web.search', state:'available' },
  { id:'filesystem.read', state:'available' },
  { id:'filesystem.search', state:'available' },
  { id:'filesystem.write', state:'available' },
  { id:'project.validate', state:'available' },
  { id:'project.integrity', state:'available' },
  { id:'execution.command', state:'available' },
  { id:'git.status', state:'available' },
  { id:'git.diff', state:'available' },
] };
const webPlan = planCapabilityIntent('check the bbc website for top news story', capabilityRegistry as any);
const webPlanOk = webPlan.intent === 'web-research' && webPlan.mode === 'act';
console.log(`${webPlanOk ? 'PASS' : 'FAIL'} | capability | web-research stays out of coding agent | ${webPlan.intent}/${webPlan.mode}`);
if (!webPlanOk) failed++;
for (const [prompt,intent,expected] of cases) {
  const result = selectAgentTools(prompt, intent);
  const ok = result.allowedActions.includes(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${intent} | ${expected} | ${result.allowedActions.join(', ')}`);
  if (!ok) failed++;
}
if (failed) throw new Error(`Agent routing regression failed: ${failed} case(s)`);
console.log(`Agent routing regression: ${cases.length + intentCases.length + mediaCases.length + 1} passed.`);
