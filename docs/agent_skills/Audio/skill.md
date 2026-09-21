---
name: audio
description: >
  Audio, lyrics, and voice agents for the Gina AI Factory — crossfading
  AudioCraft clips, port management for the local singing API, lyric
  tag condensing, PCM16 WAV writing, mid-side vocal separation, audio
  continuation chaining, model cache accounting, deck muxing, and lyric
  section-tag validation.
version: 1.0
category: audio
source: docs/agent_skills/Audio.txt
---

# Audio, Lyrics & Voice Master Agents

## 21. Acoustic Block Crossfader & Overlap Matrix
**What it is:** A smooth audio-block stitching module.
**What it does:** Calculates overlapping linear volume fades between
sequential 30-second AudioCraft clips.
**Why it's needed:** AudioCraft is limited to 30-second windows; splicing
without crossfade produces jarring jumps.
**Implementation approach:** NumPy ramp over the last ~1.5s of one segment
overlapped with the first ~1.5s of the next, blending amplitude
(and, where practical, frequency content) linearly across the overlap.

## 22. ACE-Step Local 8101 Port Router Sentry
**What it is:** A network binding manager for the local singing API.
**What it does:** Checks port 8101 on boot, clears stale bindings, and
starts the singing service cleanly.
**Why it's needed:** Prevents port conflicts from blocking the singing
service at startup.
**Implementation approach:** On Windows, query and stop conflicting
processes (e.g. `Get-NetTCPConnection -LocalPort 8101` plus
`Stop-Process`), then launch the API with a clean argument set.

## 23. Lyrics Theme Condenser & Tag Tokenizer
**What it is:** A text preprocessing module for audio-generation prompts.
**What it does:** Condenses full lyric sheets into short (~300-character)
descriptive tags (genre, mood, tempo, vocal type).
**Why it's needed:** Long/messy text wastes model context and degrades
generation quality.
**Implementation approach:** Extract key stylistic/emotional tokens (e.g.
"synthwave," "dark energetic tempo," "female vocals") and strip
formatting/markup before passing the tag string to the audio model.

## 24. PCM16 WAV Native Audio Builder
**What it is:** A dependency-free audio serialization utility.
**What it does:** Writes raw audio tensors directly to standard PCM-16 WAV
files.
**Why it's needed:** Some environments lack a working system audio-saving
backend; this is a fallback that needs nothing beyond the standard
library.
**Implementation approach:** Use Python's built-in `wave` and `struct`
modules to convert floating-point samples to signed 16-bit integers and
write a valid WAV container manually.

## 25. Mid-Side Audio Vocal Remover & Separator
**What it is:** A phase-cancellation stem separation utility.
**What it does:** Splits stereo into center-panned content
(vocals/bass-ish) and wide side-channel content (instruments) to produce
a rough instrumental.
**Why it's needed:** Gives a fast, local separation option without a full
neural stem-separation model.
**Implementation approach:** Subtract left/right channels
(`side = L - R`, `mid = (L + R) / 2`) with torchaudio, optionally
band-passing the isolated vocal-leaning signal (~200Hz–4000Hz).

## 26. Audio Continuation Chain Linker
**What it is:** A timeline-extension supervisor.
**What it does:** Extracts the trailing seconds of a reference clip and
passes them to AudioCraft as a melody/continuity prompt for the next
segment.
**Why it's needed:** Keeps tempo, key, and instrumentation consistent when
extending a short generation into a longer track.
**Implementation approach:** Slice the final ~3 seconds, resample to
32kHz (AudioCraft's expected input rate), and feed it as the melody
conditioning input for the next generation call.

## 27. Audio Craft Library Cache Evaluator
**What it is:** An offline model-asset storage tracker.
**What it does:** Scans the audio models folder, distinguishing
`.safetensors` from raw binaries so alternate formats aren't double
counted.
**Why it's needed:** Keeps storage-usage reporting accurate.
**Implementation approach:** `fs.statSync()` scan filtering for
`.safetensors`/`.bin`, preferring one format per model and skipping
duplicates in size totals.

## 28. Automated Audio Deck Muxing Pipeline
**What it is:** An in-app audio library update pipeline.
**What it does:** Writes completed tracks to the user upload folder and
tells the front-end player to load the new track immediately.
**Why it's needed:** Avoids manual refresh/copy steps after a generation
finishes.
**Implementation approach:** An API route captures the output file path,
registers it in the local track database, and emits a front-end event
carrying the new track URL.

## 29. Lyrical Structure & Section Tag Validator
**What it is:** A text-formatting linter for song lyrics.
**What it does:** Confirms structural tags (`[Verse 1]`, `[Chorus]`,
`[Bridge]`) are present before sending lyrics to the singing engine.
**Why it's needed:** Unformatted lyric sheets cause parsing errors during
synthesis.
**Implementation approach:** Regex check for required bracket tags;
insert reasonable default section wrappers if any are missing rather than
failing outright.

## 30. Dual-Weight Audio Profile Cache Excluder
**What it is:** A storage cleanup manager for duplicate model weights.
**What it does:** Detects when both `pytorch_model.bin` and
`model.safetensors` exist for the same model and excludes the duplicate
from disk-usage totals.
**Why it's needed:** Prevents inflated/incorrect storage figures on the
dashboard.
**Implementation approach:** Group files by model directory, count only
the preferred format (`.safetensors` over `.bin`), and log the redundant
file as excluded rather than deleting it.

## Hardware / safety notes
Skill 22's process cleanup and skill 45 (Audio Subprocess Termination
Controller, in `Hardware_Safeguards/skill.md`) both manage worker
processes — route audio subprocess kills through the hardware module's
tracked-PID map rather than duplicating termination logic here.
