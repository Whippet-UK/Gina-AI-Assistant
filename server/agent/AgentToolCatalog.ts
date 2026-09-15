export type ToolRisk = 'read' | 'write' | 'execute' | 'network' | 'system';
export type ToolApproval = 'never' | 'explicit' | 'always';

export interface AgentToolDefinition {
  action: string;
  title: string;
  description: string;
  category: string;
  risk: ToolRisk;
  approval: ToolApproval;
  parameters: Record<string, { type: string; required?: boolean; description: string }>;
  deterministicIntents: string[];
}

type RawTool = [string,string,string,string,ToolRisk,ToolApproval,Record<string,{type:string;required?:boolean;description:string}>,string[]];
const defs: RawTool[] = [
  ['read_text_file','Read text file','Read source/config/document text with bounded head/tail support.','filesystem','read','never',{path:{type:'string',required:true,description:'Path relative to Gina root'},head:{type:'number',description:'Optional line count from start'},tail:{type:'number',description:'Optional line count from end'}},['file-operation','code-task']],
  ['read_media_file','Read media file','Inspect a local image/audio/video file as binary evidence.','filesystem','read','never',{path:{type:'string',required:true,description:'Path relative to Gina root'}},['file-operation','media']],
  ['read_multiple_files','Read multiple files','Read several known text files in one broker call.','filesystem','read','never',{paths:{type:'string[]',required:true,description:'Relative paths'}},['file-operation','code-task']],
  ['write_file','Write file','Create or replace a complete file.','filesystem','write','explicit',{path:{type:'string',required:true,description:'Relative path'},content:{type:'string',required:true,description:'Complete UTF-8 content'}},['code-task','file-operation']],
  ['edit_file','Edit file','Apply one or more exact selective edits with dry-run support.','filesystem','write','explicit',{path:{type:'string',required:true,description:'Relative path'},edits:{type:'edit[]',required:true,description:'Exact oldText/newText edits'},dryRun:{type:'boolean',description:'Preview without writing'}},['code-task','file-operation']],
  ['create_directory','Create directory','Create a directory tree inside Gina root.','filesystem','write','explicit',{path:{type:'string',required:true,description:'Relative path'}},['file-operation','code-task']],
  ['list_directory','List directory','List direct or recursive directory entries.','filesystem','read','never',{path:{type:'string',description:'Relative path'},recursive:{type:'boolean',description:'Recursive listing'}},['file-operation','code-task']],
  ['list_directory_with_sizes','List directory with sizes','List entries with file sizes and deterministic sorting.','filesystem','read','never',{path:{type:'string',description:'Relative path'},sortBy:{type:'string',description:'name or size'}},['file-operation','code-task']],
  ['move_file','Move file','Move a local file/directory; destination must not already exist.','filesystem','write','always',{source:{type:'string',required:true,description:'Source path'},destination:{type:'string',required:true,description:'Destination path'}},['file-operation']],
  ['search_files','Search files','Search project contents or names while excluding generated/dependency trees.','filesystem','read','never',{path:{type:'string',description:'Root path'},query:{type:'string',required:true,description:'Text or glob query'},maxResults:{type:'number',description:'Maximum results'}},['file-operation','code-task']],
  ['directory_tree','Directory tree','Build a bounded JSON directory tree.','filesystem','read','never',{path:{type:'string',description:'Root path'},excludePatterns:{type:'string[]',description:'Patterns to exclude'}},['file-operation','code-task']],
  ['get_file_info','Get file info','Return metadata for a local path.','filesystem','read','never',{path:{type:'string',required:true,description:'Relative path'}},['file-operation','code-task']],
  ['list_allowed_directories','List allowed directories','Report the authoritative filesystem scope.','filesystem','read','never',{},['capability-query','file-operation']],
  ['execute_command','Execute command','Run a local command through the Gina execution broker.','execution','execute','explicit',{command:{type:'string',required:true,description:'Command'},args:{type:'string[]',description:'Arguments'},cwd:{type:'string',description:'Working directory'}},['code-task','execution']],
  ['validate_project','Validate project','Run Gina project validation/type/build checks.','validation','execute','never',{workspace:{type:'string',description:'Optional workspace'}},['code-task']],
  ['project_integrity_check','Project integrity check','Run the update-integrity guard and stale-reference checks.','validation','read','never',{},['code-task']],
  ['git_status','Git status','Inspect repository state.','git','execute','never',{},['git','code-task']],
  ['git_diff','Git diff','Inspect working-tree changes.','git','read','never',{},['git','code-task']],
  ['git_commit','Git commit','Create a local Git commit after validation.','git','execute','explicit',{message:{type:'string',required:true,description:'Commit message'}},['git']],
  ['web_search','Web search','Search the public web through Gina server-side research.','web','network','never',{query:{type:'string',required:true,description:'Search query'},maxResults:{type:'number',description:'Maximum results'}},['web-research']],
  ['web_fetch','Web fetch','Fetch a public web page for authoritative grounding.','web','network','never',{url:{type:'string',required:true,description:'HTTPS URL'},maxChars:{type:'number',description:'Maximum characters'}},['web-research']],
  ['web_research','Web research','Perform search plus optional top-result retrieval.','web','network','never',{query:{type:'string',required:true,description:'Research question'},maxResults:{type:'number',description:'Maximum results'},fetchTop:{type:'boolean',description:'Fetch top result'}},['web-research']],
  ['network_test','Network test','Diagnose outbound public HTTPS/ICMP connectivity.','network','network','never',{},['network-diagnostic']],
  ['knowledge_search','Knowledge search','Search persistent Gina knowledge and project RAG.','knowledge','read','never',{query:{type:'string',required:true,description:'Knowledge query'},maxResults:{type:'number',description:'Maximum results'}},['knowledge-query','code-task']],
  ['remember','Remember','Persist a verified fact, lesson, decision or preference.','knowledge','write','explicit',{kind:{type:'string',required:true,description:'Knowledge kind'},key:{type:'string',required:true,description:'Stable key'},content:{type:'string',required:true,description:'Knowledge content'}},['knowledge-query']],
  ['recall_memory','Recall memory','Retrieve prior agent/user memory.','knowledge','read','never',{query:{type:'string',required:true,description:'Memory query'}},['knowledge-query']],
  ['inspect_system','Inspect system','Read current hardware, ComfyUI and local LLM status.','system','system','never',{},['system-query','capability-query']],
  ['inspect_capabilities','Inspect capabilities','Return machine-generated active capability contract.','system','read','never',{},['capability-query']],
  ['comfy_clear_cache','Clear Comfy cache','Request a controlled ComfyUI memory/cache purge.','media','system','explicit',{},['media','system-query']],
  ['llm_start','Start local LLM','Start the configured local inference engine.','llm','system','explicit',{},['system-query']],
  ['llm_stop','Stop local LLM','Stop the local inference engine.','llm','system','explicit',{},['system-query']],
  ['llm_restart','Restart local LLM','Restart the local inference engine.','llm','system','explicit',{},['system-query']],
  ['github_clone','GitHub clone','Clone a repository into a Gina-managed workspace.','github','network','explicit',{repository:{type:'string',required:true,description:'owner/name or URL'}},['github']],
  ['github_sync','GitHub sync','Synchronize a managed GitHub workspace.','github','network','explicit',{workspace:{type:'string',required:true,description:'Workspace name'}},['github']],
  ['github_push','GitHub push','Push validated local repository changes.','github','network','always',{workspace:{type:'string',required:true,description:'Workspace name'}},['github']],
  ['create_github_pr','Create GitHub PR','Create a pull request after validation.','github','network','always',{title:{type:'string',required:true,description:'PR title'},body:{type:'string',description:'PR body'}},['github']],
  ['inspect_project_context','Inspect project context','Build the authoritative project context snapshot.','project','read','never',{},['code-task','capability-query']],
  ['inspect_project_map','Inspect project map','Map project surfaces and affected files.','project','read','never',{query:{type:'string',description:'Optional surface query'}},['code-task','file-operation']],
  ['verify_definition_of_done','Verify Definition of Done','Run the machine completion gate.','validation','read','never',{},['code-task']],
  ['read_project_bundle','Read project bundle','Load bounded project context, memory and capabilities.','project','read','never',{},['code-task','capability-query']],
  ['read_file','Read file (legacy alias)','Compatibility alias for read_text_file.','filesystem','read','never',{path:{type:'string',required:true,description:'Relative path'}},['file-operation','code-task']],
  ['patch_file','Patch file (legacy alias)','Compatibility alias for edit_file exact replacement.','filesystem','write','explicit',{path:{type:'string',required:true,description:'Relative path'},search:{type:'string',required:true,description:'Exact old text'},replace:{type:'string',description:'Replacement text'},dryRun:{type:'boolean',description:'Preview only'}},['code-task','file-operation']],
  ['workspace_inspect','Inspect workspace','Inspect the active managed workspace.','project','read','never',{workspace:{type:'string',description:'Workspace name'}},['code-task','github']],
  ['research_docs','Research documentation','Research package/library documentation and compatibility.','research','network','never',{query:{type:'string',required:true,description:'Research query'},libraryOrPackage:{type:'string',description:'Package/library'}},['code-task','web-research']],
  ['verify_compatibility','Verify compatibility','Check a package/code combination against researched evidence.','research','network','never',{package:{type:'string',required:true,description:'Package'},code:{type:'string',required:true,description:'Code snippet'}},['code-task']],
  ['git_workspace_diff','Git workspace diff','Inspect the managed workspace diff.','git','read','never',{},['git','code-task']],
  ['git_log','Git log','Inspect repository history.','git','read','never',{},['git']],
  ['git_branch','Git branch','Inspect or create/select a local branch.','git','execute','explicit',{name:{type:'string',description:'Branch name'}},['git']],
  ['refresh_context','Refresh context','Refresh project context and record the refresh result.','project','read','never',{},['code-task','capability-query']],
  ['import_project_archive','Import project archive','Import an uploaded project archive into a dedicated workspace.','project','write','explicit',{path:{type:'string',required:true,description:'Archive path'}},['file-operation','github']],
  ['run_repair_loop','Run repair loop','Execute Gina autonomous repair/validation cycles.','agent','execute','explicit',{request:{type:'string',required:true,description:'Repair request'},maxRepairCycles:{type:'number',description:'Maximum repair cycles'}},['code-task']],
  ['resolve_location','Resolve location','Resolve a requested location through the local location capability.','location','network','never',{query:{type:'string',required:true,description:'Location query'}},['location_visualisation']],
  ['build_aida64_template','Build AIDA64 template','Generate a true-alpha AIDA64 overlay template specification.','media','write','explicit',{width:{type:'number',description:'Canvas width'},height:{type:'number',description:'Canvas height'}},['media','system-query']],
  ['write_pdf','Write PDF','Write a verified local PDF artifact.','documents','write','explicit',{path:{type:'string',required:true,description:'PDF path'},text:{type:'string',required:true,description:'Document text'}},['file-operation','documents']],

];

export const AGENT_TOOL_CATALOG: AgentToolDefinition[] = defs.map(d => ({action:d[0],title:d[1],description:d[2],category:d[3],risk:d[4],approval:d[5],parameters:d[6],deterministicIntents:d[7]}));
export const AGENT_TOOL_DEFINITIONS = new Map(AGENT_TOOL_CATALOG.map(t => [t.action,t]));
export function getToolDefinition(action:string) { return AGENT_TOOL_DEFINITIONS.get(action); }
export function getToolCatalog(actions?:string[]) { const set=actions ? new Set(actions) : null; return AGENT_TOOL_CATALOG.filter(t=>!set || set.has(t.action)); }
export function toolCatalogPrompt(actions:string[]) { return getToolCatalog(actions).map(t=>`${t.action}: ${t.description} [risk=${t.risk}, approval=${t.approval}] params=${JSON.stringify(t.parameters)}`).join('\n'); }
