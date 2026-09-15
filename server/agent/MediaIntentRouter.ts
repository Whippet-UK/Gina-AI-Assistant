export type GinaMediaIntent = 'chat' | 'vision-analysis' | 'image-generation' | 'image-modification' | 'video-generation';

export interface GinaMediaRoute {
  intent: GinaMediaIntent;
  create: boolean;
  modify: boolean;
  explicit: boolean;
  confidence: 'low' | 'normal' | 'high';
  reason: string;
}

const QUESTION_OR_ANALYSIS = /^(?:what|why|how|can you|could you|would you|tell me|explain|describe|analyse|analyze|identify|read|summari[sz]e)\b/i;
const VIDEO_NOUN = /\b(video|videos|movie|film|clip|footage|animation|animated)\b/i;
const IMAGE_NOUN = /\b(image|picture|photo|photograph|artwork|illustration|portrait|wallpaper|logo|icon|bezel|watch face|scene|product shot|product photography|visual)\b/i;
const CREATE_VERB = /\b(create|generate|make|draw|render|produce|design|visuali[sz]e|paint|illustrate|depict|show me|give me|provide me|send me|animate|animate me)\b/i;
const EDIT_VERB = /\b(edit|modify|change|alter|transform|retouch|remove|add|replace|restyle|improve|redo|rework|work off|use)\b/i;
const REFERENCE_PHRASE = /\b(this image|attached image|attached photo|reference image|use (this|the) image|from this image|based on this image|supplied image|uploaded image)\b/i;
const GEOGRAPHIC_VISUAL = /\b(top[- ]down|aerial|satellite|bird'?s[- ]eye|overhead|map view|street view|location view|geographic view)\b/i;
const DIRECT_VISUAL = /\b(show me|give me|provide me|send me|make me)\b/i;
const DESCRIPTIVE_STATEMENT = /^(?:this|that|the|an?|my|your)\s+(?:is|was|looks?|shows?|contains?|has|have)\b/i;
const QUESTION_MARK = /\b(?:is|are|was|were|what|why|how|when|where|which|can|could|would)\b.*\?/i;

/**
 * Deterministic media arbitration. A media noun alone never creates anything.
 * Explicit video intent is resolved before image intent so phrases such as
 * "make a video of a scene" cannot fall through to image generation.
 */
export function detectMediaIntent(text: string, hasImageAttachment = false): GinaMediaRoute {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return { intent:'chat', create:false, modify:false, explicit:false, confidence:'normal', reason:'empty' };

  const questionOrAnalysis = QUESTION_OR_ANALYSIS.test(normalized);
  const videoNoun = VIDEO_NOUN.test(normalized);
  const imageNoun = IMAGE_NOUN.test(normalized);
  const createVerb = CREATE_VERB.test(normalized);
  const editVerb = EDIT_VERB.test(normalized);
  const referencePhrase = REFERENCE_PHRASE.test(normalized);

  const geographicVisual = GEOGRAPHIC_VISUAL.test(normalized) && /\b(view|image|picture|photo|shot|render|map|visual|scene)\b/i.test(normalized);
  const directVisualRequest = DIRECT_VISUAL.test(normalized) && /\b(image|picture|photo|photograph|visual|view|scene|render|illustration|portrait)\b/i.test(normalized);
  const videoCreation = !questionOrAnalysis && videoNoun && createVerb;
  const imageCreation = !questionOrAnalysis && !videoNoun && createVerb && imageNoun;
  const descriptiveStatement = DESCRIPTIVE_STATEMENT.test(normalized);
  const bareImagePrompt = !questionOrAnalysis && !descriptiveStatement && !videoNoun && imageNoun && normalized.length >= 20 && !QUESTION_MARK.test(normalized);

  const modify = hasImageAttachment && editVerb && (referencePhrase || !questionOrAnalysis) && !videoNoun;
  const create = !modify && !questionOrAnalysis && (imageCreation || geographicVisual || directVisualRequest || bareImagePrompt);

  if (videoCreation) return { intent:'video-generation', create:false, modify:false, explicit:true, confidence:'high', reason:'explicit video generation request' };
  if (modify) return { intent:'image-modification', create:false, modify:true, explicit:true, confidence:'high', reason:'reference/edit request' };
  if (create) return { intent:'image-generation', create:true, modify:false, explicit:true, confidence:'high', reason: geographicVisual ? 'geographic visual request' : directVisualRequest ? 'direct visual request' : 'image generation request' };
  if (hasImageAttachment) return { intent:'vision-analysis', create:false, modify:false, explicit:false, confidence:'normal', reason:'image attachment without generation/edit intent' };
  return { intent:'chat', create:false, modify:false, explicit:false, confidence:'normal', reason:'conversation/question' };
}
