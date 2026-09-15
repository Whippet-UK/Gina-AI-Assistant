import fs from 'fs/promises';
import path from 'path';

export interface FileEdit { oldText:string; newText:string; }

function globToRegExp(pattern:string):RegExp {
  const normalized = String(pattern || '*').replace(/\\/g,'/');
  let out='^';
  for(let i=0;i<normalized.length;i++) {
    const c=normalized[i];
    if(c==='*') { if(normalized[i+1]==='*'){ out += '.*'; i++; } else out += '[^/]*'; }
    else if(c==='?') out += '[^/]';
    else if(c==='[') { const j=normalized.indexOf(']',i+1); if(j>i){ out += normalized.slice(i,j+1); i=j; } else out += '\\['; }
    else out += c.replace(/[.+^${}()|[\\]/g,'\\$&');
  }
  return new RegExp(out+'$','i');
}

function safeJoin(root:string, input:string):string {
  const raw=String(input||'.').trim();
  const candidate=path.resolve(path.isAbsolute(raw)?raw:path.join(root,raw));
  const base=path.resolve(root);
  if(candidate!==base && !candidate.toLowerCase().startsWith(base.toLowerCase()+path.sep)) throw new Error(`Filesystem path is outside the allowed Gina root: ${raw}`);
  return candidate;
}

async function walk(root:string, visitor:(full:string, relative:string, directory:boolean)=>Promise<void>, max=10000) {
  let count=0;
  const ignored=new Set(['node_modules','.git','g_env','dist','.next','.cache','__pycache__']);
  const visit=async(dir:string, rel:string)=>{
    if(count>=max) return;
    let entries:any[]=[]; try { entries=await fs.readdir(dir,{withFileTypes:true}); } catch { return; }
    for(const e of entries){
      if(count>=max || ignored.has(e.name)) continue;
      const full=path.join(dir,e.name), r=rel?path.posix.join(rel,e.name):e.name;
      count++; await visitor(full,r,e.isDirectory());
      if(e.isDirectory()) await visit(full,r);
    }
  };
  await visit(root,'');
}

function mimeFor(file:string):string {
  const ext=path.extname(file).toLowerCase();
  const map:Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.bmp':'image/bmp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.flac':'audio/flac','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.pdf':'application/pdf','.json':'application/json','.txt':'text/plain','.md':'text/markdown','.css':'text/css','.ts':'text/typescript','.tsx':'text/typescript','.js':'text/javascript','.jsx':'text/javascript','.html':'text/html'};
  return map[ext] || 'application/octet-stream';
}

function preserveIndentation(oldText:string,newText:string):string {
  const oldLines=oldText.split(/\r?\n/), newLines=newText.split(/\r?\n/);
  const oldIndent=oldLines[0].match(/^\s*/)?.[0] || '';
  if(!oldIndent || newLines.length<2) return newText;
  return newLines.map((line,i)=> i===0?line: (/^\s*$/.test(line)?line: oldIndent+line.replace(/^\s+/,''))).join('\n');
}

export class FilesystemToolset {
  constructor(private readonly root:string) {}
  private target(input:string){ return safeJoin(this.root,input); }

  async readTextFile(input:string, head?:number, tail?:number) {
    if(head != null && tail != null) throw new Error('read_text_file cannot specify both head and tail.');
    const file=this.target(input); const text=await fs.readFile(file,'utf8'); const lines=text.split(/\r?\n/);
    return {path:file,content:head!=null?lines.slice(0,Math.max(0,Number(head))).join('\n'):tail!=null?lines.slice(-Math.max(0,Number(tail))).join('\n'):text,totalLines:lines.length,encoding:'utf8'};
  }
  async readMediaFile(input:string) {
    const file=this.target(input); const stat=await fs.stat(file); if(!stat.isFile()) throw new Error('read_media_file requires a file.');
    if(stat.size>50*1024*1024) throw new Error('Media file exceeds the 50 MB agent safety limit.');
    const data=(await fs.readFile(file)).toString('base64'); return {path:file,mimeType:mimeFor(file),size:stat.size,contentType:mimeFor(file).startsWith('image/')?'image':mimeFor(file).startsWith('audio/')?'audio':'resource',base64:data};
  }
  async readMultipleFiles(inputs:string[]) {
    const results:any[]=[]; for(const input of Array.isArray(inputs)?inputs:[]) { try { results.push({ok:true,...await this.readTextFile(input)}); } catch(error:any){ results.push({ok:false,path:input,error:error?.message||String(error)}); } } return {results};
  }
  async writeFile(input:string,content:string) { const file=this.target(input); await fs.mkdir(path.dirname(file),{recursive:true}); await fs.writeFile(file,String(content),'utf8'); return {path:file,written:true,bytes:Buffer.byteLength(String(content),'utf8')}; }
  async editFile(input:string,edits:FileEdit[],dryRun=false) {
    const file=this.target(input); const original=await fs.readFile(file,'utf8'); let updated=original; const reports:any[]=[];
    for(const edit of edits||[]) {
      if(typeof edit?.oldText!=='string' || !edit.oldText) throw new Error('Each edit requires a non-empty oldText.');
      const count=updated.split(edit.oldText).length-1;
      if(count===0) throw new Error(`edit_file could not find the requested text in ${input}.`);
      if(count>1) throw new Error(`edit_file found ${count} matches in ${input}; provide a more specific oldText block.`);
      const replacement=preserveIndentation(edit.oldText,String(edit.newText??''));
      updated=updated.replace(edit.oldText,replacement); reports.push({oldText:edit.oldText,newText:replacement,matches:1});
    }
    const diff=buildDiff(original,updated,input);
    if(!dryRun) await fs.writeFile(file,updated,'utf8');
    return {path:file,dryRun,applied:!dryRun,changed:original!==updated,edits:reports,bytesBefore:Buffer.byteLength(original,'utf8'),bytesAfter:Buffer.byteLength(updated,'utf8'),diff};
  }
  async createDirectory(input:string){ const dir=this.target(input); await fs.mkdir(dir,{recursive:true}); return {path:dir,created:true}; }
  async listDirectory(input:string,withSizes=false,sortBy:'name'|'size'='name') { const dir=this.target(input); const entries=await fs.readdir(dir,{withFileTypes:true}); const out:any[]=[]; for(const e of entries){ const full=path.join(dir,e.name); const st=await fs.stat(full).catch(()=>null); out.push({name:e.name,type:e.isDirectory()?'directory':'file',size:st?.isFile()?st.size:0}); } out.sort((a,b)=>sortBy==='size'?b.size-a.size:a.name.localeCompare(b.name)); return {path:dir,entries:out,summary:{files:out.filter(x=>x.type==='file').length,directories:out.filter(x=>x.type==='directory').length,totalSize:out.reduce((n,x)=>n+x.size,0)}}; }
  async moveFile(source:string,destination:string){ const from=this.target(source),to=this.target(destination); if(await fs.stat(to).then(()=>true).catch(()=>false)) throw new Error(`Destination already exists: ${destination}`); await fs.mkdir(path.dirname(to),{recursive:true}); await fs.rename(from,to); return {source:from,destination:to,moved:true}; }
  async searchFiles(input:string,pattern:string,excludePatterns:string[]=[]) {
    const root=this.target(input);
    const requestedPattern=String(pattern||'*').replace(/\\/g,'/');
    const matcher=globToRegExp(requestedPattern);
    const basenameMatcher=requestedPattern.includes('/')?null:globToRegExp(requestedPattern);
    const excludes=(excludePatterns||[]).map(globToRegExp), results:string[]=[];
    await walk(root,async(_full,rel)=>{
      const normalized=rel.replace(/\\/g,'/');
      const basename=path.posix.basename(normalized);
      const matches=matcher.test(normalized) || Boolean(basenameMatcher?.test(basename));
      if(matches && !excludes.some(r=>r.test(normalized))) results.push(path.join(root,rel));
    });
    return {path:root,pattern,excludePatterns,results};
  }
  async directoryTree(input:string,excludePatterns:string[]=[]) { const root=this.target(input), excludes=(excludePatterns||[]).map(globToRegExp); const build=async(dir:string,rel:string):Promise<any[]>=>{ const entries=await fs.readdir(dir,{withFileTypes:true}); const out:any[]=[]; for(const e of entries){ if(['node_modules','.git','g_env','dist'].includes(e.name)) continue; const r=rel?path.posix.join(rel,e.name):e.name; if(excludes.some(x=>x.test(r))) continue; const item:any={name:e.name,type:e.isDirectory()?'directory':'file'}; if(e.isDirectory()) item.children=await build(path.join(dir,e.name),r); out.push(item); } return out; }; return {path:root,tree:await build(root,'')}; }
  async getFileInfo(input:string){ const file=this.target(input), st=await fs.stat(file); return {path:file,size:st.size,birthtime:st.birthtime.toISOString(),mtime:st.mtime.toISOString(),atime:st.atime.toISOString(),type:st.isDirectory()?'directory':'file',mode:st.mode,permissions:(st.mode&0o777).toString(8)}; }
  listAllowedDirectories(){ return {directories:[this.root],policy:'Agent filesystem access is restricted to the configured Gina root; path traversal is blocked.'}; }
}

function buildDiff(before:string,after:string,file:string):string {
  if(before===after) return 'No changes.'; const a=before.split(/\r?\n/),b=after.split(/\r?\n/); let start=0; while(start<a.length&&start<b.length&&a[start]===b[start]) start++; let endA=a.length-1,endB=b.length-1; while(endA>=start&&endB>=start&&a[endA]===b[endB]){endA--;endB--;} const lines=[`--- ${file}`,`+++ ${file}`,`@@ -${start+1},${Math.max(0,endA-start+1)} +${start+1},${Math.max(0,endB-start+1)} @@`]; for(let i=start;i<=endA;i++) lines.push('-'+a[i]); for(let i=start;i<=endB;i++) lines.push('+'+b[i]); return lines.join('\n');
}
