export type RuntimeIntent = 'web-research'|'network-diagnostic'|'code-task'|'file-operation'|'knowledge-query'|'capability-query'|'general-chat';

export interface IntentRoute { intent: RuntimeIntent; confidence: number; requiresProjectContext: boolean; requiresSkills: boolean; requiresWeb: boolean; reason: string; operational: boolean; explicitTargets?: string[]; }

const INSTRUCTIONAL_PREFIX = /^(?:how|why|what is|what are|explain|tell me how|show me how|can you explain|could you explain)\b/i;
const OPERATIONAL_VERB = /\b(?:edit|modify|change|update|patch|repair|fix|implement|refactor|rewrite|replace|remove|delete|create|make|write|save|rename|move|copy|add|append|prepend)\b/i;
const FILE_TARGET = /(?:^|[\s"'])(?:[A-Za-z]:[\\/]|\.?\.?[\\/]|(?:src|server|docs|scripts|public|app|components|tests?)\/)[^\s"'`]+|\b[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|bat|ps1|txt)\b/i;

// Live-web signals are deliberately expressed as intent combinations, not single
// keywords. A word such as "news", "image" or "video" must not by itself
// launch a specialised executor. Conversely, natural requests such as "most recent
// news headline" must reliably reach the web lane even when no site is named.
const WEB_ACTION = /\b(?:search|browse|check|look(?: it)? up|find|visit|open|go to)\b(?:[^?\n]{0,80})\b(?:web|online|website|site|internet|bbc|cnn|reuters|guardian|sky news)\b/i;
const SEARCH_PREFIX = /^(?:search(?: for| the web for| online for)?|google|look up|find(?: me)?(?: the)?)\b/i;
const FLIGHT_TRAVEL = /\b(?:flight|flights|airline|airlines|airport|heathrow|gatwick|hotel|hotels|holiday|holidays|trip|travel|ticket|tickets|fare|fares|cheap(?:est)? return)\b/i;
const REALTIME_TOPIC = /\b(?:weather|forecast|temperature|stock|stocks|shares|crypto|bitcoin|btc|eth|currency|exchange rate|price of|cost of|release date|schedule|score|scores|match result|standings)\b/i;
const WEB_URL = /\b(?:https?:\/\/|www\.|\.com\b|\.co\.uk\b|\.org\b|\.net\b|\.io\b|\.gov\b|\.edu\b)/i;
const RECENCY = /\b(?:latest|most recent|most rescent|rescent|recent|current|breaking|today|tonight|this morning|this evening|right now|now|at the moment|up[- ]to[- ]date)\b/i;
const NEWS_TOPIC = /\b(?:news|headline|headlines|breaking news|top stories|top story)\b/i;
const NEWS_QUESTION = /\b(?:what(?:'s| is| are)|who|which|show|give|tell|check|find|search|latest|most recent|current)\b/i;
const PUBLIC_WEB_SOURCE = /\b(?:bbc|cnn|reuters|the guardian|guardian|sky news|associated press|ap news|new york times|washington post)\b/i;
const TEMPORAL_FACT_QUERY = /\b(?:prime minister|president|chancellor|mayor|ceo|first minister)\b/i;

function isWebResearchRequest(q:string): boolean {
  if (!q) return false;
  if (WEB_ACTION.test(q)) return true;
  if (WEB_URL.test(q)) return true;
  if (FLIGHT_TRAVEL.test(q) && (SEARCH_PREFIX.test(q) || RECENCY.test(q) || NEWS_QUESTION.test(q) || /\b(?:from|to|cheapest|cheap|price|cost|ticket|book)\b/i.test(q))) return true;
  if (SEARCH_PREFIX.test(q) && (FLIGHT_TRAVEL.test(q) || REALTIME_TOPIC.test(q) || RECENCY.test(q) || !isOperationalCodeRequest(q))) return true;
  if (REALTIME_TOPIC.test(q) && (RECENCY.test(q) || NEWS_QUESTION.test(q) || SEARCH_PREFIX.test(q) || WEB_ACTION.test(q))) return true;
  // News/headline requests are intrinsically time-sensitive when the user asks
  // for recency, or asks a normal current-news question without naming a source.
  if (NEWS_TOPIC.test(q) && (RECENCY.test(q) || NEWS_QUESTION.test(q))) return true;
  if (TEMPORAL_FACT_QUERY.test(q) && (RECENCY.test(q) || NEWS_QUESTION.test(q) || WEB_ACTION.test(q))) return true;
  if (PUBLIC_WEB_SOURCE.test(q) && (NEWS_TOPIC.test(q) || RECENCY.test(q) || WEB_ACTION.test(q))) return true;
  return false;
}

function isOperationalCodeRequest(q:string): boolean {
  if (!q || INSTRUCTIONAL_PREFIX.test(q)) return false;
  return OPERATIONAL_VERB.test(q) && (FILE_TARGET.test(q) || /\b(code|file|component|function|bug|error|project|repo|repository|typescript|javascript|react|server|ui|source|implementation)\b/i.test(q));
}

export function routeRuntimeIntent(text: string): IntentRoute {
  const q=String(text||'').trim();
  if (isWebResearchRequest(q))
    return {intent:'web-research',confidence:.995,requiresProjectContext:false,requiresSkills:false,requiresWeb:true,operational:true,reason:'Explicit/current public-web request'};
  if (/\b(?:ping|network access|internet access|internet connection|network connection|connectivity|test (?:the )?(?:network|internet)|online access)\b/i.test(q))
    return {intent:'network-diagnostic',confidence:.995,requiresProjectContext:false,requiresSkills:false,requiresWeb:false,operational:true,reason:'Explicit network diagnostic request'};
  if (/\b(?:what did you learn|what have you learned|what do you remember about|search your knowledge|search learned knowledge|what have we learned)\b/i.test(q))
    return {intent:'knowledge-query',confidence:.99,requiresProjectContext:false,requiresSkills:false,requiresWeb:false,operational:false,reason:'Explicit learned-knowledge request'};
  if (/\b(?:what can you|what are you able to|what can gina|your abilities|your capabilities|can you (?:read|write|edit|modify|access|run|execute|search|browse)|do you have access)\b/i.test(q))
    return {intent:'capability-query',confidence:.99,requiresProjectContext:false,requiresSkills:false,requiresWeb:false,operational:false,reason:'Explicit capability question'};
  if (isOperationalCodeRequest(q))
    return {intent:'code-task',confidence:.995,requiresProjectContext:true,requiresSkills:true,requiresWeb:false,operational:true,reason:'Explicit operational code/file change request'};
  if ((/\b(?:read|open|inspect|show|look at|list|find|search)\b.*(?:\bfile\b|\bsource\b|\bcode\b|\bfolder\b|\bdirectory\b|\blocal\b|\bproject\b)/i.test(q) || /(?:[A-Za-z]:[\\/]|(?:src|server|docs|scripts|public|app|components|tests?)[\\/])[^\s]+/i.test(q)) && !INSTRUCTIONAL_PREFIX.test(q))
    return {intent:'file-operation',confidence:.98,requiresProjectContext:true,requiresSkills:true,requiresWeb:false,operational:true,reason:'Explicit local file operation'};
  return {intent:'general-chat',confidence:.8,requiresProjectContext:false,requiresSkills:false,requiresWeb:false,operational:false,reason:'No operational route detected'};
}
