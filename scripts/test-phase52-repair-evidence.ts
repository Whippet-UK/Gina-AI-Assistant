import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { AutonomousRepairOrchestrator } from '../server/agent/AutonomousRepairOrchestrator.js';

(async () => {
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gina-phase52-'));
try {
  const orchestrator = new AutonomousRepairOrchestrator(root, 3);
  const first = await orchestrator.diagnose({ taskId: 'phase52-smoke', request: 'repair test', cycle: 1, error: 'TS2304 missing symbol', candidateFiles: ['server/example.ts'] });
  if (!first.ok) throw new Error('first diagnostic unexpectedly blocked');
  await orchestrator.recordRepair({ taskId: 'phase52-smoke', request: 'repair test', cycle: 1, targetFile: 'server/example.ts', summary: 'minimal deterministic repair' });
  await orchestrator.recordValidation({ taskId: 'phase52-smoke', cycle: 1, passed: false, summary: 'same failure remains' });
  const repeated = await orchestrator.diagnose({ taskId: 'phase52-smoke', request: 'repair test', cycle: 2, error: 'TS2304 missing symbol', candidateFiles: ['server/example.ts'] });
  if (repeated.ok) throw new Error('repeated identical failure was not blocked');
  await orchestrator.recordRollback('phase52-smoke', 2, 'rollback after repeated failure');
  await orchestrator.complete('phase52-smoke', 2, false, 'bounded repair loop stopped safely');
  const history = await orchestrator.history('phase52-smoke');
  if (history.length !== 6) throw new Error(`expected 6 evidence records, got ${history.length}`);
  console.log('PASS: phase 52 persistent repair evidence + repeat-failure guard');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

})().catch((error) => { console.error(error); process.exit(1); });
