import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

export interface GitStatusSummary {
  branch: string;
  isClean: boolean;
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  totalChanges: number;
  latestCommit?: { hash: string; message: string; author: string; date: string };
}

export interface GitDiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  statOutput: string;
  diffPatch: string;
}

export interface PullRequestPayload {
  title: string;
  body: string;
  head: string;
  base: string;
  changesSummary: string;
  filesModified: string[];
  timestamp: string;
}

export class GitHubLifecycleManager {
  constructor(private readonly defaultRoot: string) {}

  private async runGit(args: string[], cwd?: string, token?: string, timeoutMs = 60000): Promise<{ stdout: string; stderr: string; code: number }> {
    const targetCwd = path.resolve(cwd || this.defaultRoot);
    const env = { ...process.env } as Record<string, string>;
    if (token) {
      env.GIT_CONFIG_COUNT = '1';
      env.GIT_CONFIG_KEY_0 = 'http.extraheader';
      env.GIT_CONFIG_VALUE_0 = `Authorization: Bearer ${token}`;
    }

    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: targetCwd,
        env,
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024
      });
      return { stdout: String(stdout || ''), stderr: String(stderr || ''), code: 0 };
    } catch (err: any) {
      return {
        stdout: String(err?.stdout || ''),
        stderr: String(err?.stderr || err?.message || 'Git command failed'),
        code: Number(err?.code) || 1
      };
    }
  }

  /**
   * Reads Git repository status including branch, untracked, staged, and unstaged files.
   */
  public async getStatus(cwd?: string): Promise<GitStatusSummary> {
    const statusRes = await this.runGit(['status', '--porcelain', '-b'], cwd);
    const lines = statusRes.stdout.split(/\r?\n/).filter(Boolean);

    let branch = 'unknown';
    const stagedFiles: string[] = [];
    const unstagedFiles: string[] = [];
    const untrackedFiles: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const branchMatch = line.slice(3).split('...')[0].trim();
        branch = branchMatch;
        continue;
      }

      const indexState = line[0];
      const workTreeState = line[1];
      const filePath = line.slice(3).trim();

      if (indexState === '?' && workTreeState === '?') {
        untrackedFiles.push(filePath);
      } else {
        if (indexState !== ' ' && indexState !== '?') {
          stagedFiles.push(filePath);
        }
        if (workTreeState !== ' ' && workTreeState !== '?') {
          unstagedFiles.push(filePath);
        }
      }
    }

    // Get latest commit
    let latestCommit: GitStatusSummary['latestCommit'] | undefined;
    const logRes = await this.runGit(['log', '-1', '--pretty=format:%h|||%s|||%an|||%ad'], cwd);
    if (logRes.code === 0 && logRes.stdout.trim()) {
      const [hash, message, author, date] = logRes.stdout.trim().split('|||');
      latestCommit = { hash, message, author, date };
    }

    const totalChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length;

    return {
      branch,
      isClean: totalChanges === 0,
      stagedFiles,
      unstagedFiles,
      untrackedFiles,
      totalChanges,
      latestCommit
    };
  }

  /**
   * Safely creates or switches to a new Git branch.
   */
  public async createOrSwitchBranch(branchName: string, cwd?: string): Promise<{ success: boolean; branch: string; message: string }> {
    const cleanBranch = branchName.trim().replace(/[^a-zA-Z0-9._/-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanBranch) throw new Error('Invalid branch name provided.');

    // Try switching first
    const switchRes = await this.runGit(['checkout', cleanBranch], cwd);
    if (switchRes.code === 0) {
      return { success: true, branch: cleanBranch, message: `Switched to existing branch ${cleanBranch}` };
    }

    // If branch doesn't exist, create with -b
    const createRes = await this.runGit(['checkout', '-b', cleanBranch], cwd);
    if (createRes.code === 0) {
      return { success: true, branch: cleanBranch, message: `Created and switched to new branch ${cleanBranch}` };
    }

    return { success: false, branch: cleanBranch, message: createRes.stderr };
  }

  /**
   * Stages specified or all changes and creates an atomic Git commit.
   */
  public async stageAndCommit(message: string, files?: string[], cwd?: string): Promise<{ success: boolean; commitHash?: string; message: string }> {
    const cleanMessage = message.trim();
    if (!cleanMessage) throw new Error('A non-empty commit message is required.');

    // Stage
    const addArgs = files && files.length > 0 ? ['add', ...files] : ['add', '-A'];
    const addRes = await this.runGit(addArgs, cwd);
    if (addRes.code !== 0) {
      return { success: false, message: `git add failed: ${addRes.stderr}` };
    }

    // Commit
    const commitRes = await this.runGit(['commit', '-m', cleanMessage], cwd);
    if (commitRes.code !== 0) {
      return { success: false, message: `git commit failed: ${commitRes.stderr}` };
    }

    // Retrieve new hash
    const hashRes = await this.runGit(['rev-parse', '--short', 'HEAD'], cwd);
    const hash = hashRes.stdout.trim();

    return {
      success: true,
      commitHash: hash,
      message: `Committed ${hash}: ${cleanMessage}`
    };
  }

  /**
   * Generates diff statistics and patch output.
   */
  public async getDiff(cwd?: string, against = 'HEAD'): Promise<GitDiffSummary> {
    const statRes = await this.runGit(['diff', '--stat', against], cwd);
    const patchRes = await this.runGit(['diff', '-p', against], cwd);

    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;

    const summaryLine = statRes.stdout.split(/\r?\n/).filter(Boolean).pop() || '';
    const match = summaryLine.match(/(\d+)\s+files? changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/);
    if (match) {
      filesChanged = parseInt(match[1] || '0', 10);
      insertions = parseInt(match[2] || '0', 10);
      deletions = parseInt(match[3] || '0', 10);
    }

    return {
      filesChanged,
      insertions,
      deletions,
      statOutput: statRes.stdout.slice(0, 10000),
      diffPatch: patchRes.stdout.slice(0, 50000)
    };
  }

  /**
   * Pushes the active or specified branch to remote repository.
   */
  public async push(remote = 'origin', branch?: string, token?: string, cwd?: string): Promise<{ success: boolean; message: string }> {
    let targetBranch = branch;
    if (!targetBranch) {
      const status = await this.getStatus(cwd);
      targetBranch = status.branch;
    }

    if (!targetBranch || targetBranch === 'unknown') {
      return { success: false, message: 'Could not determine active branch to push.' };
    }

    const pushRes = await this.runGit(['push', '-u', remote, targetBranch], cwd, token, 120000);
    if (pushRes.code === 0) {
      return { success: true, message: `Successfully pushed branch ${targetBranch} to ${remote}.` };
    }

    return { success: false, message: pushRes.stderr || 'git push failed.' };
  }

  /**
   * Prepares structured Pull Request metadata for GitHub integration.
   */
  public async preparePullRequest(
    title: string,
    body: string,
    baseBranch = 'main',
    cwd?: string
  ): Promise<PullRequestPayload> {
    const status = await this.getStatus(cwd);
    const diff = await this.getDiff(cwd, baseBranch);

    return {
      title: title.trim(),
      body: body.trim(),
      head: status.branch,
      base: baseBranch,
      changesSummary: `${diff.filesChanged} files changed (+${diff.insertions} / -${diff.deletions})`,
      filesModified: [...status.stagedFiles, ...status.unstagedFiles],
      timestamp: new Date().toISOString()
    };
  }
}
