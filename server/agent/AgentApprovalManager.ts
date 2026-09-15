import fs from 'fs/promises';
import path from 'path';
import { getToolDefinition } from './AgentToolCatalog.js';
export type ApprovalStatus='pending'|'approved'|'denied'|'expired';
export interface ApprovalRequest { id:string; action:string; parameters:any; reason:string; status:ApprovalStatus; createdAt:string; resolvedAt?:string; }
export function approvalRequired(action:string){ const definition=getToolDefinition(action); return definition ? definition.approval !== 'never' : false; }
export class AgentApprovalManager {
 private readonly file:string; constructor(root:string){this.file=path.join(root,'.gina','agent','approvals.jsonl');}
 private async read():Promise<ApprovalRequest[]>{await fs.mkdir(path.dirname(this.file),{recursive:true});try{return (await fs.readFile(this.file,'utf8')).split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));}catch{return [];}}
 private async write(xs:ApprovalRequest[]){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,xs.slice(-500).map(x=>JSON.stringify(x)).join('\n')+'\n','utf8');}
 async request(action:string,parameters:any,reason:string){const xs=await this.read();const x:ApprovalRequest={id:`approval_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,action,parameters,reason,status:'pending',createdAt:new Date().toISOString()};xs.push(x);await this.write(xs);return x;}
 async resolve(id:string,approved:boolean){const xs=await this.read();const x=xs.find(a=>a.id===id);if(!x)throw new Error(`Unknown approval: ${id}`);x.status=approved?'approved':'denied';x.resolvedAt=new Date().toISOString();await this.write(xs);return x;}
 async get(id:string){return (await this.read()).find(x=>x.id===id)||null;}
 async pending(){return (await this.read()).filter(x=>x.status==='pending').reverse();}
}
