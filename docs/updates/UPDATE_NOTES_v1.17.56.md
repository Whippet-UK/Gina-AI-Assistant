# Gina AI Factory v1.17.57

Startup stability hotfix for v1.17.55.

## Fixes
- Stabilized ProjectState callbacks with React `useCallback`, preventing the Create Studio effect from continuously re-running and destabilizing the dashboard.
- Kept AIDA64 reference staging intact.
- Removed the fragile named save-point import from App startup.
- Retained FLUX.1-Schnell GGUF and AIDA64 1024×600 settings.

## Deployment
Replace the previous v1.17.55 package with this package. No ComfyUI changes are required.
