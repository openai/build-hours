export type NormalizedGitHubRepo = {
  repoUrl: string;
  normalizedRepo: string;
  cloneUrl: string;
  owner: string;
  repo: string;
};

export class GitHubRepoUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubRepoUrlError";
  }
}

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const REPO_SEGMENT = /^[A-Za-z0-9_.-]+$/;

export function normalizeGitHubRepoUrl(rawValue: string): NormalizedGitHubRepo {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new GitHubRepoUrlError("Enter a public GitHub repository URL.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new GitHubRepoUrlError("Enter a valid HTTPS GitHub repository URL.");
  }

  if (url.protocol !== "https:") {
    throw new GitHubRepoUrlError("GitHub repository URLs must use HTTPS.");
  }

  if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
    throw new GitHubRepoUrlError("Only public github.com repository URLs are supported.");
  }

  if (url.search || url.hash) {
    throw new GitHubRepoUrlError("Remove query parameters and fragments from the repository URL.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new GitHubRepoUrlError(
      "Use a repository homepage URL in the form https://github.com/<owner>/<repo>.",
    );
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");

  if (!owner || !repo || !REPO_SEGMENT.test(owner) || !REPO_SEGMENT.test(repo)) {
    throw new GitHubRepoUrlError("The repository URL must include a valid owner and repo name.");
  }

  const normalizedRepo = `${owner}/${repo}`;
  const repoUrl = `https://github.com/${normalizedRepo}`;

  return {
    repoUrl,
    normalizedRepo,
    cloneUrl: `${repoUrl}.git`,
    owner,
    repo,
  };
}
