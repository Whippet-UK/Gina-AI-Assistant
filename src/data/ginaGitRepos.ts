/**
 * Known GitHub repositories Gina can Import from / Push to.
 * Expand this list as more repos are added.
 */

export interface GinaGitRepo {
  id: string;
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  /** Local path when the repo is already checked out on this machine */
  localPath?: string;
  description?: string;
}

export const GINA_GIT_REPOS: GinaGitRepo[] = [
  {
    id: 'gina-ai-assistant',
    name: 'Gina-AI-Assistant',
    owner: 'Whippet-UK',
    url: 'https://github.com/Whippet-UK/Gina-AI-Assistant',
    defaultBranch: 'main',
    localPath: 'C:\\Gina_AI\\Gina-AI-Assistant',
    description: 'Primary Gina assistant application',
  },
  {
    id: 'jinkybot',
    name: 'Jinkybot',
    owner: 'Whippet-UK',
    url: 'https://github.com/Whippet-UK/Jinkybot',
    defaultBranch: 'main',
    localPath: 'C:\\Gina_AI\\Jinkybot',
    description: 'Jinkybot companion project',
  },
];

export function getGitRepo(idOrUrl: string): GinaGitRepo | undefined {
  const key = String(idOrUrl || '').trim().toLowerCase();
  return GINA_GIT_REPOS.find(
    (r) =>
      r.id === key ||
      r.url.toLowerCase() === key ||
      r.url.toLowerCase() + '.git' === key ||
      `${r.owner}/${r.name}`.toLowerCase() === key
  );
}
