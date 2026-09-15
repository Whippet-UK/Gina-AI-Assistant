import { runAgentBenchmark } from '../server/agent/AgentBenchmarkSuite.js';
import os from 'os';
import path from 'path';

(async () => {
  const root = path.join(os.tmpdir(), `gina-agent-platform-${Date.now()}`);
  const result = await runAgentBenchmark(root);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
})();
