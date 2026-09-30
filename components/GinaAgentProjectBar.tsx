import React, { useCallback, useState } from 'react';
import {
  FolderSearch,
  HardDrive,
  Github,
  Upload,
  Download,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { GINA_GIT_REPOS, type GinaGitRepo } from '../data/ginaGitRepos';
import { AGENT_IMPORT_PROTOCOL } from '../data/ginaAgentProfiles';

export interface GinaAgentProjectBarProps {
  onInjectSystemNote?: (note: string) => void;
  onLog?: (level: string, message: string) => void;
  onSetInput?: (updater: (prev: string) => string) => void;
  className?: string;
}

export const GinaAgentProjectBar: React.FC<GinaAgentProjectBarProps> = ({
  onInjectSystemNote,
  onLog,
  onSetInput,
  className = '',
}) => {
  const [repoId, setRepoId] = useState(GINA_GIT_REPOS[0]?.id || 'gina-ai-assistant');
  const [busy, setBusy] = useState<string | null>(null);
  const repo = GINA_GIT_REPOS.find((r) => r.id === repoId) || GINA_GIT_REPOS[0];

  const log = useCallback(
    (msg: string) => {
      onLog?.('INFO', msg);
    },
    [onLog]
  );

  const selectedRepo = (): GinaGitRepo =>
    GINA_GIT_REPOS.find((r) => r.id === repoId) || GINA_GIT_REPOS[0];

  const inspectProject = async () => {
    setBusy('inspect');
    try {
      const response = await fetch('/api/agent/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'inspect_project_map',
          parameters: { query: 'C:\\Gina_AI full tree overview' },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      log('Inspected C:\\Gina_AI project map.');
      onInjectSystemNote?.(
        `PROJECT INSPECT RESULT (C:\\Gina_AI):\n${JSON.stringify(data.result || data, null, 2).slice(0, 6000)}`
      );
      onSetInput?.((prev) =>
        prev.trim()
          ? prev
          : 'Inspect C:\\Gina_AI and summarise the project layout, key packages, and editable surfaces.'
      );
    } catch (e: any) {
      onLog?.('WARN', `Inspect project failed: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const importGithub = async () => {
    const r = selectedRepo();
    setBusy('import-gh');
    try {
      onInjectSystemNote?.(AGENT_IMPORT_PROTOCOL + `\n\nGitHub import target: ${r.url}`);
      const response = await fetch('/api/agent/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'github_clone',
          parameters: { url: r.url, workspace: r.name },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.result?.stderr || `HTTP ${response.status}`);
      log(`Imported GitHub repo ${r.url} → workspace ${r.name}`);
      onSetInput?.(
        () =>
          `[id: 'agent_coder'] Import from GitHub completed for ${r.url}. Follow the import protocol: READ → VERIFY PATH → ANALYZE DEPS → CONTEXTUALIZE → EXPLAIN → REFERENCE. Summarise the repo layout before any edits.`
      );
    } catch (e: any) {
      onLog?.('WARN', `GitHub import failed: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const pushGithub = async () => {
    const r = selectedRepo();
    setBusy('push-gh');
    try {
      const response = await fetch('/api/agent/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'github_push',
          parameters: { workspace: r.name },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.result?.stderr || `HTTP ${response.status}`);
      log(`Pushed workspace ${r.name} to ${r.url}`);
      onSetInput?.(
        () =>
          `[id: 'agent_coder'] Push to GitHub requested for ${r.url} (workspace ${r.name}). Report push status and any remote rejection clearly.`
      );
    } catch (e: any) {
      onLog?.('WARN', `GitHub push failed: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  const onLocalImport = async (file?: File | null) => {
    if (!file) return;
    setBusy('import-local');
    try {
      onInjectSystemNote?.(
        AGENT_IMPORT_PROTOCOL +
          `\n\nLocal import file: ${file.name} (${file.size} bytes, ${file.type || 'unknown type'}).`
      );
      if (/\.zip$/i.test(file.name)) {
        const up = await fetch('/api/agent/upload-project', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/zip',
            'X-Filename': encodeURIComponent(file.name),
          },
          body: file,
        });
        const data = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(data.error || `HTTP ${up.status}`);
        log(`Imported ZIP project ${file.name}`);
        onSetInput?.(
          () =>
            `[id: 'agent_coder'] ZIP imported: ${file.name}. Follow import protocol (READ → VERIFY PATH → ANALYZE DEPS → CONTEXTUALIZE → EXPLAIN → REFERENCE). Do not edit until the EXPLAIN summary is done.`
        );
      } else {
        // Attach path goes through normal Local AI attach; seed the protocol prompt.
        onSetInput?.(
          (prev) =>
            `[id: 'agent_coder'] Imported local file: ${file.name}.\n\n${AGENT_IMPORT_PROTOCOL}\n\n${prev.trim()}`.trim()
        );
        log(`Local import protocol primed for ${file.name} (also attach via paperclip if not already).`);
      }
    } catch (e: any) {
      onLog?.('WARN', `Local import failed: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={`rounded-xl border border-fuchsia-500/20 bg-slate-950/90 px-3 py-2 ${className}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">
          Coder project tools
        </span>
        <span className="text-[9px] font-mono text-slate-600">C:\Gina_AI · GitHub import/push</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-300">
          <Github className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500">Repo</span>
          <select
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
            className="max-w-[220px] bg-transparent text-[10px] text-emerald-300 outline-none"
          >
            {GINA_GIT_REPOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.owner}/{r.name}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-slate-600" />
        </label>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => void inspectProject()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 hover:border-emerald-500/40 disabled:opacity-40"
          title="Inspect C:\Gina_AI and project map"
        >
          {busy === 'inspect' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderSearch className="h-3.5 w-3.5 text-emerald-400" />}
          Inspect project
        </button>

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 hover:border-sky-500/40">
          <HardDrive className="h-3.5 w-3.5 text-sky-400" />
          Import local
          <input
            type="file"
            className="hidden"
            onChange={(e) => void onLocalImport(e.target.files?.[0])}
          />
        </label>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => void importGithub()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 hover:border-violet-500/40 disabled:opacity-40"
          title={`Import ${repo?.url}`}
        >
          {busy === 'import-gh' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-violet-400" />}
          Import GitHub
        </button>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => void pushGithub()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-slate-200 hover:border-amber-500/40 disabled:opacity-40"
          title={`Push to ${repo?.url}`}
        >
          {busy === 'push-gh' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-amber-400" />}
          Push GitHub
        </button>
      </div>

      {repo && (
        <div className="mt-1.5 truncate text-[9px] font-mono text-slate-600">
          Selected: {repo.url}
          {repo.localPath ? ` · local ${repo.localPath}` : ''}
        </div>
      )}
    </div>
  );
};

export default GinaAgentProjectBar;
