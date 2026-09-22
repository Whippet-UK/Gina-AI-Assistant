import { routeRuntimeIntent } from '../server/agent/IntentRouter.js';
import { firewallMessages, type ChatMessage } from '../server/agent/ContextFirewall.js';

const stale = 'PCIe Paging is a hardware safeguard concept from the active Media and Core Development skills.';
const messages: ChatMessage[] = [
  { role: 'system', content: '=== ACTIVE AGENT SKILLS === Audio Core Development Hardware Safeguards PCIe Paging' },
  { role: 'user', content: 'what can you do?' },
  { role: 'assistant', content: stale },
  { role: 'user', content: 'top news on bbc site' }
];
const route = routeRuntimeIntent('top news on bbc site');
if (route.intent !== 'web-research') throw new Error(`Expected web-research, got ${route.intent}`);
const isolated = firewallMessages(messages, route, 'LIVE WEB RESULTS: BBC headline result');
if (isolated.length !== 2) throw new Error(`Expected isolated system+user messages, got ${isolated.length}`);
if (isolated[1].content !== 'top news on bbc site') throw new Error('Latest user request was not preserved');
if (isolated[0].content.includes('PCIe Paging') || isolated[0].content.includes('ACTIVE AGENT SKILLS')) throw new Error('Stale skill context leaked through firewall');
console.log('Context firewall tests passed.');
