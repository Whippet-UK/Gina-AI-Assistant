---
name: hardware_safeguards
description: >
  Hardware safeguard and memory-cage enforcement agents for the Gina AI
  Factory — VRAM ceiling auditing, thermal governing, VRAM pre-flush,
  targeted queue cancellation, subprocess termination, PCIe paging
  detection, OOM log scanning, private-network loopback blocking, a
  zero-VRAM BM25 indexer, and temporal grounding for prompts.
version: 1.0
category: hardware-safeguards
source: docs/agent_skills/Hardware_Safeguards.txt
vram_ceiling_mb: 7372
thermal_ceiling_c: 80
---

# Hardware Safeguards & Memory Cage Enforcers

All process allocations coordinated by this module must stay within the
**7372 MB VRAM hardware safety cage**. Skills in other modules (Media,
Audio, Image_Safeguards) that queue GPU work should defer to skill 41
below rather than implementing their own VRAM checks.

## 41. 7372 MB VRAM Safety Cage Auditor
**What it is:** A real-time GPU memory allocation sentinel.
**What it does:** Polls GPU memory use and holds new generation tasks once
allocation crosses a 90% threshold of the cage.
**Why it's needed:** Keeps the host desktop stable and prevents memory
overflow crashes.
**Implementation approach:** Poll `nvidia-smi` (or NVML) roughly every
3000ms; if used VRAM crosses the 7372 MB ceiling (or the 90% warning
threshold beneath it), block new model-load requests until usage drops.

## 42. 80°C Thermal Sentry Governor
**What it is:** A GPU core-temperature monitor and thermal brake.
**What it does:** Pauses or throttles rendering passes when GPU
temperature spikes.
**Why it's needed:** Protects hardware from overheating during sustained
rendering.
**Implementation approach:** Poll temperature via NVML; use two
thresholds (e.g. 60°C soft warning, 80°C hard stop) and insert a short
cooldown pause (e.g. 5 seconds) into the processing loop when the hard
threshold is crossed.

## 43. ComfyUI Pre-Queue Auto-Flush Operator
**What it is:** A preemptive VRAM cache cleanup tool.
**What it does:** Sends a memory-clear signal to the backend before
switching to a different workflow type.
**Why it's needed:** Frees VRAM held by the previous model set before
loading a new one, avoiding overlap crashes.
**Implementation approach:** Call the backend's free/unload endpoint
(e.g. `/free` with `unload_models: true`) as a step in the task submission
pipeline, before loading new model weights.

## 44. Global Queue Lockout Safeguard
**What it is:** A precise job-cancellation manager.
**What it does:** Cancels a specific job ID instead of clearing the whole
render queue.
**Why it's needed:** Prevents canceling one task from wiping out unrelated
queued work.
**Implementation approach:** Route cancellation requests to a targeted
delete call (e.g. `/queue` with `{"delete": [id]}`) rather than a global
clear command.

## 45. Audio Subprocess Termination Controller
**What it is:** A background worker supervisor for audio jobs.
**What it does:** Tracks child-process IDs for audio generation and
force-terminates them when a job is cancelled.
**Why it's needed:** Stops orphaned Python workers from continuing to
consume CPU after cancellation.
**Implementation approach:** Maintain a local map of job ID → process ID.
On cancellation, look up the PID and terminate it directly
(e.g. `child.kill()`), falling back to a stronger signal if it doesn't
exit promptly.

## 46. PCIe Paging Performance Clip Detector
**What it is:** A memory-swapping monitor.
**What it does:** Tracks model-load timing and logs a warning if data
appears to be swapping to system RAM.
**Why it's needed:** Flags performance degradation early so model layer
allocation can be tuned before generations slow to a crawl.
**Implementation approach:** Time each model-load call; if load latency
crosses a predefined threshold relative to model size, log an alert
suggesting layer/offload adjustment.

## 47. OOM Log Pattern Scanner
**What it is:** An automated memory-error monitor.
**What it does:** Watches backend logs for out-of-memory signatures and
triggers recovery.
**Why it's needed:** Catches memory overflows early and restores
stability automatically.
**Implementation approach:** Stream backend logs and match against known
signatures (e.g. `OutOfMemoryError`, `allocation failed`); on a match,
trigger the pre-queue flush (skill 43) and a short cooldown pause.

## 48. Private Network Loopback Shield
**What it is:** A security guard for web-research/browsing tools.
**What it does:** Blocks outgoing requests to local subnets, private IPs,
and internal network ranges.
**Why it's needed:** Prevents a browsing/search tool from being used to
probe or expose the local network.
**Implementation approach:** Validate every outgoing fetch destination
against common private ranges (e.g. `127.0.0.1`, `10.0.0.0/8`,
`172.16.0.0/12`, `192.168.0.0/16`, link-local addresses) and reject
matches before the request is made.

## 49. Zero-VRAM In-Memory BM25 Indexer
**What it is:** A lightweight document-indexing module.
**What it does:** Builds keyword/term-frequency indexes entirely in system
RAM.
**Why it's needed:** Gives the agent fast local search without spending
GPU memory on a vector database.
**Implementation approach:** Tokenize documents into term arrays and
compute BM25-style term frequencies on CPU only; keep the resulting index
small (design target: under ~1MB for typical local corpora).

## 50. Temporal Grounding Clock Generator
**What it is:** A conversational accuracy/context tuner.
**What it does:** Injects verified current date, time, and regional
context into the agent's system prompt.
**Why it's needed:** Stops the model from guessing or hallucinating
dates/times.
**Implementation approach:** Read the local system clock at inference
time and append a clear, explicit time/date/region profile to the system
prompt before each call.
