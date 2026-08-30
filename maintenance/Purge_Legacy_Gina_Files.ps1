# Gina AI Factory - safe legacy cleanup
# Run from an elevated PowerShell only if C:\Gina_AI is the intended Gina root.
# This script NEVER touches models, tools, ComfyUI, g_env, workflows, or source files.
$ErrorActionPreference = "Stop"
$Root = "C:\Gina_AI"
$Archive = Join-Path $Root "_archive\legacy-docs"

if (-not (Test-Path $Root)) { throw "Gina root not found: $Root" }
New-Item -ItemType Directory -Force -Path $Archive | Out-Null

# Historical release/fix notes are not runtime dependencies. Archive them instead
# of permanently deleting them, so they can be recovered if needed.
$patterns = @(
  "UPDATE_V*.md",
  "FIX_NOTES*.md",
  "STARTUP_FIX_NOTES.md",
  "SETUP_V1.2.md",
  "LOCAL_LLM_SETUP.md",
  "LOCAL_AGENT_SETUP.md"
)

foreach ($pattern in $patterns) {
  Get-ChildItem -LiteralPath $Root -Filter $pattern -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin @("README.md","CHANGELOG.md","AGENTS.md") } |
    ForEach-Object {
      Move-Item -LiteralPath $_.FullName -Destination (Join-Path $Archive $_.Name) -Force
      Write-Host "Archived $($_.Name)"
    }
}

# Remove only transient diagnostics/cache files that are safe to regenerate.
$transient = @(
  (Join-Path $Root "backend-error.txt"),
  (Join-Path $Root ".vite")
)
foreach ($item in $transient) {
  if (Test-Path $item) {
    Remove-Item -LiteralPath $item -Recurse -Force
    Write-Host "Removed transient $item"
  }
}

Write-Host ""
Write-Host "Gina cleanup complete."
Write-Host "Protected: models, tools, ComfyUI, g_env, workflows, src, server, and package files."
