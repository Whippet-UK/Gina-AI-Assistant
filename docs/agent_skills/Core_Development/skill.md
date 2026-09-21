---
name: core_development
description: >
  Development, validation, and self-repair skills for the Gina AI Factory
  agent — compilation diagnostics, sandboxed path safety, version syncing,
  runtime discovery, git workflow, AST diff auditing, dependency auditing,
  shell sandboxing, JSON repair, and orphaned-file sweeps.
version: 1.0
category: core-development
source: docs/agent_skills/Core_Development.txt
---

# Core Development, Validation & Self-Repair Skills

This skill module groups the agent's foundational build-safety behaviors.
Each sub-skill below is implemented as an independent routine the agent can
invoke during a build/edit/validate loop. Implementation notes describe the
intended approach — they are design guidance, not drop-in code, and should
be reviewed and adapted to your actual toolchain before use.

## 1. Context-Aware Compilation & Diagnostic Log Triager
**What it is:** A tokenizing and error-mapping routine for compilation output.
**What it does:** Runs project validation (`npx tsc --noEmit`, Python
linters), captures stderr, isolates absolute file targets, and extracts
error line/column coordinates.
**Why it's needed:** Long stack traces are noisy for an LLM to parse. This
trims noise and headers down to a single clean fix target.
**Implementation approach:** A background shell listener captures stderr,
pipes it through a regex tokenizer matching `file:line:col` patterns
(e.g. `([a-zA-Z0-9_/.-]+):(\d+):(\d+)`), and maps the first few distinct
errors into a structured JSON payload for the repair loop.

## 2. Absolute Path Traversal & Sandboxed Write Sentry
**What it is:** A defensive filesystem guard on directory writes.
**What it does:** Intercepts path arguments, strips absolute prefixes and
`../` segments, and verifies the resolved target stays inside the active
sandbox workspace.
**Why it's needed:** Prevents the agent from writing outside its assigned
folder and protects core platform files from accidental corruption.
**Implementation approach:** Use `path.resolve()` and `path.relative()` to
compute the destination relative to the project root. If the relative path
starts with `..` or resolves outside the root, abort the write and log a
security exception rather than proceeding.

## 3. Automated Universal Version & Metadata Sync Guard
**What it is:** A release-identity configuration checker.
**What it does:** Verifies version fields across the project's version
surfaces (e.g. `src/version.ts`, `package.json`, `metadata.json`,
`index.html`, `AGENTS.md`, a milestone checklist component) before allowing
a task to be marked complete.
**Why it's needed:** Eliminates version mismatches across production
surfaces caused by manual edits.
**Implementation approach:** Treat one file (e.g. `src/version.ts`) as the
single source of truth. Parse the version string out of the other target
files and do a strict string-match check; block completion if any file
disagrees.

## 4. Package Manager & Script Discovery Agent
**What it is:** A local workspace runtime analyzer.
**What it does:** Scans a newly mounted workspace for lockfiles
(`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `requirements.txt`)
and reads available package scripts.
**Why it's needed:** Lets the agent auto-detect npm/pnpm/yarn/bun/pip
without being told which one a project uses.
**Implementation approach:** A sequential file-existence check populates an
execution-profile object (runtime, available scripts, lockfile version)
that later steps can read instead of guessing.

## 5. Git Feature Branch & PR Metadata Porter
**What it is:** An automated source-control workflow helper.
**What it does:** Creates a local feature branch, stages changes with
porcelain git commands, commits atomically, and compiles PR metadata.
**Why it's needed:** Keeps experimental agent edits off the main branch.
**Implementation approach:** Wrap native git commands (`git checkout -b`,
`git add`, `git commit -m`) via child-process calls, check each exit code,
and return a clean JSON summary (branch name, files changed, diff stats).

## 6. Micro-Patch Tokenizer & AST Diff Inspector
**What it is:** A structural code-change auditor.
**What it does:** Reviews a diff and parses the modified syntax to check
that brackets, trailing commas, and parentheses remain balanced.
**Why it's needed:** Line-level diffs don't catch structural breakage (an
unclosed brace, a dropped bracket) before it hits the compiler.
**Implementation approach:** Run modified files through a lightweight
parser (or, at minimum, a bracket/paren tokenizer) and confirm symmetry
before considering an edit complete.

## 7. Dependency Matrix Lockfile Auditor
**What it is:** A third-party package security/version checker.
**What it does:** Audits lockfiles against a known-good or known-vulnerable
version manifest.
**Why it's needed:** Stops the agent from silently introducing deprecated
or insecure dependencies.
**Implementation approach:** Parse the dependency tree from the lockfile
and cross-check versions against a maintained compatibility/vulnerability
table before allowing an install step to proceed.

## 8. Shell Script Execution Sandbox Sentry
**What it is:** A terminal execution timeout and boundary guard.
**What it does:** Spawns and monitors shell processes with a strict
timeout (roughly 60–120s) and constrained environment handles.
**Why it's needed:** Prevents a runaway or hung process (e.g. a test
waiting on stdin) from locking up the host.
**Implementation approach:** Spawn subprocesses with an explicit timeout,
a capped output buffer (e.g. 8MB), and a kill-switch that sends `SIGTERM`
(then `SIGKILL` if needed) once a boundary is crossed.

## 9. Malformed JSON Stream Post-Processor
**What it is:** A corrective parser for model-generated JSON.
**What it does:** Strips markdown code fences, isolates the JSON payload,
and repairs common issues like unescaped internal quotes.
**Why it's needed:** Local models sometimes wrap JSON in prose or break
escaping in multi-line string fields.
**Implementation approach:** Use a greedy brace-matching extraction
(e.g. `\{[\s\S]*\}`) to isolate the object, validate it parses, and apply
targeted repairs (re-escaping quotes) before re-attempting `JSON.parse`.

## 10. Orphaned Code File Sweep Inspector
**What it is:** A source-tree hygiene manager.
**What it does:** Recursively scans the tree, matches imports against
existing files, and flags files nothing references.
**Why it's needed:** Stops abandoned duplicate files (e.g. an old
`Component1.tsx`) from confusing future edits or breaking builds.
**Implementation approach:** Index all workspace files, cross-reference
against import path strings found in the codebase, and move unreferenced
files to a temporary archive location (e.g. `.gina/archive/`) rather than
deleting them outright.

## Hardware / safety notes
Where any of the above skills spawn subprocesses or model-loading steps,
respect the workstation's memory ceiling as enforced by the Hardware
Safeguards skill set (see `Hardware_Safeguards/skill.md`) — this module
does not itself manage VRAM or process limits.
