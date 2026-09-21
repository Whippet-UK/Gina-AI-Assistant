import fs from 'fs';
import path from 'path';
import { routeRuntimeIntent } from '../server/agent/IntentRouter.js';
import { TemporalFactStore } from '../server/knowledge/TemporalFactStore.js';

async function main() {
  const tmp = path.join(process.cwd(), '.gina-phase45-smoke');
  fs.rmSync(tmp, { recursive: true, force: true });
  const store = new TemporalFactStore(tmp);

  const cases = [
    ['check the web for the prime minister of the uk', 'web-research'],
    ['is Rishi Sunak the prime minister of the uk?', 'web-research'],
    ['who is the prime minister of the uk', 'web-research'],
    ['check the bbc website for top news story', 'web-research'],
    ['fix server.ts routing', 'code-task'],
    ['make an image of a castle', 'general-chat']
  ] as const;

  for (const [prompt, expected] of cases) {
    const actual = routeRuntimeIntent(prompt).intent;
    if (actual !== expected) throw new Error(`route mismatch: ${prompt} -> ${actual}, expected ${expected}`);
  }

  const page = {
    url: 'https://www.gov.uk/government/ministers/prime-minister',
    content: 'The Prime Minister is Andy Burnham. He took office on 20 July 2026.'
  };
  const stored = await store.extractAndStore('check the web for the prime minister of the uk', [page]);
  if (stored.length !== 1 || stored[0].value !== 'Andy Burnham') throw new Error('fresh Prime Minister fact was not extracted');

  const old = await store.upsert({
    subject: 'United Kingdom',
    predicate: 'Prime Minister',
    value: 'Rishi Sunak',
    sourceUrl: 'https://www.gov.uk/example-old',
    evidence: 'Historical record',
    observedAt: '2024-01-01T00:00:00Z'
  });
  if (old.status !== 'current') throw new Error('historical seed fact was not stored');

  const refreshed = await store.extractAndStore('current prime minister of the uk', [page]);
  if (refreshed[0]?.value !== 'Andy Burnham') throw new Error('fresh fact did not supersede the stale current fact');

  const current = await store.search('UK Prime Minister', 5);
  if (current.length !== 1 || current[0].fact.value !== 'Andy Burnham') throw new Error('current fact resolver returned stale/conflicting role data');

  console.log('PASS: Phase 45 browser routing + temporal fact revision');
}

main().catch(error => {
  console.error(`FAIL: ${error?.message || error}`);
  process.exitCode = 1;
});