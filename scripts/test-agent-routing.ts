import { selectAgentTools } from '../server/agent/AgentToolSelector.js';

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
for (const [prompt,intent,expected] of cases) {
  const result = selectAgentTools(prompt, intent);
  const ok = result.allowedActions.includes(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${intent} | ${expected} | ${result.allowedActions.join(', ')}`);
  if (!ok) failed++;
}
if (failed) throw new Error(`Agent routing regression failed: ${failed} case(s)`);
console.log(`Agent routing regression: ${cases.length} passed.`);
