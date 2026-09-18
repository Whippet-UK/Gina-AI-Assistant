import { routeRuntimeIntent } from '../server/agent/IntentRouter.js';

const cases = [
  ['check the web for the prime minister of the uk', 'web-research'],
  ['check the bbc website for top news story', 'web-research'],
  ['most rescent news headline', 'web-research'],
  ['what is the current prime minister of the uk', 'web-research'],
  ['fix server.ts routing', 'code-task'],
] as const;
for (const [prompt, expected] of cases) {
  const route = routeRuntimeIntent(prompt);
  if (route.intent !== expected) throw new Error(`${prompt}: expected ${expected}, got ${route.intent}`);
}
console.log(`PASS: phase 55 web routing ${cases.length}/${cases.length}`);
