---
name: image_safeguards
description: >
  Image creation, canvas, and inpainting agents for the Gina AI Factory —
  SDXL inpaint mask coordination, vision-based reverse prompting, denoise
  sanity checks, output promotion, scene/style alignment, cache-busting,
  image-intent routing, dev-server upload protection, PNG workflow
  recovery, and text-encoder validation.
version: 1.0
category: image-safeguards
source: docs/agent_skills/Images.txt
---

# Image Creation, Canvas & Inpainting Agents

## 31. Multi-Pass SDXL Inpaint Mask Coordinator
**What it is:** A latent mask coordinator for targeted image edits.
**What it does:** Converts drawn canvas adjustments into high-contrast
binary masks and routes them to an inpainting workflow.
**Why it's needed:** Standard image-to-image touches the whole frame;
masking locks unedited pixels in place so only the marked region changes.
**Implementation approach:** Connect the mask layer to a
`SetLatentNoiseMask`-style input and lock denoise to a high value
(e.g. 0.85) for seamless blending at the mask edges.

## 32. Qwen Vision Reconstruction Prompting Agent
**What it is:** A pixel-grounded image description / reverse-prompt
engineer.
**What it does:** Runs an attached reference image through a vision model
to produce a dense descriptive prompt (style, camera angle, lighting,
composition).
**Why it's needed:** Automates prompt-writing for image variations so the
new generation matches the reference's visual style.
**Implementation approach:** Attach the image to a chat-completion call
with an instruction layer such as "Describe only what is visible... output
one dense prompt paragraph," and use the result directly as the next
generation's prompt.

## 33. Empty Latent Denoise Sentry Guard
**What it is:** A workflow parameter validator.
**What it does:** Forces `denoise = 1.0` whenever a job runs without a
reference image.
**Why it's needed:** Low denoise on an empty/blank latent produces flat,
low-detail output.
**Implementation approach:** Before execution, check for a populated
reference-image path; if absent, rewrite the workflow's denoise node to
1.0.

## 34. Image Output Promotion Broker
**What it is:** An automated output-to-input promotion tool.
**What it does:** Copies a completed output image into the generation
backend's input directory so it can be reused as a reference.
**Why it's needed:** Lets a user chain "use this result as my next
reference" in one step.
**Implementation approach:** A route handler fetches the latest job's
image bytes, sanitizes the filename with a clean prefix, and writes it
directly into the backend's input directory.

## 35. Automated Scene Alignment Optimizer
**What it is:** A prompt enhancer for consistent character/style
generation.
**What it does:** Merges a base character description with a chosen
lighting/style profile into one optimized prompt string.
**Why it's needed:** Keeps character-specific details (e.g. fur color)
consistent across scenes without clobbering manually set fields.
**Implementation approach:** Merge prompt fields programmatically,
resolving style lookups against a table, while leaving any user-edited
fields untouched.

## 36. Canvas Preview Cache Buster
**What it is:** An image reload / preview refresh helper.
**What it does:** Appends a changing token to preview image URLs to force
the browser to reload them.
**Why it's needed:** Browsers can keep showing a stale cached preview
after a new generation completes.
**Implementation approach:** Append a cache-busting query parameter, e.g.
`url + "?_cache_bust=" + Date.now()`.

## 37. Image Intent Authority Router
**What it is:** A semantic classifier for chat requests.
**What it does:** Decides whether an incoming message should route to the
image generation pipeline (and which model — e.g. Juggernaut-XL vs FLUX).
**Why it's needed:** Prevents image requests from being answered as
text-only chat instead of triggering an actual render job.
**Implementation approach:** Pattern-match visual-intent verbs ("generate,"
"create," "draw," etc.) and route matching messages into the image job
queue rather than the plain chat completion path.

## 38. Vite HMR Upload Protection Shield
**What it is:** A dev-server file-watcher configuration.
**What it does:** Excludes active upload directories from the dev
server's hot-reload watcher.
**Why it's needed:** Prevents HMR reloads from interrupting in-flight file
uploads.
**Implementation approach:** Add the relevant upload paths to
`server.watch.ignored` in `vite.config.ts`.

## 39. PNG Metadata Text Chunk Reader
**What it is:** A workflow-recovery extractor.
**What it does:** Parses `tEXt`/`iTXt` chunks in a saved PNG to recover an
embedded ComfyUI workflow JSON.
**Why it's needed:** Lets a user restore a full node graph from a
previously generated image instead of keeping separate layout files.
**Implementation approach:** Scan the PNG byte stream for `tEXt`/`iTXt`
chunk signatures, read the following data block, and parse it as the
original workflow JSON.

## 40. FLUX High-Precision T5 Validator
**What it is:** A text-encoder compatibility checker.
**What it does:** Blocks incompatible (e.g. video) text encoders from
loading into an image generation node.
**Why it's needed:** Mismatched encoder/model pairings crash the pipeline.
**Implementation approach:** Add a pre-flight check to the model loader
that rejects the job if a video-text-encoder model name is detected in an
image-generation node slot.

## Hardware / safety notes
Skill 31 and any batch inpainting/vision passes should respect the VRAM
ceiling enforced in `Hardware_Safeguards/skill.md` before queuing —
this module does not itself gate GPU memory.
