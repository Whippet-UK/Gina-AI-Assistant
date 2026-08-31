export interface WorkflowNode {
  id: string;
  classType: string;
  inputs: Record<string, any>;
}

export interface WorkflowBinding {
  key: string;
  nodeId: string;
  input: string;
  classType: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParsedWorkflow {
  id: string;
  fileName: string;
  nodeCount: number;
  nodes: WorkflowNode[];
  bindings: WorkflowBinding[];
  capabilities: string[];
  outputNodes: string[];
  warnings: string[];
  workflow: Record<string, any>;
}

const aliases: Record<string, { key: string; inputs: string[]; classes?: string[] }[]> = {
  prompt: [{ key: 'prompt', inputs: ['text'], classes: ['CLIPTextEncode', 'CLIPTextEncodeFlux', 'CLIPTextEncodeSD3'] }],
  negativePrompt: [{ key: 'negative_prompt', inputs: ['text'], classes: ['CLIPTextEncode', 'CLIPTextEncodeFlux', 'CLIPTextEncodeSD3'] }],
  seed: [{ key: 'seed', inputs: ['noise_seed', 'seed'], classes: ['RandomNoise', 'KSampler', 'KSamplerAdvanced', 'LTXVideoSampler', 'LTXVSampler'] }],
  steps: [{ key: 'steps', inputs: ['steps'], classes: ['BasicScheduler', 'KSampler', 'KSamplerAdvanced', 'LTXVideoSampler', 'LTXVSampler'] }],
  cfg: [{ key: 'cfg', inputs: ['cfg'], classes: ['KSampler', 'KSamplerAdvanced', 'LTXVideoSampler', 'LTXVSampler'] }],
  sampler: [{ key: 'sampler', inputs: ['sampler_name'], classes: ['KSampler', 'KSamplerAdvanced', 'KSamplerSelect', 'LTXVideoSampler', 'LTXVSampler'] }],
  scheduler: [{ key: 'scheduler', inputs: ['scheduler'], classes: ['BasicScheduler', 'KSampler', 'KSamplerAdvanced', 'LTXVideoSampler', 'LTXVSampler'] }],
  width: [{ key: 'width', inputs: ['width'], classes: ['EmptyLatentImage', 'EmptySD3LatentImage', 'EmptyFlux2LatentImage', 'LTXVEmptyLatentVideo', 'EmptyLTXVLatentVideo', 'EmptyLatentVideo'] }],
  height: [{ key: 'height', inputs: ['height'], classes: ['EmptyLatentImage', 'EmptySD3LatentImage', 'EmptyFlux2LatentImage', 'LTXVEmptyLatentVideo', 'EmptyLTXVLatentVideo', 'EmptyLatentVideo'] }],
  // Keep video temporal length separate from sample batch size. LTX's batch_size is normally 1;
  // frame_count/length/num_frames are temporal controls and must never be aliased to batch_size.
  batchSize: [{ key: 'batch_size', inputs: ['batch_size'], classes: ['EmptyLatentImage', 'EmptySD3LatentImage', 'EmptyFlux2LatentImage'] }],
  model: [{ key: 'model', inputs: ['ckpt_name'], classes: ['CheckpointLoaderSimple', 'CheckpointLoader', 'LTXVLoader', 'LTXVideoLoader', 'LTXVideoModelLoader'] }],
  fps: [{ key: 'fps', inputs: ['frame_rate', 'fps'], classes: ['VHS_VideoCombine', 'SaveAnimatedWEBP', 'SaveAnimatedPNG'] }],
  startFrame: [{ key: 'start_frame', inputs: ['skip_first_frames', 'skip_first_images'], classes: ['VHS_LoadVideo', 'VHS_LoadImagesPath'] }],
  endFrame: [{ key: 'end_frame', inputs: ['frame_load_cap', 'image_load_cap'], classes: ['VHS_LoadVideo', 'VHS_LoadImagesPath'] }],
  denoise: [{ key: 'denoise', inputs: ['denoise'], classes: ['BasicScheduler', 'KSampler', 'KSamplerAdvanced'] }],
  inputImage: [{ key: 'input_image', inputs: ['image', 'image_path', 'filename'], classes: ['LoadImage'] }],
};

function isApiWorkflow(value: any): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).some((node: any) => node && typeof node === 'object' && typeof node.class_type === 'string');
}

function classifyNode(node: WorkflowNode) {
  const cls = node.classType.toLowerCase();
  const caps: string[] = [];
  if (cls.includes('cliptextencode') || cls.includes('textencode')) caps.push('text-conditioning');
  if (cls.includes('ksampler') || cls.includes('sampler')) caps.push('sampling');
  if (cls.includes('latent') && ('width' in node.inputs || 'height' in node.inputs)) caps.push('resolution');
  if (cls.includes('saveimage')) caps.push('image-output');
  if (cls.includes('videocombine') || cls.includes('videooutput') || cls.includes('vhs_') || cls.includes('saveanimated')) caps.push('video-output');
  if (cls.includes('loadimage')) caps.push('image-input');
  if (cls.includes('loadvideo') || cls.includes('loadimagespath')) caps.push('frame-input');
  if (cls.includes('rife') || cls.includes('vfi')) caps.push('frame-interpolation');
  if (cls.includes('videocombine')) caps.push('loop-output');
  if (cls.includes('vaeencode')) caps.push('img2img');
  if (cls.includes('upscale')) caps.push('upscale');
  return caps;
}

export function parseWorkflow(id: string, fileName: string, workflow: Record<string, any>): ParsedWorkflow {
  if (!isApiWorkflow(workflow)) throw new Error('Workflow JSON is not in ComfyUI API format. Export using the API format, not the UI graph format.');

  const nodes: WorkflowNode[] = Object.entries(workflow).map(([nodeId, raw]: [string, any]) => ({
    id: nodeId,
    classType: raw.class_type,
    inputs: raw.inputs || {}
  }));

  const bindings: WorkflowBinding[] = [];
  const used = new Set<string>();

  const addBinding = (key: string, node: WorkflowNode, input: string, confidence: WorkflowBinding['confidence']) => {
    const signature = `${key}:${node.id}:${input}`;
    if (used.has(signature)) return;
    used.add(signature);
    bindings.push({ key, nodeId: node.id, input, classType: node.classType, confidence });
  };

  const textNodes = nodes.filter(n => n.classType.includes('CLIPTextEncode') && 'text' in n.inputs);
  if (textNodes[0]) addBinding('prompt', textNodes[0], 'text', 'high');
  if (textNodes[1]) addBinding('negative_prompt', textNodes[1], 'text', 'medium');

  for (const node of nodes) {
    for (const [group, rules] of Object.entries(aliases)) {
      if (group === 'prompt' || group === 'negativePrompt') continue;
      for (const rule of rules) {
        if (rule.classes && !rule.classes.includes(node.classType)) continue;
        for (const input of rule.inputs) {
          if (!(input in node.inputs)) continue;
          addBinding(rule.key, node, input, rule.classes ? 'high' : 'medium');
          break;
        }
      }
    }
  }

  // Also expose every primitive workflow input as a namespaced low-confidence binding.
  // This is the important distinction between a curated Gina control set and the
  // actual ComfyUI graph: users can inspect/override scalar inputs without Gina
  // silently changing the background workflow. Linked inputs ([node,slot]) stay
  // read-only topology and are deliberately excluded.
  for (const node of nodes) {
    for (const [input, value] of Object.entries(node.inputs)) {
      if (Array.isArray(value) || value === null || value === undefined || typeof value === 'object') continue;
      const alreadyBound = bindings.some(b => b.nodeId === node.id && b.input === input);
      if (alreadyBound) continue;
      const safeNode = node.id.replace(/[^a-zA-Z0-9]/g, '_');
      const safeInput = input.replace(/[^a-zA-Z0-9]/g, '_');
      addBinding(`node_${safeNode}_${safeInput}`, node, input, 'low');
    }
  }

  const capabilities = [...new Set(nodes.flatMap(classifyNode))];
  const outputNodes = nodes.filter(n => capabilitiesForNode(n).some(c => c.endsWith('output'))).map(n => n.id);
  const warnings: string[] = [];
  if (!bindings.some(b => b.key === 'prompt')) warnings.push('No text prompt binding detected.');
  if (!bindings.some(b => b.key === 'seed')) warnings.push('No seed binding detected.');
  if (!bindings.some(b => b.key === 'width') && !bindings.some(b => b.key === 'height')) warnings.push('No resolution bindings detected.');
  if (!outputNodes.length) warnings.push('No image/video output node detected.');

  return { id, fileName, nodeCount: nodes.length, nodes, bindings, capabilities, outputNodes, warnings, workflow };
}

function capabilitiesForNode(node: WorkflowNode) {
  return classifyNode(node);
}

export function applyBindings(workflow: Record<string, any>, bindings: WorkflowBinding[], values: Record<string, any>) {
  const clone = structuredClone(workflow);
  for (const binding of bindings) {
    if (!(binding.key in values)) continue;
    if (!clone[binding.nodeId]) continue;
    clone[binding.nodeId].inputs = clone[binding.nodeId].inputs || {};
    clone[binding.nodeId].inputs[binding.input] = values[binding.key];
  }
  return clone;
}
