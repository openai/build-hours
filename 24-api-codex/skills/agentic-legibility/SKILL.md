---
name: agentic-legibility
description: Score a repository's agentic legibility from repo-visible evidence only. Use when Codex needs to audit how easy a codebase is for coding agents to discover, bootstrap, validate, and navigate, especially for harness-engineering reviews, developer-experience audits, repo cleanup, or before/after comparisons after improving docs, tooling, or architectural constraints.
---

# Agentic Legibility

## Overview

Measure how legible a repository is to coding agents using seven repo-visible metrics: bootstrap self-sufficiency, task entrypoints, validation harness, lint and format gates, agent repo map, structured docs, and decision records.

The scorer can auto-discover nested scopes such as `client/`, `server/`, or language-specific subtrees when the repo clearly routes work into a self-contained subsystem with its own manifests, commands, or agent docs.

Keep the main score limited to evidence present in version control. Do not claim branch protection, CI reliability, team habits, or other external-system properties unless the user asks for a separate operational review.

Use metric selection when you want to split scoring across multiple hosted-shell or Responses API runs and aggregate the JSON results upstream.

## Hosted Use

This folder is the skill bundle you upload or register when you want to mount `agentic-legibility` into hosted shell.

Public docs for that workflow:

- [Skills guide](https://developers.openai.com/api/docs/guides/tools-skills/)
- [Shell guide: Attach skills](https://developers.openai.com/api/docs/guides/tools-shell/#attach-skills)
- [Skills in OpenAI API cookbook](https://developers.openai.com/cookbook/examples/skills_in_api/)

## Workflow

1. Run `scripts/score_repo.py` against the target repository.
2. Check the reported `evaluated_scope` and `discovered_scopes`.
3. If the repo has multiple plausible sub-scopes, inspect the root README or user instructions and rerun with `--scope` when needed.
4. Read `references/scorecard.md` only if you need the exact rubric, want to explain edge cases, or need to adjust recommendations.
5. Inspect a small number of files manually only when the script reports low confidence or the evidence looks stale.
6. Report the selected metric scores, concrete evidence, the largest gaps, and the highest-value next fixes.

## Commands

Run the detector from the skill directory or pass an absolute path:

```bash
python3 scripts/score_repo.py /path/to/repo
python3 scripts/score_repo.py /path/to/repo --list-scopes
python3 scripts/score_repo.py /path/to/repo --scope client
python3 scripts/score_repo.py /path/to/repo --metric bootstrap_self_sufficiency --metric task_entrypoints
python3 scripts/score_repo.py /path/to/repo --metric validation_harness,lint_format_gates --format markdown
python3 scripts/score_repo.py --list-metrics
python3 scripts/score_repo.py /path/to/repo --exclude node_modules --exclude dist
```

Default output is JSON for post-processing. Use Markdown only when you want a human-readable report directly in a reply.

When nested scopes are discovered, the JSON includes both the selected scope and the discovered candidates. Treat nested `AGENTS.md` files as subtree guidance, not automatically as a full repo-wide map.

## Reporting Rules

- Treat scores as heuristics, not proof.
- Prefer repo evidence over inference from naming alone.
- Call out confidence when the signal is weak or ecosystem-specific.
- Keep recommendations concrete and mechanical: add a file, add a command, add a rule, add a doc index.
- Prioritize metrics with the lowest score and the highest leverage on agent workflows.
- When only a subset of metrics is requested, treat the aggregate score as a score over that subset only.

## Limits

- Keep the score repo-visible only.
- Do not fold proxy metrics such as CI parity, debt tracking, or entropy control into the main score in this skill version.
- Prefer conservative scores when a docs tree exists but indexing or routing is weak. It is better to recognize existing structure and recommend tightening it than to suggest artifacts that are already present.

## Resources

- `scripts/score_repo.py`: Scan a repository and emit JSON by default, with optional metric selection for split or parallel runs.
- `references/scorecard.md`: Define the seven metrics, scoring rubric, and recommendation style.
