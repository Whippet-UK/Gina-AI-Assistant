import fs from 'fs/promises';
import path from 'path';

export type AgentTaskStatus='queued'|'running'|'awaiting_approval'|'completed'|'failed'|'cancelled';
export interface AgentTask { id:string; prompt:string; status:AgentTaskStatus; createdAt:string; updatedAt:string; profile:string; result?:any; error?:string; metadata?:Record<string,any>; }

export class AgentTaskStore {
  private readonly file:string;
  constructor(root:string){ this.file=path.join(root,'.gina','agent','tasks.jsonl'); }
  private async ensure(){ await fs.mkdir(path.dirname(this.file),{recursive:true}); }
  private async read():Promise<AgentTask[]> { await this.ensure(); try { const raw=await fs.readFile(this.file,'utf8'); return raw.split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l)); } catch{return [];} }
  private async write(items:AgentTask[]){ await this.ensure(); const tmp=this.file+'.tmp'; await fs.writeFile(tmp,items.map(x=>JSON.stringify(x)).join('\n')+'\n','utf8'); await fs.rename(tmp,this.file); }
  async create(prompt:string, profile='auto', metadata:Record<string,any>={}){ const now=new Date().toISOString(); const task:AgentTask={id:`task_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,prompt,status:'queued',createdAt:now,updatedAt:now,profile,metadata}; const items=await this.read(); items.push(task); await this.write(items.slice(-500)); return task; }
  async update(id:string, patch:Partial<AgentTask>){ const items=await this.read(); const i=items.findIndex(x=>x.id===id); if(i<0) throw new Error(`Unknown agent task: ${id}`); items[i]={...items[i],...patch,updatedAt:new Date().toISOString()}; await this.write(items); return items[i]; }
  async get(id:string){ return (await this.read()).find(x=>x.id===id) || null; }
  async list(limit=50){ return (await this.read()).slice(-Math.max(1,Math.min(500,limit))).reverse(); }
}
