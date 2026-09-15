# Gina Agent — Coding & GitHub Workspaces

Gina Agent can work like a local coding agent: inspect files, edit code, run project validation, inspect Git diffs, create branches, commit changes, clone GitHub repositories, pull updates, push branches, and create pull requests.

## Workspace model

Repository work is isolated under:

`C:\Gina_AI\.gina\workspaces`

Uploaded ZIP projects are imported into a dedicated workspace. Gina should inspect an uploaded archive before executing any of its code.

## GitHub access

For private repositories and push/PR operations, configure a **fine-grained GitHub token** as `GITHUB_TOKEN` in Gina's environment. Limit it to the repositories Gina needs and grant only the permissions required for the task. GitHub recommends fine-grained permissions and GitHub Apps over broad classic tokens.

Example `.env` entry:

`GITHUB_TOKEN=github_pat_...`

Never paste a token into a prompt. Gina redacts token fields from its audit log.

## Typical workflow

1. Ask Gina to clone a repository.
2. Gina inspects the tree, branch, package scripts, README and Git status.
3. Ask for a code change.
4. Gina identifies the relevant files, reads them, edits them, and runs the repository validation command.
5. Gina reports the diff and validation result.
6. Ask Gina to create a feature branch, commit and push.
7. Ask Gina to open a pull request if desired.

## Safety rules

- Remote history is never force-pushed by the agent.
- GitHub operations use dedicated workspaces.
- Uploaded archives are path-traversal checked.
- Uploaded code is not executed merely because it was uploaded.
- Tokens are not written to repository files and are redacted from agent audit entries.
- The agent should prefer a branch for repository changes and should not push unless the user asks.
