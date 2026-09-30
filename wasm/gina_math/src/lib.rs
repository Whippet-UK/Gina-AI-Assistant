//! Gina hot-path math kernels compiled to WebAssembly (no_std).
//!
//! Stable C ABI — load with `WebAssembly.instantiate`, no wasm-bindgen.
//! Mirrors motion phases in gina_motion_physics_engine.py and provides
//! telemetry sample smoothing for sparklines.

#![no_std]
#![allow(clippy::missing_safety_doc)]

use core::f32::consts::PI;

#[inline]
fn clampf(v: f32, lo: f32, hi: f32) -> f32 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

/// Minimal pure-Rust approx for sin (Bhaskara / polynomial), good enough for UI curves.
#[inline]
fn sin_approx(x: f32) -> f32 {
    // Range-reduce to [-PI, PI]
    let mut x = x % (2.0 * PI);
    if x > PI {
        x -= 2.0 * PI;
    } else if x < -PI {
        x += 2.0 * PI;
    }
    // Bhaskara I approximation-style polynomial on [-PI, PI]
    let y = (16.0 * x * (PI - x.abs())) / (5.0 * PI * PI - 4.0 * x.abs() * (PI - x.abs()));
    y
}

#[inline]
fn cos_approx(x: f32) -> f32 {
    sin_approx(x + PI * 0.5)
}

/// Fast exp approximation for decay envelopes (not IEEE-precise; fine for animation).
#[inline]
fn exp_approx(x: f32) -> f32 {
    // Clamp extreme tails
    if x < -20.0 {
        return 0.0;
    }
    if x > 20.0 {
        return 485165195.0; // ~e^20
    }
    // exp(x) ≈ 2^(x / ln2); use polynomial for 2^f
    const LN2: f32 = 0.693147;
    let t = x / LN2;
    let n = t.floor() as i32;
    let f = t - n as f32;
    // 2^f for f in [0,1) — minimax-ish
    let p = 1.0 + f * (0.693147 + f * (0.240226 + f * (0.0555041 + f * 0.009618)));
    // scale by 2^n via bit manipulation on f32 is awkward in pure no_std without transmute;
    // use iterative multiply for small |n|
    let mut out = p;
    if n > 0 {
        for _ in 0..n {
            out *= 2.0;
        }
    } else if n < 0 {
        for _ in 0..(-n) {
            out *= 0.5;
        }
    }
    out
}

#[inline]
fn sqrt_approx(x: f32) -> f32 {
    if x <= 0.0 {
        return 0.0;
    }
    // Newton iterations from bit-level guess via inverse
    let mut y = x;
    if x > 1.0 {
        y = x * 0.5;
    }
    for _ in 0..5 {
        y = 0.5 * (y + x / y);
    }
    y
}

/// Squash-and-stretch scale factors.
/// Writes [scale_x, scale_y] into `out` (2×f32).
#[no_mangle]
pub extern "C" fn gina_squash_stretch_scales(t: f32, duration: f32, out: *mut f32) {
    if out.is_null() {
        return;
    }
    let dur = if duration < 1e-4 { 1e-4 } else { duration };
    let p = clampf(t / dur, 0.0, 1.0);

    let (scale_x, scale_y) = if p < 0.40 {
        let norm_t = p / 0.40;
        let sy = 1.0 + 0.40 * norm_t;
        let sx = 1.0 / sqrt_approx(sy).max(1e-4);
        (sx, sy)
    } else if p < 0.55 {
        let tau = (p - 0.40) / 0.15;
        let squash = sin_approx(tau * PI);
        let sy = 1.0 - 0.45 * squash;
        let sx = 1.0 + 0.50 * squash;
        (sx, sy)
    } else {
        let tau_settle = (p - 0.55) / 0.45;
        let oscillation = exp_approx(-6.5 * tau_settle) * cos_approx(18.0 * tau_settle);
        let sy = 1.0 + 0.30 * oscillation;
        let sx = 1.0 - 0.20 * oscillation;
        (sx, sy)
    };

    unsafe {
        *out = scale_x;
        *out.add(1) = scale_y;
    }
}

/// Elastic spring track displacement (normalized).
#[no_mangle]
pub extern "C" fn gina_elastic_spring(t: f32, duration: f32, frequency: f32, decay: f32) -> f32 {
    let dur = if duration < 1e-4 { 1e-4 } else { duration };
    let p = clampf(t / dur, 0.0, 1.0);
    let freq = if frequency <= 0.0 { 12.0 } else { frequency };
    let d = if decay <= 0.0 { 4.0 } else { decay };
    exp_approx(-d * p) * sin_approx(freq * p * PI)
}

/// EMA: alpha * sample + (1 - alpha) * prev
#[no_mangle]
pub extern "C" fn gina_ema(prev: f32, sample: f32, alpha: f32) -> f32 {
    let a = clampf(alpha, 0.0, 1.0);
    a * sample + (1.0 - a) * prev
}

/// Smooth samples in-place with EMA.
#[no_mangle]
pub extern "C" fn gina_smooth_samples(ptr: *mut f32, len: u32, alpha: f32) {
    if ptr.is_null() || len == 0 {
        return;
    }
    let a = clampf(alpha, 0.0, 1.0);
    unsafe {
        let mut prev = *ptr;
        for i in 1..len as usize {
            let sample = *ptr.add(i);
            prev = a * sample + (1.0 - a) * prev;
            *ptr.add(i) = prev;
        }
    }
}

/// Rolling max of samples.
#[no_mangle]
pub extern "C" fn gina_rolling_max(ptr: *const f32, len: u32) -> f32 {
    if ptr.is_null() || len == 0 {
        return 0.0;
    }
    let mut m = 0.0f32;
    unsafe {
        for i in 0..len as usize {
            let v = *ptr.add(i);
            if v > m {
                m = v;
            }
        }
    }
    m
}

/// Static version string for capability probes.
#[no_mangle]
pub extern "C" fn gina_math_version() -> *const u8 {
    b"gina_math/0.1.0\0".as_ptr()
}

// Required for no_std panic
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
