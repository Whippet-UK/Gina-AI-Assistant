# Project Update Backlog

## Core Context & Guidelines
- Always implement clean error checking across both client and server files.
- Test your modifications locally before marking them complete.

## 🟩 Open Requests (Process sequentially)
- [ ] making Gina reliable and genuinely autonomous.

I'd prioritize it like this:

1. 🔒 Project-wide "Definition of Done" gate — Definitely worth it

This is the most important next upgrade.

Before Gina says "finished", it should automatically verify:

Project

 Read AGENTS.md
 Read the mandatory update checklist
 Identify project version/current phase
 Map relevant files/components
 Check for deprecated terminology/references
 Check UI + backend + API + docs + tests
 Check related suites, not just the file being edited

After changes

 Re-scan the entire project
 Search for stale references
 Validate imports/routes/API calls
 Type/lint/build where available
 Run relevant tests
 Check changed files against the original request
 Produce a change summary
 Refuse to claim completion if a gate fails

This directly addresses the problem you've already seen where one part gets updated while another suite still contains old references.

2. 🧠 Persistent project understanding — Very worth it

Instead of Gina rediscovering the project every time:

Upload ZIP → scan everything → build project map → understand architecture → store an indexed project model.

Then a request like:

"Replace the old video engine everywhere."

would cause Gina to locate all affected surfaces rather than only modifying the obvious Video Studio component.

I'd have it maintain something like:

PROJECT MAP
├── Frontend
│   ├── Video Studio
│   ├── GIF Studio
│   ├── Image Studio
│   └── System
├── Backend
│   ├── API
│   ├── Agents
│   └── Services
├── Models
├── Configuration
├── Tests
└── Documentation

with relationships between components.

3. 🌐 Local + Internet research — Yes, absolutely

The web layer we just added becomes much more useful here.

Gina could determine:

"I need to change this library/model/API."

Then automatically:

Inspect the local implementation.
Search current official documentation.
Check current version/API compatibility.
Compare local code against current documentation.
Make the change.
Validate it.

That is much better than relying on the Qwen model's training knowledge.

4. 🔄 Autonomous repair loop — This is the big one

Eventually the workflow should be:

REQUEST

↓

UNDERSTAND

↓

PLAN

↓

INSPECT

↓

RESEARCH LOCAL + WEB

↓

EDIT

↓

RUN VALIDATION

↓

FIND FAILURES

↓

REPAIR

↓

RE-VALIDATE

↓

PROJECT-WIDE INTEGRITY SCAN

↓

FINAL DIFF

↓

ZIP / Git commit

The critical part is that a failed test becomes another agent task, rather than the workflow stopping and asking you what to do.

5. GitHub integration — Worth it after the above

Once the autonomous loop is dependable, then I'd add:

"Push this to GitHub."

Gina could:

inspect Git state
create a branch
make changes
validate
show the diff
commit
push
optionally create a PR

That would make the system much closer to the development workflow you originally described.

What I would do next

I'd make Phase 49 the "Autonomous Project Completion Gate" rather than adding another UI feature.

The goal would be:

Gina is not allowed to declare a project update complete until the entire project has been checked against the request and the mandatory project rules.

And I'd make the gate machine-enforced, not another instruction buried in AGENTS.md.

That's the distinction that matters.

AGENTS.md says:

"Please remember to do this."

The completion gate says:

"You cannot report success until this is demonstrably true."

## 🟨 In Progress
- *None*

## 🟥 Completed Requests
- [x] 2026-09-12 — Phase 44: Local AI Project Attachments & Large ZIP Ingestion
  - Qwen Coder Attach control is enabled for text/code/config files and project ZIP archives.
  - Image attachments remain restricted to Qwen 2.5-VL Vision Mode.
  - Project ZIP uploads are imported into dedicated workspaces and automatically inspected without executing uploaded code.
  - Local AI ZIP capacity increased from 100 files to 10,000 files, with a 100MB archive upload limit.
  - Large project archives are handled as workspaces rather than injecting every file into the LLM prompt.

- [x] 2026-09-12 — Phase 43: Local AI Stack Optimization & UI Toggle Swap
  - Replaced Gemma routing with Qwen 2.5-VL Vision + Qwen Coder 7B text-only mode.
  - Qwen Vision remains the boot/default model and uses the local multimodal projector; Coder mode unloads the projector and raises the effective context to 16K.
  - Added Image Studio High Precision routing to FLUX.1 Lite + UMT5 and migrated active video routing to Wan 2.1 1.3B BF16.
  - Updated active project documentation and version to v1.19.3.
