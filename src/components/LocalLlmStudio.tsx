import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Cpu, FileDown, MessageSquare, Mic, MicOff, Play, RotateCw, Square, Trash2, Volume2, VolumeX, Zap, Sliders, ChevronDown, Paperclip, X, FileText, Image as ImageIcon, Archive, File as FileIcon } from 'lucide-react';
import { LocalRagKnowledgePanel } from './LocalRagKnowledgePanel';
import { useGenerationJob } from '../context/GenerationJobContext';

interface LocalLlmStatus {
  configured: boolean;
  running: boolean;
  ready: boolean;
  pid: number | null;
  port: number;
  modelPath: string;
  modelName: string;
  gpuLayers: number;
  contextSize: number;
  threads: number;
  backend: 'CUDA' | 'unknown';
  lastError: string | null;
  startedAt: string | null;
  recentLog: string[];
  multimodal: boolean;
  mmprojPath: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

interface LocalLlmStudioProps {
  onAddLog: (level: 'INFO' | 'WARN' | 'SEC' | 'RULE', message: string, ruleId?: string) => void;
}

const SYSTEM_PROMPT = `You are Gina, the local AI assistant inside Gina AI Factory. You run locally on a Windows PC with an NVIDIA RTX 3070 Ti 8GB, AMD Ryzen 5 5600X 6-core/12-thread CPU and 32GB RAM. Be practical and concise. Prefer the project's existing local tools and files. You can request local image generation through Gina's Create/ComfyUI tool when the user explicitly asks for an image. Do not claim an image was generated unless Gina has actually returned one. Do not tell the user that Gina is text-only when local image generation is available.`;

export const LocalLlmStudio: React.FC<LocalLlmStudioProps> = ({ onAddLog }) => {
  const [status, setStatus] = useState<LocalLlmStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const { job: generationJob, adoptJob, cancelJob } = useGenerationJob();
  const [aiImageJobId, setAiImageJobId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceName, setVoiceName] = useState<string>(() => {
    try {
      return localStorage.getItem('gina_voice_default') || localStorage.getItem('gina_voice_name') || '';
    } catch {
      return '';
    }
  });
  const [defaultVoiceName, setDefaultVoiceName] = useState<string>(() => {
    try {
      return localStorage.getItem('gina_voice_default') || '';
    } catch {
      return '';
    }
  });
  const [voiceRate, setVoiceRate] = useState(0);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<Array<{name:string; culture:string; gender:string}>>([]);
  const [browserVoicesList, setBrowserVoicesList] = useState<SpeechSynthesisVoice[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [browserVoiceAvailable, setBrowserVoiceAvailable] = useState(false);
  const [microphoneAvailable, setMicrophoneAvailable] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; content?: string; bytes: number; kind: 'text'|'image'|'archive'; mime: string; localPath?: string; previewUrl?: string; extractedFiles?: number }>>([]);
  const [fileAttachError, setFileAttachError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const supportedLocalAiExtensions = new Set([
    '.txt','.md','.markdown','.json','.csv','.tsv','.log','.ini','.cfg','.conf','.yaml','.yml','.xml','.html','.htm','.css',
    '.js','.jsx','.ts','.tsx','.py','.ps1','.bat','.cmd','.sh','.sql','.c','.h','.cpp','.hpp','.cc','.java','.cs','.go','.rs','.toml','.env',
    '.png','.jpg','.jpeg','.webp','.bmp','.gif','.zip'
  ]);
  const maxLocalAiFiles = 5;

  useEffect(() => {
    const applyReference = (detail: any) => {
      if (!detail?.localPath) return;
      setAttachedFiles(prev => {
        const without = prev.filter(file => file.kind !== 'image');
        if (without.length >= maxLocalAiFiles) return [...without.slice(0, maxLocalAiFiles - 1), { name: detail.name || 'asset-reference.png', bytes: 0, kind:'image', mime:'image/png', localPath:detail.localPath, previewUrl:detail.previewUrl }];
        return [...without, { name: detail.name || 'asset-reference.png', bytes:0, kind:'image', mime:'image/png', localPath:detail.localPath, previewUrl:detail.previewUrl }];
      });
      onAddLog('INFO', `Active asset reference loaded into the next AI Tools turn: ${detail.title || detail.name || 'image'}.`);
    };
    const listener = (event: Event) => applyReference((event as CustomEvent).detail);
    window.addEventListener('gina-asset-reference', listener);
    try { const raw=localStorage.getItem('gina_active_reference_asset'); if(raw) applyReference(JSON.parse(raw)); } catch {}
    return () => window.removeEventListener('gina-asset-reference', listener);
  }, []);

  const handleAttachFile = async (file?: File) => {
    if (!file) return;
    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    setFileAttachError(null);
    if (!supportedLocalAiExtensions.has(extension)) {
      setFileAttachError(`Unsupported file type. Local AI accepts supported text/code/config files, images and ZIP archives.`);
      return;
    }
    if (attachedFiles.length >= maxLocalAiFiles) {
      setFileAttachError(`You can attach up to ${maxLocalAiFiles} files to one Local AI turn.`);
      return;
    }
    const image = ['.png','.jpg','.jpeg','.webp','.bmp','.gif'].includes(extension);
    const archive = extension === '.zip';
    const localLimit = image ? 12 * 1024 * 1024 : archive ? 25 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > localLimit) {
      setFileAttachError(`"${file.name}" is too large. Maximum is ${Math.round(localLimit / 1024 / 1024)} MB for this type.`);
      return;
    }
    try {
      const response = await fetch('/api/llm/upload-attachment', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Gina-Filename': encodeURIComponent(file.name),
          'X-Gina-Original-Name': encodeURIComponent(file.name),
          'X-Gina-Mime': file.type || 'application/octet-stream'
        },
        body: await file.arrayBuffer()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || `Upload failed (HTTP ${response.status}).`);
      const attachment = data.attachment;
      const previewUrl = image ? URL.createObjectURL(file) : undefined;
      let content: string | undefined;
      if (!image && !archive) content = await file.text();
      if (archive && attachment?.extracted?.extracted?.length) {
        content = attachment.extracted.extracted.map((item: any) => `\n[ZIP FILE: ${item.name}]\n${item.content}\n[END ZIP FILE: ${item.name}]`).join('');
      }
      setAttachedFiles(prev => [...prev, {
        name: attachment.name || file.name,
        content,
        bytes: file.size,
        kind: image ? 'image' : archive ? 'archive' : 'text',
        mime: attachment.mime || file.type || 'application/octet-stream',
        localPath: attachment.localPath,
        previewUrl,
        extractedFiles: attachment?.extracted?.extracted?.length || 0,
      }]);
      onAddLog('INFO', `Attached "${file.name}" to the next Local AI request.`);
    } catch (error: any) {
      setFileAttachError(`Could not attach "${file.name}": ${error?.message || 'upload error'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (voiceName) {
      try {
        localStorage.setItem('gina_voice_name', voiceName);
      } catch { /* ignore */ }
    }
  }, [voiceName]);

  const handleSetDefaultVoice = (targetVoice?: string) => {
    const chosen = targetVoice || voiceName;
    if (!chosen) return;
    try {
      localStorage.setItem('gina_voice_default', chosen);
      localStorage.setItem('gina_voice_name', chosen);
      setDefaultVoiceName(chosen);
      setVoiceName(chosen);
      onAddLog('INFO', `Voice "${chosen}" saved as permanent default.`);
    } catch (err: any) {
      onAddLog('WARN', `Failed to persist default voice: ${err?.message || 'storage error'}`);
    }
  };


  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/llm/status', { cache: 'no-store' });
      const responseText = await response.text();
      let data: any = {};
      try { data = responseText.trim() ? JSON.parse(responseText) : {}; } catch { throw new Error(`Gina backend returned invalid JSON (HTTP ${response.status}).`); }
      if (!response.ok) {
        const diagnostic = data?.diagnostic?.recentLog?.slice?.(-3)?.join?.(' | ');
        throw new Error([data?.error || `HTTP ${response.status}`, diagnostic].filter(Boolean).join(' — '));
      }
      setStatus(data);
      setError(data.lastError || null);
    } catch (err: any) {
      setError(err?.message || 'Local LLM status unavailable');
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  useEffect(() => {
    const refreshBrowserVoices = () => {
      const available = typeof window !== 'undefined' && 'speechSynthesis' in window;
      const mic = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      setBrowserVoiceAvailable(available);
      setMicrophoneAvailable(mic);
      if (!available) return;
      const browserVoices = window.speechSynthesis.getVoices();
      setBrowserVoicesList(browserVoices);
      if (browserVoices.length) {
        const savedDefault = localStorage.getItem('gina_voice_default') || '';
        const savedName = localStorage.getItem('gina_voice_name') || '';

        // Priority 1: User's explicitly saved default voice
        const matchedDefault = savedDefault && browserVoices.find(v => v.name === savedDefault);
        const matchedSaved = savedName && browserVoices.find(v => v.name === savedName);

        // Priority 2: Google US English natural voice
        const googleUs =
          browserVoices.find(v => /google\s+us\s+english/i.test(v.name)) ||
          browserVoices.find(v => /google/i.test(v.name) && /en-US/i.test(v.lang));

        // Priority 3: Other natural female / English voices
        const naturalFallback =
          browserVoices.find(v => /microsoft.*jenny/i.test(v.name)) ||
          browserVoices.find(v => /jenny/i.test(v.name)) ||
          browserVoices.find(v => /microsoft.*aria/i.test(v.name)) ||
          browserVoices.find(v => /microsoft.*zira/i.test(v.name)) ||
          browserVoices.find(v => /en-US/i.test(v.lang)) ||
          browserVoices.find(v => /en-GB/i.test(v.lang)) ||
          browserVoices[0];

        if (matchedDefault) {
          setVoiceName(matchedDefault.name);
          setDefaultVoiceName(matchedDefault.name);
        } else if (matchedSaved) {
          setVoiceName(matchedSaved.name);
        } else if (googleUs) {
          setVoiceName(googleUs.name);
          setDefaultVoiceName(googleUs.name);
          try {
            localStorage.setItem('gina_voice_default', googleUs.name);
            localStorage.setItem('gina_voice_name', googleUs.name);
          } catch { /* ignore */ }
        } else if (naturalFallback) {
          setVoiceName(naturalFallback.name);
        }
      }
    };

    refreshBrowserVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', refreshBrowserVoices);
    }

    fetch('/api/voice/status', { cache: 'no-store' })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setVoiceAvailable(!!data.available);
        setVoices(Array.isArray(data.voices) ? data.voices : []);
        // Only fallback to backend SAPI voice if no browser voice is available and no voiceName is set
        const currentSavedDefault = localStorage.getItem('gina_voice_default');
        if (!currentSavedDefault && !voiceName && (!('speechSynthesis' in window) || !window.speechSynthesis.getVoices().length)) {
          const backendVoices = Array.isArray(data.voices) ? data.voices : [];
          const preferredBackend =
            backendVoices.find((v:any) => /google\s+us\s+english/i.test(v.name)) ||
            backendVoices.find((v:any) => /microsoft.*jenny/i.test(v.name)) ||
            backendVoices.find((v:any) => /jenny/i.test(v.name)) ||
            backendVoices.find((v:any) => /microsoft.*aria/i.test(v.name)) ||
            backendVoices.find((v:any) => /microsoft.*zira/i.test(v.name)) ||
            backendVoices[0];
          if (preferredBackend?.name) setVoiceName(preferredBackend.name);
        }
      })
      .catch(() => setVoiceAvailable(false));

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.removeEventListener('voiceschanged', refreshBrowserVoices);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const runAction = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/llm/${action}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${action} local LLM`);
      setStatus(data.status);
      onAddLog('INFO', `Local Gemma ${action} request completed.`);
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} local LLM`);
      onAddLog('WARN', `Local Gemma ${action} failed: ${err?.message || 'unknown error'}`);
    } finally {
      setLoading(false);
      void loadStatus();
    }
  };

  const saveLastResponseAsPdf = async () => {
    const previousAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.content;
    if (!previousAssistant || pdfSaving) return;
    setPdfSaving(true);
    setPdfNotice(null);
    try {
      const response = await fetch('/api/llm/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: previousAssistant, path: 'C:\\Gina_AI\\gina-chat-output.pdf' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setPdfNotice(`PDF saved: ${data.path} (${data.bytes} bytes, ${data.pages} page(s))`);
      onAddLog('INFO', `Gina PDF written: ${data.path}`);
    } catch (err: any) {
      setPdfNotice(`PDF save failed: ${err?.message || 'unknown error'}`);
      onAddLog('WARN', `Gina PDF save failed: ${err?.message || 'unknown error'}`);
    } finally {
      setPdfSaving(false);
    }
  };

  // Speech-only Markdown sanitizer: keep rich formatting in chat, but never speak markup tokens.
  const sanitizeForSpeech = (input: string) => {
    let text = input || '';
    // Images/links: keep readable label, discard URL syntax.
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    // Fenced code blocks: speak their contents without Markdown fences.
    text = text.replace(/```[\w-]*\n?/g, '').replace(/```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');
    // Bold/italic/strike markers.
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/~~([^~]+)~~/g, '$1');
    text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');
    text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1');
    // Headings and blockquotes.
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
    text = text.replace(/^\s*>\s?/gm, '');
    // Bullets/checklists become natural spoken pauses.
    text = text.replace(/^\s*(?:[-*+] |\d+[.)] )/gm, '');
    text = text.replace(/^\s*[-*+]\s*$/gm, '');
    // Tables: remove pipe separators while preserving cell text.
    text = text.replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, '');
    text = text.replace(/\s*\|\s*/g, '. ');
    // HTML tags and escaped Markdown punctuation.
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/\\([*_`#>\[\]\\])/g, '$1');
    // Avoid speaking repeated whitespace/newlines as awkward pauses.
    return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  };

  const speakText = async (text: string) => {
    const speechText = sanitizeForSpeech(text);
    if (!voiceEnabled || !speechText.trim()) return;
    setSpeaking(true);
    try {
      const browserVoices = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
      const matchingBrowserVoice = browserVoices.find(v => v.name === voiceName);

      // If selected voice is a browser voice (e.g. Google US English), use browser synthesis directly
      if (matchingBrowserVoice && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.voice = matchingBrowserVoice;
        utterance.rate = Math.max(0.5, Math.min(2, 1 + voiceRate * 0.08));
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }

      // If selected voice is a backend SAPI voice, use backend audio bridge
      const backendSupportsSelectedVoice = voiceAvailable && voices.some(v => v.name === voiceName);
      if (backendSupportsSelectedVoice) {
        try {
          const response = await fetch('/api/voice/speak', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ text: speechText, voice:voiceName, rate:voiceRate })
          });
          if (!response.ok) throw new Error((await response.json().catch(()=>({})))?.error || `Voice synthesis HTTP ${response.status}`);
          const blob = await response.blob();
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          const audio = new Audio(url);
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => { throw new Error('Audio playback failed.'); };
          try { await audio.play(); return; } catch { /* fall through to browser speech */ }
        } catch (bridgeErr:any) {
          onAddLog('WARN', `Windows voice bridge unavailable; using browser voice: ${bridgeErr?.message || 'unknown error'}`);
        }
      }

      // Fallback to best available browser voice
      if (!browserVoiceAvailable || !('speechSynthesis' in window)) throw new Error('No local speech engine is available in this browser.');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      const selected =
        browserVoices.find(v => v.name === voiceName) ||
        browserVoices.find(v => /google\s+us\s+english/i.test(v.name)) ||
        browserVoices.find(v => /google/i.test(v.name) && /en-US/i.test(v.lang)) ||
        browserVoices.find(v => /microsoft.*jenny/i.test(v.name)) ||
        browserVoices.find(v => /jenny/i.test(v.name)) ||
        browserVoices.find(v => /microsoft.*aria/i.test(v.name)) ||
        browserVoices.find(v => /microsoft.*zira/i.test(v.name)) ||
        browserVoices.find(v => /en-US/i.test(v.lang)) ||
        browserVoices.find(v => /en-GB/i.test(v.lang)) ||
        browserVoices[0];
      if (selected) utterance.voice = selected;
      utterance.rate = Math.max(0.5, Math.min(2, 1 + voiceRate * 0.08));
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (err:any) {
      setSpeaking(false);
      onAddLog('WARN', `Gina voice failed: ${err?.message || 'unknown error'}`);
      setError(`Voice failed: ${err?.message || 'unknown error'}`);
    }
  };

  const toggleMicrophone = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError('Voice input is not supported by this browser. Use Chrome or Edge for microphone input.');
      return;
    }
    if (listening) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || 'en-GB';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event:any) => {
      setListening(false);
      setError(`Microphone error: ${event?.error || 'unknown error'}`);
    };
    recognition.onresult = (event:any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      transcript = transcript.trim();
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal && transcript) {
        // Pass the transcript directly so React state timing cannot send the previous prompt.
        void sendMessage(transcript);
      }
    };
    recognition.start();
  };

  const testVoice = () => {
    const last = [...messages].reverse().find(m => m.role === 'assistant')?.content || 'Hello. This is Gina voice mode. Your local voice system is working.';
    void speakText(last);
  };

  const cancelChat = async () => {
    try { await fetch('/api/llm/cancel', { method: 'POST' }); } catch { /* server may already have ended the request */ }
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setLoading(false);
    setError('Local AI generation cancelled.');
    onAddLog('INFO', 'Local Gemma generation cancelled by user.');
  };

  const isImageGenerationRequest = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return false;
    const imageNoun = /\b(image|picture|photo|artwork|illustration|render|portrait|wallpaper|logo|icon|bezel|watch face|scene|product shot|product photography)\b/i.test(normalized);
    const createImage = /\b(create|generate|make|draw|render|produce|design|visuali[sz]e|paint|illustrate)\b/i.test(normalized) && imageNoun;
    const modifyAttached = attachedFiles.some(file => file.kind === 'image') && /\b(edit|modify|change|alter|transform|retouch|remove|add|replace|restyle|improve|work off)\b/i.test(normalized) && /\b(this image|attached image|attached photo|reference image|use (this|the) image|from this image|based on this image)\b/i.test(normalized);
    // AI Tools accepts a raw descriptive image prompt without requiring a leading
    // imperative such as "create". Avoid sending these to Gemma, where the model
    // may emit a fake tool_code block instead of invoking the local executor.
    const analysisOrQuestion = /^(?:describe|analyse|analyze|what|why|how|can you|tell me|explain|identify|read|summari[sz]e)\b/i.test(normalized);
    const bareImagePrompt = imageNoun && !analysisOrQuestion && !attachedFiles.some(file => file.kind === 'image') && normalized.length >= 12;
    return createImage || modifyAttached || bareImagePrompt;
  };

  const pollGeneratedImage = async (jobId: string, promptText: string, usedReference: boolean) => {
    const started = Date.now();
    while (Date.now() - started < 10 * 60 * 1000) {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/result`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(data?.error || `Image result check failed (HTTP ${response.status}).`);
      if (data.status === 'FAILED') throw new Error(data.error || 'Local image generation failed.');
      if (data.status === 'CANCELLED') throw new Error('Local image generation was cancelled.');
      if (data.ready && data.imageUrl) {
        setMessages(prev => [...prev, { role: 'assistant', content: usedReference ? `Done — I generated the image from your supplied reference.` : `Done — I generated the image locally from your prompt.`, imageUrl: data.imageUrl }]);
        try {
          await fetch('/api/assets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:`AI Tools · ${new Date().toLocaleString()}`, type:'image', url:data.imageUrl, fileFormat:'PNG', timestamp:new Date().toISOString(), promptUsed:promptText, jobId:data.jobId || jobId, workflowId:'flux_image' }) });
        } catch {}
        if (autoSpeak) void speakText(usedReference ? 'Done. I generated the image from your supplied reference.' : 'Done. I generated the image locally from your prompt.');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    throw new Error(`Image generation timed out after 10 minutes while waiting for ComfyUI.`);
  };

  const sendImageGeneration = async (text: string) => {
    const imageAttachments = attachedFiles.filter(file => file.kind === 'image').map(file => ({ name: file.name, mime: file.mime, localPath: file.localPath, kind: file.kind }));
    const response = await fetch('/api/ai-tools/image-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, attachments: imageAttachments })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || `Image generation request failed (HTTP ${response.status}).`);
    onAddLog('INFO', `AI Tool routed image request to ComfyUI/${data.workflowId}${data.usedReference ? ' using the supplied reference image' : ''}.`);
    setAiImageJobId(data.jobId);
    await adoptJob(data.jobId);
    setMessages(prev => [...prev, { role: 'assistant', content: data.usedReference ? 'I’m working from the supplied image now…' : 'I’m generating that image locally with FLUX…' }]);
    await pollGeneratedImage(data.jobId, text, !!data.usedReference);
    setAttachedFiles([]);
    setFileAttachError(null);
  };

  const sendMessage = async (overrideText?: string) => {
    const typedText = (overrideText ?? input).trim();
    const attachmentsText = attachedFiles.length
      ? attachedFiles.map(file => {
          if (file.kind === 'image') return `\n\n[ATTACHED LOCAL IMAGE: ${file.name}]\nThe image is stored locally at ${file.localPath || 'the Gina local upload store'}. ${status?.multimodal ? 'The image will be supplied to the local vision-capable model as an actual image input.' : 'The current Local AI engine has no multimodal projector configured, so the image can be stored but cannot yet be visually inspected.'}\n[END ATTACHED LOCAL IMAGE: ${file.name}]`;
          return `\n\n[ATTACHED LOCAL FILE: ${file.name}]\n${file.content || `(Binary/local attachment. Stored at ${file.localPath || 'the Gina local upload store'}. The current model has no direct binary parser for this file type.)`}\n[END ATTACHED LOCAL FILE: ${file.name}]`;
        }).join('')
      : '';
    const text = `${typedText}${attachmentsText}`.trim();
    if (!text || !status?.ready || loading) return;

    if (isImageGenerationRequest(typedText)) {
      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
      setMessages(nextMessages);
      setInput('');
      setLoading(true);
      setError(null);
      try {
        await sendImageGeneration(typedText);
      } catch (err: any) {
        setError(err?.message || 'Local image generation failed');
        onAddLog('WARN', `AI Tool image generation failed: ${err?.message || 'unknown error'}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      chatAbortRef.current = controller;
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...nextMessages],
          temperature: 0.7,
          maxTokens: 512,
          attachments: attachedFiles.filter(file => file.kind === 'image').map(file => ({
            name: file.name, mime: file.mime, localPath: file.localPath, kind: file.kind
          })),
        }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      let data: any = {};
      try { data = responseText.trim() ? JSON.parse(responseText) : {}; } catch { throw new Error(`Gina backend returned invalid JSON (HTTP ${response.status}).`); }
      if (!response.ok) {
        const diagnostic = data?.diagnostic?.recentLog?.slice?.(-3)?.join?.(' | ');
        throw new Error([data?.error || `HTTP ${response.status}`, diagnostic].filter(Boolean).join(' — '));
      }
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('The local model returned an empty response.');
      setMessages(prev => [...prev, { role: 'assistant', content: reply.trim() }]);
      setAttachedFiles([]);
      setFileAttachError(null);
      if (autoSpeak) void speakText(reply.trim());
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Local AI generation cancelled.');
        return;
      }
      // Do not keep a failed user turn in history. Keeping it would make the next
      // request another consecutive-user turn and can poison strict Gemma templates.
      setMessages(prev => prev.filter((_, index) => index !== prev.length - 1));
      setInput(text);
      setError(err?.message || 'Local model request failed');
      onAddLog('WARN', `Local Gemma chat failed: ${err?.message || 'unknown error'}`);
    } finally {
      if (chatAbortRef.current) chatAbortRef.current = null;
      setLoading(false);
    }
  };

  const stateLabel = useMemo(() => {
    if (!status?.configured) return 'NOT CONFIGURED';
    if (status.ready) return 'ONLINE';
    if (status.running) return 'STARTING';
    return 'OFFLINE';
  }, [status]);

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.5fr] gap-5">
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-bold">Local inference engine</div>
              <h2 className="text-xl font-semibold text-slate-100 mt-1 flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-400" /> Gemma 3 12B</h2>
              <p className="text-xs text-slate-500 mt-1">GGUF Q4_K_M through llama.cpp CUDA. The server stays off until you start it.</p>
            </div>
            <span className={`px-2 py-1 rounded border text-[9px] font-mono font-bold ${status?.ready ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{stateLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-slate-900/70 border border-slate-800 rounded p-3"><div className="text-slate-500">BACKEND</div><div className="text-slate-200 mt-1">{status?.backend || 'CUDA'}</div></div>
            <div className="bg-slate-900/70 border border-slate-800 rounded p-3"><div className="text-slate-500">GPU LAYERS</div><div className="text-slate-200 mt-1">{status?.gpuLayers ?? 28}</div></div>
            <div className="bg-slate-900/70 border border-slate-800 rounded p-3"><div className="text-slate-500">CONTEXT</div><div className="text-slate-200 mt-1">{status?.contextSize ?? 8192}</div></div>
            <div className="bg-slate-900/70 border border-slate-800 rounded p-3"><div className="text-slate-500">CPU THREADS</div><div className="text-slate-200 mt-1">{status?.threads ?? 6}</div></div>
          </div>

          <div className="mt-4 p-3 rounded border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-200/80 leading-relaxed">
            <strong className="text-amber-300">8 GB VRAM rule:</strong> starting Gemma tells ComfyUI to release cached models first. Avoid running heavy image/video generation at the same time as the 12B LLM.
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => runAction('start')} disabled={loading || !status?.configured || !!status?.running} className="px-3 py-2 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-2"><Play className="w-3.5 h-3.5" /> Start</button>
            <button onClick={() => runAction('stop')} disabled={loading || !status?.running} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-2"><Square className="w-3.5 h-3.5" /> Stop</button>
            <button onClick={() => runAction('restart')} disabled={loading || !status?.configured} className="px-3 py-2 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-2"><RotateCw className="w-3.5 h-3.5" /> Restart</button>
          </div>

          <div className="mt-4 text-[9px] font-mono text-slate-600 break-all">{status?.modelPath || 'C:\\Gina_AI\\models\\llm\\gemma-3-12b-it-Q4_K_M.gguf'}</div>
          {error && <div className="mt-3 p-3 rounded border border-rose-500/30 bg-rose-500/5 text-[10px] text-rose-300">{error}</div>}
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 shadow-sm h-[620px] min-h-0 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" /><span className="text-xs font-bold uppercase tracking-widest text-slate-200">Local Gina Chat</span></div>
            <div className="flex items-center gap-2"><button onClick={() => { setMessages([]); setError(null); setPdfNotice(null); }} disabled={!messages.length || loading} className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear</button><button onClick={() => void saveLastResponseAsPdf()} disabled={!messages.some(m => m.role === 'assistant') || pdfSaving} className="px-2 py-1 rounded border border-sky-500/30 bg-sky-500/5 text-sky-300 text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1"><FileDown className="w-3 h-3" /> {pdfSaving ? 'Saving…' : 'Save PDF'}</button>
              <button onClick={() => { const next = !voiceEnabled; setVoiceEnabled(next); if (next) testVoice(); }} disabled={!voiceAvailable && !browserVoiceAvailable} title={(voiceAvailable || browserVoiceAvailable) ? 'Toggle Gina voice' : 'No local voice engine detected'} className={`px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1 ${voiceEnabled ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>{voiceEnabled ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>} Voice</button>
              <button onClick={toggleMicrophone} disabled={listening || !microphoneAvailable} title="Speak to Gina" className={`px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1 ${listening ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-violet-500/30 bg-violet-500/5 text-violet-300'}`}>{listening ? <MicOff className="w-3 h-3"/> : <Mic className="w-3 h-3"/>} {listening ? 'Listening…' : 'Talk'}</button>
              <label className="flex items-center gap-1 px-2 text-[9px] font-mono text-slate-500"><input type="checkbox" checked={autoSpeak} onChange={e=>setAutoSpeak(e.target.checked)} /> Auto</label>
              {(voiceAvailable || browserVoiceAvailable) && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={voiceName}
                    onChange={e => {
                      const newVoice = e.target.value;
                      setVoiceName(newVoice);
                      try { localStorage.setItem('gina_voice_name', newVoice); } catch {}
                    }}
                    className="max-w-[210px] rounded border border-slate-800 bg-slate-900 px-1.5 py-1 text-[9px] text-slate-300 font-mono focus:border-emerald-500/50 outline-none"
                  >
                    {Array.from(new Set([
                      ...(browserVoiceAvailable ? window.speechSynthesis.getVoices().map(v => v.name) : []),
                      ...voices.map(v => v.name)
                    ])).sort((a,b) => {
                      const getScore = (n: string) => {
                        if (n === defaultVoiceName) return -200;
                        if (/google\s+us\s+english/i.test(n)) return -100;
                        if (/google/i.test(n)) return -80;
                        if (/microsoft.*jenny|jenny/i.test(n)) return -60;
                        if (/microsoft.*aria|aria/i.test(n)) return -40;
                        if (/microsoft.*zira|zira/i.test(n)) return -20;
                        return 0;
                      };
                      return getScore(a) - getScore(b) || a.localeCompare(b);
                    }).map(name => {
                      const isDef = name === defaultVoiceName;
                      const isGoogleUs = /google\s+us\s+english/i.test(name);
                      const isGoogle = /google/i.test(name);
                      const isJenny = /jenny/i.test(name);
                      const tag = isDef ? '★ [DEFAULT]' : isGoogleUs ? '★ [Google US - Natural]' : isGoogle ? '[Google Natural]' : isJenny ? '★ [Jenny - Female]' : '';
                      return (
                        <option key={name} value={name}>
                          {tag ? `${tag} ${name}` : name}
                        </option>
                      );
                    })}
                  </select>
                  {voiceName && voiceName === defaultVoiceName ? (
                    <span className="px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5" title="This voice is saved as your default">
                      ★ Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefaultVoice(voiceName)}
                      disabled={!voiceName}
                      className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-colors"
                      title={`Save "${voiceName}" as permanent default voice`}
                    >
                      ★ Set Default
                    </button>
                  )}
                </div>
              )}
              {voiceName && /google\s+us\s+english/i.test(voiceName) && <span className="text-[9px] font-mono text-emerald-400/90 font-semibold">GOOGLE US ENGLISH</span>}
              {voiceName && /jenny/i.test(voiceName) && !/google/i.test(voiceName) && <span className="text-[9px] font-mono text-pink-300/80">JENNY • FEMALE</span>}
              <div className="text-[9px] font-mono text-slate-600 flex items-center gap-1"><Cpu className="w-3 h-3" /> 127.0.0.1:{status?.port ?? 8080}</div>{status?.multimodal ? <span className="text-[8px] font-mono text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">VISION READY</span> : <span className="text-[8px] font-mono text-slate-600 border border-slate-800 px-1.5 py-0.5 rounded">TEXT ONLY</span>}</div>
          </div>

          {aiImageJobId && generationJob?.id === aiImageJobId && (generationJob.status === 'QUEUED' || generationJob.status === 'RUNNING') && (
            <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-[9px] font-mono uppercase tracking-wider">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold">Generating Image</span>
                  <span className="text-emerald-400">{generationJob.progress || 0}%</span>
                  {generationJob.currentStep != null && <span className="text-slate-500">Step {generationJob.currentStep}/{generationJob.totalSteps || '?'}</span>}
                </div>
                <button type="button" onClick={() => void cancelJob()} className="px-2.5 py-1 rounded border border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold" title="Stop ComfyUI generation, clear its queue and flush VRAM">
                  <Square className="inline w-3 h-3 mr-1" /> STOP &amp; FLUSH
                </button>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, generationJob.progress || 0))}%` }} />
              </div>
              <div className="mt-1.5 text-[8px] font-mono text-slate-600">FLUX / ComfyUI · job {aiImageJobId.slice(0, 8)}</div>
            </div>
          )}

          <div className="flex-1 min-h-0 max-h-[520px] overflow-y-scroll custom-scrollbar space-y-3 pr-1">
            {!messages.length && <div className="h-full min-h-[300px] flex items-center justify-center text-center text-slate-600 text-xs"><div><Zap className="w-6 h-6 mx-auto mb-2 text-slate-700" /><p>Start Gemma to chat locally.</p><p className="text-[10px] mt-1">No cloud provider is used.</p></div></div>}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-lg border p-3 text-xs leading-relaxed ${message.role === 'user' ? 'ml-10 bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'mr-10 bg-slate-900 border-slate-800 text-slate-300'}`}>
                <div className="text-[9px] font-mono uppercase tracking-wider text-slate-600 mb-1">{message.role}</div>
                <div className="whitespace-pre-wrap break-words">{message.content}</div>{message.imageUrl && <img src={message.imageUrl} alt="Gina generated image" className="mt-3 max-w-full rounded-lg border border-slate-700" />}
              </div>
            ))}
            {loading && status?.ready && <div className="mr-10 rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-500 animate-pulse">Gina is thinking locally…</div>}
          </div>

          {pdfNotice && <div className={`mb-2 p-2 rounded border text-[9px] ${pdfNotice.startsWith('PDF saved:') ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'}`}>{pdfNotice}</div>}
          <div className="mt-3 border-t border-slate-800 pt-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.markdown,.json,.csv,.tsv,.log,.ini,.cfg,.conf,.yaml,.yml,.xml,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.ps1,.bat,.cmd,.sh,.sql,.c,.h,.cpp,.hpp,.cc,.java,.cs,.go,.rs,.toml,.env,.png,.jpg,.jpeg,.webp,.bmp,.gif,.zip,text/plain,application/json,text/csv,text/markdown,text/xml,image/png,image/jpeg,image/webp,application/zip"
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                void files.reduce((promise, file) => promise.then(() => handleAttachFile(file)), Promise.resolve());
              }}
            />

            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachedFiles.map(file => (
                  <div key={file.name} className="flex items-center gap-1.5 px-2 py-1 rounded border border-sky-500/20 bg-sky-500/5 text-sky-300 text-[9px] font-mono max-w-full">
                    {file.kind === 'image' ? <ImageIcon className="w-3 h-3 shrink-0" /> : file.kind === 'archive' ? <Archive className="w-3 h-3 shrink-0" /> : <FileText className="w-3 h-3 shrink-0" />}
                    <span className="truncate max-w-[220px]">{file.name}</span>
                    <span className="text-slate-600">{Math.ceil(file.bytes / 1024)}KB</span>
                    {file.extractedFiles ? <span className="text-emerald-400">{file.extractedFiles} files</span> : null}
                    <button type="button" onClick={() => setAttachedFiles(prev => prev.filter(x => x.name !== file.name))} className="text-slate-500 hover:text-rose-300" title="Remove file"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            {fileAttachError && <div className="mb-2 p-2 rounded border border-rose-500/20 bg-rose-500/5 text-[9px] text-rose-300">{fileAttachError}</div>}

            <div className="flex gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} disabled={!status?.ready || loading} rows={3} placeholder={status?.ready ? 'Ask Gina… (Enter to send, Shift+Enter for a new line)' : 'Start the local LLM first…'} className="flex-1 resize-none rounded border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/50 disabled:opacity-50" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!status?.ready || loading || attachedFiles.length >= maxLocalAiFiles} title="Attach a supported local file, image or ZIP archive" className="self-end px-3 py-2 rounded border border-sky-500/30 bg-sky-500/5 text-sky-300 text-[10px] font-bold uppercase tracking-wider disabled:opacity-30 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attach</button>
              {loading ? <button onClick={() => void cancelChat()} className="self-end px-4 py-2 rounded border border-rose-500/50 bg-rose-500/10 text-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"><Square className="w-3 h-3" /> Stop & Flush</button> : <button onClick={() => void sendMessage()} disabled={!status?.ready || (!input.trim() && !attachedFiles.length)} className="self-end px-4 py-2 rounded bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider disabled:opacity-30">Send</button>}
            </div>
          </div>
          <div className="mt-2 text-[8px] font-mono text-slate-700">Local AI attachments stay on this machine: text/code/config ≤2 MB, images ≤12 MB, ZIP archives ≤25 MB · max 5 per turn. ZIP text is extracted locally. {status?.multimodal ? <span className="text-emerald-500">Vision attachments are enabled.</span> : <span>Image uploads are stored locally; add a Gemma mmproj to enable pixel vision.</span>}</div>
          {(voiceAvailable || browserVoiceAvailable) && <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-mono text-slate-600"><Volume2 className="w-3 h-3" /> SPEECH RATE <input aria-label="Speech rate" type="range" min="-5" max="5" value={voiceRate} onChange={e=>setVoiceRate(Number(e.target.value))} /><span>{voiceRate > 0 ? '+' : ''}{voiceRate}</span><button onClick={testVoice} className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200">TEST</button>{speaking && <span className="text-emerald-400 animate-pulse">SPEAKING</span>}</div>}
        </div>
      </div>

      {status?.recentLog?.length ? <details className="bg-slate-950 border border-slate-800 rounded-lg p-4"><summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-slate-500">llama-server diagnostic log</summary><pre className="mt-3 text-[9px] font-mono text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">{status.recentLog.join('\n')}</pre></details> : null}

      <div className="mt-3">
        <LocalRagKnowledgePanel onAddLog={(lvl, msg) => onAddLog(lvl === 'error' ? 'WARN' : 'INFO', msg)} defaultExpanded={false} />
      </div>
    </section>
  );
};
