import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { AgentExecutionCheckpointStore } from '../server/agent/AgentExecutionCheckpointStore.js';

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gina-agent-resume-'));
  try {
    const store = new AgentExecutionCheckpointStore(root);
    const first = await store.save({
      taskId: 'task_smoke', prompt: 'edit the test file', status: 'running', step: 2,
      steps: [{ plan: { action: 'read_file' } }, { plan: { action: 'edit_file' } }], updatedAt: new Date().toISOString()
    });
    if (first.step !== 2) throw new Error('checkpoint save failed');
    const loaded = await store.get('task_smoke');
    if (!loaded || loaded.steps.length !== 2 || loaded.status !== 'running') throw new Error('checkpoint restore failed');
    const resumed = await store.save({ ...loaded, status: 'completed', step: 3, finalSummary: 'verified' });
    if (resumed.status !== 'completed' || resumed.finalSummary !== 'verified') throw new Error('checkpoint update failed');
    const listed = await store.list();
    if (!listed.some(item => item.taskId === 'task_smoke')) throw new Error('checkpoint list failed');
    await store.clear('task_smoke');
    if (await store.get('task_smoke')) throw new Error('checkpoint clear failed');
    console.log('PASS: agent execution checkpoint smoke test');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exit(1); });
