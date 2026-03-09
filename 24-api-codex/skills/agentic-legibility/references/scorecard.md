# Agentic Legibility Scorecard

Use this rubric for repo-visible scoring only.

The detector may evaluate the repo root or a discovered nested scope such as `client/`, `server/`, or a language-specific subtree when the repository clearly routes work into self-contained subdomains.

The detector may score all seven metrics in one run or any requested subset. When only a subset is scored, interpret the aggregate score as applying to that subset only.

## Global Scale

- `0`: absent
- `1`: present but weak, partial, stale, or inconsistent
- `2`: solid and usable by an agent in normal workflows
- `3`: strong, explicit, and mechanically reinforced

## Core Metrics

### `bootstrap_self_sufficiency`

Measure whether the repository can declare and stand up its own local toolchain and services.

Strong evidence:
- `devcontainer.json`
- `docker-compose.yml` or `compose.yaml`
- `flake.nix`, `shell.nix`
- `mise.toml`, `.tool-versions`
- runtime pin files such as `.python-version`, `.nvmrc`
- lockfiles
- a canonical `setup` or `bootstrap` task

Score guidance:
- `0`: no meaningful setup declarations
- `1`: only partial manifests or version pins
- `2`: multiple setup signals and at least one credible path to bootstrap locally
- `3`: explicit declarative environment plus a canonical bootstrap entrypoint

### `task_entrypoints`

Measure whether common tasks are exposed through stable commands.

Strong evidence:
- `Makefile`, `justfile`, `Taskfile.yml`
- package manager scripts
- clear commands for `setup`, `dev`, `test`, `lint`, `build`, `check`

### `validation_harness`

Measure whether an agent can validate ordinary changes locally.

Strong evidence:
- test directories and test configs
- `test` or `check` entrypoints
- smoke, integration, or e2e layers
- fixtures or seed data

### `lint_format_gates`

Measure whether style and static checks are enforced mechanically.

Strong evidence:
- linter configs
- formatter configs
- `lint`, `fmt`, or `format` entrypoints
- pre-commit config or repo-local CI workflows

### `agent_repo_map`

Measure whether the repository contains a concise navigation aid for an agent.

Strong evidence:
- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- a short contributor guide linking commands, docs, and constraints

Scoring note:
- top-level agent docs are the strongest signal for repo-wide legibility
- nested agent docs count as positive subtree guidance and may justify scoring a nested scope
- a nested `AGENTS.md` should not automatically be treated as a full repo-wide map

### `structured_docs`

Measure whether the documentation is organized and navigable.

Strong evidence:
- `docs/` with an index
- cross-linked Markdown files
- distinct architecture, setup, and contributor docs

### `decision_records`

Measure whether important technical decisions are captured in version control.

Strong evidence:
- `docs/adr/`
- `docs/decisions/`
- structured ADR headings such as Context, Decision, Consequences, Status
- supersession links

## Output Expectations

For each metric, return:
- `score`
- `confidence`
- `evidence`
- `gaps`
- `next_step`

For the top-level result, return:
- `selected_metrics`
- `available_metrics`
- `evaluated_scope`
- `evaluated_root`
- `discovered_scopes`
- `scope_selection`
- `score`
- `max_score`
- `score_percentage`
- `quick_wins`

Keep the main score to the selected core metrics only. Report omitted operational metrics separately only if the user asks.
