import { selectAgentTools } from './AgentToolSelector.js';

export interface McpEvaluationCase { name:string; prompt:string; intent:string; expectedAction:string; }
export const MCP_EVALUATION_CASES: McpEvaluationCase[] = [
  {name:'inspect_project',prompt:'Inspect the project structure and identify the relevant files for the request.',intent:'code-task',expectedAction:'directory_tree'},
  {name:'read_source',prompt:'Read src/App.tsx so I can understand the current UI implementation.',intent:'file-operation',expectedAction:'read_text_file'},
  {name:'search_symbol',prompt:'Search the project for RuntimeTelemetryPanel references.',intent:'code-task',expectedAction:'search_files'},
  {name:'edit_target',prompt:'Edit src/components/RuntimeTelemetryPanel.tsx to change the compact layout.',intent:'code-task',expectedAction:'edit_file'},
  {name:'validate',prompt:'Validate the project after the code change.',intent:'code-task',expectedAction:'validate_project'},
  {name:'web_research',prompt:'Research the latest MCP TypeScript SDK documentation on the public web.',intent:'web-research',expectedAction:'web_search'},
  {name:'network',prompt:'Test whether public HTTPS connectivity is available.',intent:'network-diagnostic',expectedAction:'network_test'},
  {name:'knowledge',prompt:'Search Gina knowledge for the previous telemetry layout decision.',intent:'knowledge-query',expectedAction:'knowledge_search'},
  {name:'git_diff',prompt:'Show me the current repository changes before committing.',intent:'code-task',expectedAction:'git_diff'},
  {name:'capabilities',prompt:'Inspect Gina runtime capabilities.',intent:'capability-query',expectedAction:'inspect_capabilities'}
];

export function runMcpEvaluations() {
  return MCP_EVALUATION_CASES.map(test => {
    const selection = selectAgentTools(test.prompt, test.intent);
    const ok = selection.allowedActions.includes(test.expectedAction);
    return { name:test.name, ok, expectedAction:test.expectedAction, selected:selection.allowedActions };
  });
}
