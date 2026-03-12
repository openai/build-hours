import { describe, expect, it } from "vitest";

import {
  GitHubRepoUrlError,
  normalizeGitHubRepoUrl,
} from "@/lib/analysis/github";

describe("normalizeGitHubRepoUrl", () => {
  it("accepts a canonical repo URL", () => {
    expect(normalizeGitHubRepoUrl("https://github.com/octocat/Hello-World")).toEqual({
      repoUrl: "https://github.com/octocat/Hello-World",
      normalizedRepo: "octocat/Hello-World",
      cloneUrl: "https://github.com/octocat/Hello-World.git",
      owner: "octocat",
      repo: "Hello-World",
    });
  });

  it("normalizes trailing slashes and .git suffixes", () => {
    expect(normalizeGitHubRepoUrl("https://github.com/octocat/Hello-World.git/")).toEqual({
      repoUrl: "https://github.com/octocat/Hello-World",
      normalizedRepo: "octocat/Hello-World",
      cloneUrl: "https://github.com/octocat/Hello-World.git",
      owner: "octocat",
      repo: "Hello-World",
    });
  });

  it("rejects issue URLs", () => {
    expect(() =>
      normalizeGitHubRepoUrl("https://github.com/octocat/Hello-World/issues/1"),
    ).toThrow(GitHubRepoUrlError);
  });

  it("rejects pull request URLs", () => {
    expect(() =>
      normalizeGitHubRepoUrl("https://github.com/octocat/Hello-World/pull/1"),
    ).toThrow(
      "Use a repository homepage URL in the form https://github.com/<owner>/<repo>.",
    );
  });

  it("rejects non-GitHub hosts", () => {
    expect(() =>
      normalizeGitHubRepoUrl("https://example.com/octocat/Hello-World"),
    ).toThrow("Only public github.com repository URLs are supported.");
  });

  it("rejects query strings and fragments", () => {
    expect(() =>
      normalizeGitHubRepoUrl("https://github.com/octocat/Hello-World?tab=readme"),
    ).toThrow("Remove query parameters and fragments from the repository URL.");
    expect(() =>
      normalizeGitHubRepoUrl("https://github.com/octocat/Hello-World#readme"),
    ).toThrow("Remove query parameters and fragments from the repository URL.");
  });
});
