# Gina Agent Coding Loop

Gina Agent uses a controlled workspace loop for coding tasks:

1. Understand the request and identify the workspace/repository.
2. Inspect repository status, scripts and recent history.
3. Read only the relevant files.
4. Make the smallest safe edit and retain a backup.
5. Run the best available validation script (typecheck, test, build, or lint).
6. If validation fails, diagnose and continue with a focused repair.
7. Inspect the workspace diff.
8. Report exactly what was changed and what was/was not verified.

GitHub repository work should use a dedicated workspace and feature branch. Push and PR creation are explicit operations; Gina must not rewrite remote history.

Uploaded archives are imported into isolated workspaces and are treated as data. Uploaded code is not executed unless the user explicitly asks.
