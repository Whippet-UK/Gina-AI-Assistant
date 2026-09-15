import { FilesystemToolset } from './FilesystemToolset.js';
import { selectAgentTools } from './AgentToolSelector.js';
import { getToolCatalog, getToolDefinition } from './AgentToolCatalog.js';
import { approvalRequired } from './AgentApprovalManager.js';
import { routeAgentModel } from './AgentModelRouter.js';
import { AgentTaskStore } from './AgentTaskStore.js';
import { AgentApprovalManager } from './AgentApprovalManager.js';
import { McpServerAdapter } from './McpServerAdapter.js';
import { runMcpEvaluations } from './AgentMcpEvaluationSuite.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export interface BenchmarkResult { name:string; ok:boolean; durationMs:number; details?:any; error?:string; }

export async function runAgentBenchmark(root:string): Promise<{ ok:boolean; startedAt:string; durationMs:number; results:BenchmarkResult[] }> {
  const started = Date.now();
  const results:BenchmarkResult[] = [];
  const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gina-agent-benchmark-'));
  const tools = new FilesystemToolset(testRoot);
  const check = async (name:string, fn:()=>Promise<any>) => {
    const t=Date.now(); try { const details=await fn(); results.push({name,ok:true,durationMs:Date.now()-t,details}); } catch(error:any) { results.push({name,ok:false,durationMs:Date.now()-t,error:error?.message||String(error)}); }
  };
  try {
    await check('tool_catalog', async()=>{ const catalog=getToolCatalog(); if(catalog.length !== 54) throw new Error(`tool catalog unexpectedly small: ${catalog.length}`); if(!getToolDefinition('edit_file')) throw new Error('edit_file missing from catalog'); return {count:catalog.length}; });
    await check('model_routing', async()=>{ const coder=routeAgentModel('fix TypeScript in src/App.tsx','code-task'); const vision=routeAgentModel('inspect this screenshot','general-chat',{hasImage:true}); if(coder.role!=='coder'||vision.role!=='vision') throw new Error('model routing mismatch'); return {coder,vision}; });
    await check('task_store', async()=>{ const store=new AgentTaskStore(testRoot); const task=await store.create('benchmark task','benchmark'); await store.update(task.id,{status:'completed',result:{ok:true}}); const saved=await store.get(task.id); if(saved?.status!=='completed') throw new Error('task state did not persist'); return saved; });
    await check('approval_store', async()=>{ const approvals=new AgentApprovalManager(testRoot); if(!approvalRequired('edit_file')) throw new Error('edit_file approval policy missing'); const a=await approvals.request('edit_file',{path:'benchmark.txt'},'benchmark'); const pending=await approvals.pending(); if(!pending.some(x=>x.id===a.id)) throw new Error('approval not pending'); const resolved=await approvals.resolve(a.id,true); if(resolved.status!=='approved') throw new Error('approval resolution failed'); return resolved; });
    await check('mcp_adapter', async()=>{ const adapter=new McpServerAdapter({execute:async(action,args)=>({ok:true,action,args}),isEnabled:()=>true,requiresApproval:approvalRequired,requestApproval:async(action,parameters,reason)=>({id:'benchmark',action,parameters,reason,status:'pending'}),maxResultChars:2000}); const list:any=await adapter.handle({jsonrpc:'2.0',id:1,method:'tools/list',params:{}}); if(list.result?.tools?.length!==54) throw new Error(`MCP tool count mismatch: ${list.result?.tools?.length}`); const edit=list.result.tools.find((t:any)=>t.name==='edit_file'); if(!edit?.inputSchema || edit.annotations?.readOnlyHint!==false || edit.annotations?.destructiveHint!==true) throw new Error('MCP annotations/schema missing'); const call:any=await adapter.handle({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'edit_file',arguments:{path:'benchmark.txt',edits:[]}}}); if(!call.result?.structuredContent?.requiresApproval) throw new Error('MCP approval bridge failed'); const bad:any=await adapter.handle({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'read_text_file',arguments:{}}}); if(bad.error?.code!==-32602) throw new Error('MCP schema validation failed'); return {tools:list.result.tools.length,approval:true,invalidArgs:bad.error.code}; });
    await check('tool_selection_file_edit', async()=>{ const s=selectAgentTools('edit src/components/Test.tsx to change the layout','code-task'); if (!s.allowedActions.includes('edit_file')) throw new Error('edit_file was not selected'); return s; });
    await check('tool_selection_web', async()=>{ const s=selectAgentTools('look this up on the web','web-research'); if (!s.allowedActions.includes('web_search')) throw new Error('web_search was not selected'); return s; });
    await check('mcp_evaluations', async()=>{ const results=runMcpEvaluations(); if(!results.every(r=>r.ok)) throw new Error(`MCP evaluations failed: ${results.filter(r=>!r.ok).map(r=>r.name).join(', ')}`); return {cases:results.length,passed:results.filter(r=>r.ok).length}; });
    await check('write_file', async()=>tools.writeFile('benchmark.txt','hello')); 
    await check('read_text_file', async()=>{ const r=await tools.readTextFile('benchmark.txt'); if (!String(r.content||'').includes('hello')) throw new Error('read-back mismatch'); return r; });
    await check('edit_file_dry_run', async()=>{ const r=await tools.editFile('benchmark.txt',[{oldText:'hello',newText:'hello world'}],true); if (!r.dryRun || r.applied) throw new Error('dry-run contract failed'); return r; });
    await check('edit_file_apply', async()=>{ const r=await tools.editFile('benchmark.txt',[{oldText:'hello',newText:'hello world'}],false); if (!r.applied) throw new Error('edit was not applied'); return r; });
    await check('path_traversal_block', async()=>{ try { await tools.readTextFile('../gina-agent-benchmark-escape.txt'); throw new Error('path traversal was not blocked'); } catch(error:any) { if (!/restricted|outside|traversal/i.test(String(error?.message))) throw error; return {blocked:true}; } });
  } finally { await fs.rm(testRoot,{recursive:true,force:true}); }
  return { ok:results.every(r=>r.ok), startedAt:new Date(started).toISOString(), durationMs:Date.now()-started, results };
}
