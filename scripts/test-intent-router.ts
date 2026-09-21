import assert from "node:assert/strict";
import { routeRuntimeIntent } from "../server/agent/IntentRouter.js";

const cases = [
  ["top new on bbc news site", "web-research"],
  ["search the web for the latest BBC headlines", "web-research"],
  ["can you access the internet?", "network-diagnostic"],
  ["read this file", "file-operation"],
  ["fix this TypeScript error", "code-task"],
  ["what can you do?", "capability-query"],
  ["hello", "general-chat"],
] as const;
for (const [prompt, expected] of cases) {
  const route = routeRuntimeIntent(prompt);
  assert.equal(route.intent, expected, `${prompt} routed to ${route.intent}, expected ${expected}`);
}
console.log(`Intent routing regression: ${cases.length}/${cases.length} passed`);
