import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import JSZip from 'jszip';

const execFileAsync = promisify(execFile);

export interface WorkspaceResult { path: string; name?: string; source?: string; stdout?: string; stderr?: string; }

function safeName(value: string): string {
  const name = String(value || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!name || name === '.' || name === '..') throw new Error('A valid workspace name is required.');
  return name.slice(0, 80);
}

export class AgentWorkspaceManager {
  constructor(private readonly root: string) {}

  get workspaceRoot() { return path.join(this.root, '.gina', 'workspaces'); }

  async ensure() { await fs.mkdir(this.workspaceRoot, { recursive: true }); }

  resolveWorkspace(name: string) {
    const safe = safeName(name);
    const target = path.resolve(this.workspaceRoot, safe);
    const root = path.resolve(this.workspaceRoot);
    if (target !== root && !target.toLowerCase().startsWith(root.toLowerCase() + path.sep)) throw new Error('Invalid workspace path.');
    return target;
  }

  async importZip(buffer: Buffer, filename: string, requestedName?: string) {
    if (!buffer.length) throw new Error('Uploaded archive is empty.');
    if (buffer.length > 100 * 1024 * 1024) throw new Error('Project upload exceeds the 100 MB limit.');
    const zip = await JSZip.loadAsync(buffer, { createFolders: false });
    const base = requestedName || path.basename(filename, path.extname(filename));
    const target = this.resolveWorkspace(base);
    await fs.mkdir(target, { recursive: true });
    let files = 0;
    for (const [entryName, entry] of Object.entries(zip.files) as Array<[string, any]>) {
      const normalized = entryName.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!normalized || normalized.includes('\0') || normalized.split('/').some(part => part === '..')) continue;
      const destination = path.resolve(target, normalized);
      if (destination !== target && !destination.toLowerCase().startsWith(target.toLowerCase() + path.sep)) continue;
      if (entry.dir) { await fs.mkdir(destination, { recursive: true }); continue; }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, await entry.async('nodebuffer'));
      files++;
      if (files > 10000) throw new Error('Project archive contains too many files.');
    }
    return { path: target, name: safeName(base), files, source: filename };
  }

  async clone(url: string, name?: string, token?: string) {
    const normalized = String(url || '').trim();
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?(?:\/)?$/.test(normalized)) {
      throw new Error('Only standard https://github.com/owner/repository URLs are supported for GitHub clone.');
    }
    const repoName = name || normalized.replace(/\/$/, '').split('/').pop()!.replace(/\.git$/i, '');
    const target = this.resolveWorkspace(repoName);
    await fs.rm(target, { recursive: true, force: true });
    await this.ensure();
    const env = { ...process.env } as Record<string, string>;
    if (token) {
      env.GIT_CONFIG_COUNT = '1';
      env.GIT_CONFIG_KEY_0 = 'http.extraheader';
      env.GIT_CONFIG_VALUE_0 = `Authorization: Bearer ${token}`;
    }
    const result = await execFileAsync('git', ['clone', '--depth', '1', normalized, target], { cwd: this.root, env, timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
    return { path: target, name: repoName, source: normalized, stdout: String(result.stdout || ''), stderr: String(result.stderr || '') };
  }

  async git(workspace: string, args: string[], token?: string, timeout = 120000) {
    const cwd = this.resolveWorkspace(workspace);
    const stat = await fs.stat(cwd).catch(() => null);
    if (!stat?.isDirectory()) throw new Error(`Workspace not found: ${workspace}`);
    const env = { ...process.env } as Record<string, string>;
    if (token) {
      env.GIT_CONFIG_COUNT = '1';
      env.GIT_CONFIG_KEY_0 = 'http.extraheader';
      env.GIT_CONFIG_VALUE_0 = `Authorization: Bearer ${token}`;
    }
    try {
      const result = await execFileAsync('git', args, { cwd, env, timeout, maxBuffer: 12 * 1024 * 1024 });
      return { cwd, exitCode: 0, stdout: String(result.stdout || '').slice(0, 60000), stderr: String(result.stderr || '').slice(0, 30000) };
    } catch (error: any) {
      return { cwd, exitCode: Number(error?.code) || 1, stdout: String(error?.stdout || '').slice(0, 60000), stderr: String(error?.stderr || error?.message || 'Git command failed').slice(0, 30000) };
    }
  }
}
