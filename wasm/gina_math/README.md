# gina_math — WebAssembly hot-path kernels

Pure C-ABI math for motion curves and telemetry smoothing.

The UI **never requires** this module. `src/lib/ginaMath.ts` implements the same
API in TypeScript and is the default backend. When you place a built
`gina_math.wasm` at `public/wasm/gina_math.wasm` (or serve it at
`/wasm/gina_math.wasm`), the loader switches to WASM automatically.

## Why the TS fallback exists

This sandbox / some CI images lack a working `wasm32` standard library and
`wasm-ld`. Shipping a TS path avoids configuration breakage on machines that
cannot cross-compile.

## Build (local machine with rustup)

```bash
# one-time
rustup target add wasm32-unknown-unknown

cd wasm/gina_math
cargo build --release --target wasm32-unknown-unknown

# optional size pass if Binaryen is installed
wasm-opt -O3 \
  target/wasm32-unknown-unknown/release/gina_math.wasm \
  -o ../../public/wasm/gina_math.wasm
```

If you do not have `wasm-opt`, copy the cargo output directly:

```bash
mkdir -p ../../public/wasm
cp target/wasm32-unknown-unknown/release/gina_math.wasm ../../public/wasm/
```

## Exports (C ABI)

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `gina_squash_stretch_scales` | `(f32 t, f32 duration, *mut f32 out2)` | Motion phase scales |
| `gina_elastic_spring` | `(f32 t, f32 duration, f32 freq, f32 decay) -> f32` | Spring displacement |
| `gina_ema` | `(f32 prev, f32 sample, f32 alpha) -> f32` | EMA step |
| `gina_smooth_samples` | `(*mut f32, u32 len, f32 alpha)` | In-place EMA series |
| `gina_rolling_max` | `(*const f32, u32 len) -> f32` | Max for sparkline ceiling |
| `gina_math_version` | `() -> *const u8` | Version C-string |

## Cargo release settings (already set)

```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

No panic unwinding, no default allocator required beyond what the target provides.
Do not add `wasm-bindgen` — the JS loader uses raw `WebAssembly.instantiate`.
