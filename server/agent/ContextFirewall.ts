import type { IntentRoute } from "./IntentRouter.js";

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: any;
}

export function firewallMessages(
  messages: ChatMessage[],
  route: IntentRoute,
  grounding: string = ''
): ChatMessage[] {
  const source = Array.isArray(messages) ? [...messages] : [];
  if (source.length === 0) {
    return grounding ? [{ role: 'system', content: grounding }] : [];
  }

  const isWebOrIsolated = route.intent === 'web-research' || route.intent === 'network-diagnostic';

  let filtered: ChatMessage[];
  if (isWebOrIsolated) {
    // For web research or network diagnostics, strictly isolate context.
    // Strip previous assistant explanations (e.g. PCIe, skills, or coding tutorials)
    // to prevent contaminating fresh search queries.
    const systemMessages = source.filter(m => m.role === 'system');
    const lastUserIndex = source.map(m => m.role).lastIndexOf('user');
    const latestUser = lastUserIndex >= 0 ? [source[lastUserIndex]] : [];
    filtered = [...systemMessages, ...latestUser];
  } else {
    filtered = source;
  }

  if (!grounding.trim()) {
    return filtered;
  }

  const groundingPrompt = `### RUNTIME GROUNDING CONTEXT:\n${grounding.trim()}\n`;

  // Check if there is already a system message
  const systemIndex = filtered.findIndex(m => m.role === 'system');
  if (systemIndex >= 0) {
    const existing = filtered[systemIndex].content;
    filtered[systemIndex] = {
      ...filtered[systemIndex],
      content: typeof existing === 'string' ? `${existing}\n\n${groundingPrompt}` : existing
    };
  } else {
    filtered.unshift({
      role: 'system',
      content: groundingPrompt
    });
  }

  return filtered;
}
