import fs from 'fs/promises';
import path from 'path';
export interface AgentSchedule {id:string; name:string; prompt:string; intervalMs:number; enabled:boolean; nextRunAt:string; createdAt:string; lastRunAt?:string; lastResult?:any;}
export class AgentScheduler {
 private readonly file:string; private timers=new Map<string,NodeJS.Timeout>(); private runner:((s:AgentSchedule)=>Promise<any>)|null=null;
 constructor(root:string){this.file=path.join(root,'.gina','agent','schedules.json');}
 async init(runner:(s:AgentSchedule)=>Promise<any>){this.runner=runner;await fs.mkdir(path.dirname(this.file),{recursive:true});const xs=await this.list();for(const s of xs)if(s.enabled)this.arm(s);}
 private async listRaw():Promise<AgentSchedule[]>{try{return JSON.parse(await fs.readFile(this.file,'utf8'));}catch{return [];}}
 private async save(xs:AgentSchedule[]){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify(xs,null,2),'utf8');}
 async list(){return this.listRaw();}
 async create(name:string,prompt:string,intervalMs:number,enabled=true){if(intervalMs<30000)throw new Error('Minimum schedule interval is 30 seconds.');const xs=await this.listRaw();const now=Date.now();const s:AgentSchedule={id:`sched_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,name,prompt,intervalMs,enabled,nextRunAt:new Date(now+intervalMs).toISOString(),createdAt:new Date(now).toISOString()};xs.push(s);await this.save(xs);if(enabled)this.arm(s);return s;}
 async cancel(id:string){const xs=await this.listRaw();const s=xs.find(x=>x.id===id);if(!s)throw new Error(`Unknown schedule: ${id}`);s.enabled=false;if(this.timers.has(id))clearTimeout(this.timers.get(id)!);this.timers.delete(id);await this.save(xs);return s;}
 private arm(s:AgentSchedule){if(!this.runner)return;if(this.timers.has(s.id))clearTimeout(this.timers.get(s.id)!);const delay=Math.max(1000,Date.parse(s.nextRunAt)-Date.now());this.timers.set(s.id,setTimeout(async()=>{try{const result=await this.runner!(s);const xs=await this.listRaw();const cur=xs.find(x=>x.id===s.id);if(cur){cur.lastRunAt=new Date().toISOString();cur.lastResult=result;cur.nextRunAt=new Date(Date.now()+cur.intervalMs).toISOString();await this.save(xs);if(cur.enabled)this.arm(cur);}}catch(error:any){const xs=await this.listRaw();const cur=xs.find(x=>x.id===s.id);if(cur){cur.lastRunAt=new Date().toISOString();cur.lastResult={ok:false,error:error?.message||String(error)};cur.nextRunAt=new Date(Date.now()+cur.intervalMs).toISOString();await this.save(xs);if(cur.enabled)this.arm(cur);}}},delay));}
}
