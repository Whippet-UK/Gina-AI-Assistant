/**
 * Gina hot-path math kernels.
 *
 * Primary path: pure TypeScript (always available, zero config).
 * Optional path: load a prebuilt wasm/gina_math.wasm (C ABI from the Rust crate)
 * when present. Callers never depend on WASM being available.
 *
 * Mirrors wasm/gina_math/src/lib.rs and the phase math in
 * scripts/gina_motion_physics_engine.py.
 */

export interface SquashStretchScales {
  scaleX: number;
  scaleY: number;
}

export type GinaMathBackend = 'js' | 'wasm';

let backend: GinaMathBackend = 'js';
let wasmExports: WebAssembly.Exports | null = null;
let wasmMemory: WebAssembly.Memory | null = null;
let loadPromise: Promise<GinaMathBackend> | null = null;

const PI = Math.PI;

function clampf(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** JS reference: squash/stretch scales (matches Python engine phases). */
export function squashStretchScalesJS(t: number, duration = 2): SquashStretchScales {
  const dur = Math.max(duration, 1e-4);
  const p = clampf(t / dur, 0, 1);

  if (p < 0.4) {
    const normT = p / 0.4;
    const scaleY = 1 + 0.4 * normT;
    const scaleX = 1 / Math.max(Math.sqrt(scaleY), 1e-4);
    return { scaleX, scaleY };
  }
  if (p < 0.55) {
    const tau = (p - 0.4) / 0.15;
    const squash = Math.sin(tau * PI);
    return { scaleX: 1 + 0.5 * squash, scaleY: 1 - 0.45 * squash };
  }
  const tauSettle = (p - 0.55) / 0.45;
  const oscillation = Math.exp(-6.5 * tauSettle) * Math.cos(18 * tauSettle);
  return { scaleX: 1 - 0.2 * oscillation, scaleY: 1 + 0.3 * oscillation };
}

export function elasticSpringJS(t: number, duration = 1, frequency = 12, decay = 4): number {
  const dur = Math.max(duration, 1e-4);
  const p = clampf(t / dur, 0, 1);
  return Math.exp(-decay * p) * Math.sin(frequency * p * PI);
}

export function emaJS(prev: number, sample: number, alpha: number): number {
  const a = clampf(alpha, 0, 1);
  return a * sample + (1 - a) * prev;
}

export function smoothSamplesJS(samples: number[], alpha = 0.35): number[] {
  if (!samples.length) return [];
  const a = clampf(alpha, 0, 1);
  const out = samples.slice();
  let prev = out[0];
  for (let i = 1; i < out.length; i++) {
    prev = a * out[i] + (1 - a) * prev;
    out[i] = prev;
  }
  return out;
}

export function rollingMaxJS(samples: number[]): number {
  let m = 0;
  for (const v of samples) if (v > m) m = v;
  return m;
}

/**
 * Attempt to load `/wasm/gina_math.wasm` (optional).
 * Safe to call multiple times; resolves to active backend.
 */
export async function initGinaMath(wasmUrl = '/wasm/gina_math.wasm'): Promise<GinaMathBackend> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      if (typeof WebAssembly === 'undefined') return 'js';
      const response = await fetch(wasmUrl, { cache: 'force-cache' });
      if (!response.ok) return 'js';
      const memory = new WebAssembly.Memory({ initial: 1, maximum: 4 });
      const result = await WebAssembly.instantiateStreaming
        ? await WebAssembly.instantiateStreaming(response, { env: { memory } }).catch(async () => {
            const buf = await response.arrayBuffer();
            return WebAssembly.instantiate(buf, { env: { memory } });
          })
        : await WebAssembly.instantiate(await response.arrayBuffer(), { env: { memory } });
      wasmExports = result.instance.exports;
      wasmMemory = memory;
      // Probe version export if present
      const versionFn = wasmExports.gina_math_version as (() => number) | undefined;
      if (typeof versionFn === 'function') {
        backend = 'wasm';
      } else if (typeof wasmExports.gina_ema === 'function') {
        backend = 'wasm';
      } else {
        backend = 'js';
      }
    } catch {
      backend = 'js';
      wasmExports = null;
      wasmMemory = null;
    }
    return backend;
  })();
  return loadPromise;
}

export function getGinaMathBackend(): GinaMathBackend {
  return backend;
}

/** Unified API — uses WASM when loaded, otherwise JS. */
export function squashStretchScales(t: number, duration = 2): SquashStretchScales {
  if (backend === 'wasm' && wasmExports && wasmMemory) {
    try {
      const fn = wasmExports.gina_squash_stretch_scales as (t: number, d: number, out: number) => void;
      // Use a fixed scratch offset in linear memory
      const outPtr = 0;
      fn(t, duration, outPtr);
      const view = new Float32Array(wasmMemory.buffer, outPtr, 2);
      return { scaleX: view[0], scaleY: view[1] };
    } catch {
      /* fall through */
    }
  }
  return squashStretchScalesJS(t, duration);
}

export function elasticSpring(t: number, duration = 1, frequency = 12, decay = 4): number {
  if (backend === 'wasm' && wasmExports) {
    try {
      const fn = wasmExports.gina_elastic_spring as (t: number, d: number, f: number, decay: number) => number;
      return fn(t, duration, frequency, decay);
    } catch {
      /* fall through */
    }
  }
  return elasticSpringJS(t, duration, frequency, decay);
}

export function ema(prev: number, sample: number, alpha: number): number {
  if (backend === 'wasm' && wasmExports) {
    try {
      const fn = wasmExports.gina_ema as (p: number, s: number, a: number) => number;
      return fn(prev, sample, alpha);
    } catch {
      /* fall through */
    }
  }
  return emaJS(prev, sample, alpha);
}

export function smoothSamples(samples: number[], alpha = 0.35): number[] {
  if (backend === 'wasm' && wasmExports && wasmMemory && samples.length > 0) {
    try {
      const fn = wasmExports.gina_smooth_samples as (ptr: number, len: number, a: number) => void;
      const bytes = samples.length * 4;
      // Grow memory if needed (pages are 64KiB)
      const pagesNeeded = Math.ceil(bytes / 65536);
      if (wasmMemory.buffer.byteLength < bytes) {
        wasmMemory.grow(Math.max(1, pagesNeeded));
      }
      const ptr = 0;
      const view = new Float32Array(wasmMemory.buffer, ptr, samples.length);
      view.set(samples);
      fn(ptr, samples.length, alpha);
      return Array.from(view);
    } catch {
      /* fall through */
    }
  }
  return smoothSamplesJS(samples, alpha);
}

export function rollingMax(samples: number[]): number {
  if (backend === 'wasm' && wasmExports && wasmMemory && samples.length > 0) {
    try {
      const fn = wasmExports.gina_rolling_max as (ptr: number, len: number) => number;
      const view = new Float32Array(wasmMemory.buffer, 0, samples.length);
      view.set(samples);
      return fn(0, samples.length);
    } catch {
      /* fall through */
    }
  }
  return rollingMaxJS(samples);
}
