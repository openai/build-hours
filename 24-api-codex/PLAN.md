# Agentic Legibility Scorecard Build Plan

## Goal

Create a new `agentic-legibility-scorecard/` folder and build it as a single Next.js full-stack TypeScript app that:

1. accepts a public GitHub repository URL
2. starts one live Responses API run with hosted shell
3. mounts a hosted copy of the included `agentic-legibility` skill into that shell
4. streams shell progress back to the browser as simplified NDJSON events
5. renders a left-hand hosted-shell timeline and a right-hand scorecard
6. fills the scorecard from one final structured JSON result

The app should remain intentionally lightweight:

- no auth
- no database
- no background jobs
- no persistence
- no multi-run fanout
- no dynamic skill upload

## Final Scope

The working version uses a seven-metric scorecard:

- `bootstrap_self_sufficiency`
- `task_entrypoints`
- `validation_harness`
- `lint_format_gates`
- `agent_repo_map`
- `structured_docs`
- `decision_records`

## Stack

- Next.js App Router
- TypeScript
- React client page
- Route handlers
- `fetch()` streaming from browser to backend
- Responses API with `stream: true`
- Hosted shell only
- hosted skill referenced by `OPENAI_SKILL_ID`

## Core User Flow

1. User pastes a GitHub repo URL into the form.
2. User may optionally add custom instructions such as:
   - `Focus on client/`
   - `Treat server/ and worker/ separately`
   - `Ignore generated docs`
3. Frontend sends `POST /api/analyze` with:
   - `repoUrl`
   - optional `customInstructions`
4. Backend validates and normalizes the GitHub URL before contacting OpenAI.
5. Backend starts one streamed Responses API request using hosted shell and the hosted skill.
6. Backend maps OpenAI stream events into app-level NDJSON events.
7. Frontend renders:
   - left: grouped hosted-shell timeline
   - top summary row: run state, overall score, quick wins, discovered scopes
   - right: seven static metric cards, dimmed until populated
   - immediate optimistic progress UI before the first upstream shell event arrives
8. On final structured result:
   - all metric cards fill at once
   - overall score gets a numeric score, percentage, and letter grade
   - quick wins and discovered scopes populate

## API and Environment Requirements

Required environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_SKILL_ID`

`OPENAI_SKILL_ID` must point to a hosted version of the included `agentic-legibility` skill.

Copy `agentic-legibility-scorecard/.env.example` to `.env.local` and set these values locally. Create your own hosted skill from `skills/agentic-legibility/` before setting `OPENAI_SKILL_ID`.

The app references the hosted skill with:

- `type: "skill_reference"`
- `skill_id: OPENAI_SKILL_ID`
- `version: "latest"`

Using `latest` is intentional so new skill versions can be rolled out without changing app code.

## Hosted Shell Request Rules

The Responses request should:

- use a codex-capable model from `OPENAI_MODEL`
- use hosted shell as the only tool
- mount the hosted skill into `environment.skills`
- use `environment.type = "container_auto"`
- keep the run repo-visible only
- avoid installing dependencies
- avoid bootstrapping the target repo
- clone the repo and run the scorer once in JSON mode
- return exactly one final structured JSON object

## Hosted Shell Networking Rules

This implementation requires request-level `network_policy`.

Do not assume the org/project allowlist is automatically inherited when omitted.

The request should explicitly ask for this allowlist:

- `github.com`
- `api.github.com`
- `codeload.github.com`

Notes:

- If the API returns `allowed_domains must be a subset of the organization allowlist`, verify the app is using an API key for the same project whose allowlist you configured.
- If the shell fails with `Could not resolve host: github.com`, the request likely has no effective egress policy.

## Structured Output Rules

The final result must be validated with structured outputs.

Do not use schema formats that the Responses validator rejects in this context.

Specifically:

- do not use `z.string().url()` for `repoUrl`
- use a regex-constrained GitHub URL string instead

The final result schema should include:

- `repoUrl`
- `normalizedRepo`
- `evaluatedScope`
- `discoveredScopes`
- `score`
- `maxScore`
- `scorePercentage`
- `summary`
- `quickWins`
- `metrics`

Each metric should include:

- `score`
- `confidence`
- `evidence`
- `gaps`
- `nextStep`

## Skill Behavior Required By The App

The app depends on the hosted skill to support:

- default JSON output
- subset metric selection
- nested scope discovery
- explicit `--scope`
- `--list-scopes`
- `evaluated_scope`
- `discovered_scopes`
- `scope_selection`

The app should treat the scorer output as authoritative.

## Scope Discovery Behavior

The scorer must not assume only the repo root matters.

It should detect nested scopes such as:

- `client/`
- `server/`
- language-specific subtrees
- other self-contained folders with their own manifests, task surfaces, or agent docs

The scope heuristics should look for:

- nested `AGENTS.md` / `CLAUDE.md`
- nested manifests like `package.json`, `pyproject.toml`, `Cargo.toml`, `mix.exs`, etc.
- nested task surfaces like `Makefile`, `justfile`, `Taskfile`, package scripts
- root README routing cues like:
  - `client/`
  - `` `client` ``
  - `cd client`

Selection rules:

- if user gives a clear custom instruction, the model may run `score_repo.py --scope <relative-path>`
- if exactly one strong nested scope is discovered and root lacks a top-level agent doc, auto-select that scope
- if multiple strong nested scopes exist, stay at root unless explicitly instructed otherwise

Nested `AGENTS.md` files should count as subtree guidance, not automatically as repo-wide guidance.

## Metric Heuristic Corrections

The following heuristic behaviors are required because they were real sources of bad results:

### `agent_repo_map`

Do not only check top-level `AGENTS.md`.

The scorer must:

- give strongest credit to top-level agent docs
- give partial credit to nested agent docs
- expose nested agent docs in evidence
- distinguish between repo-wide guidance and subtree-only guidance

### `structured_docs`

Do not recommend creating `docs/` if `docs/` already exists.

The scorer must distinguish:

- indexed, cross-linked docs tree
- shallow docs tree lacking index/cross-links
- sparse docs tree
- scattered docs without `docs/`

When `docs/` exists but is weakly structured, recommend:

- adding `docs/README.md` or `docs/index.md`
- improving cross-links

Do not recommend “group docs under `docs/`” in that case.

## Frontend Layout Requirements

### Top hero

Keep the hero compact.

It should contain:

- current repo badge or fallback text
- title text: `Agentic Legibility Scorecard`
- no extra product label above the title
- helpful subtitle that explains the user can paste a public GitHub repo, watch hosted-shell progress, see the evaluated scope, and receive a seven-metric scorecard
- input form

Do not let the hero dominate the page vertically.

The hero should leave enough room for the summary row to remain visible above the fold on a typical laptop viewport.

### Summary row

Below the hero, show four cards:

1. `Run state`
2. `Overall score`
3. `Quick wins`
4. `Discovered scopes`

`Run state` should show:

- `idle`, `running`, `completed`, `failed`, or `cancelled`
- a current phase label
- a visible loading indicator while the run is live
- summary/error text
- repo and evaluated scope metadata when available

`Overall score` should show:

- numeric score
- max score
- percentage
- letter grade once available

Letter grade mapping:

- `80-100` => `A`
- `60-79` => `B`
- `40-59` => `C`
- `20-39` => `D`
- `0-19` => `F`

`Quick wins` should render the returned `quickWins`.

`Discovered scopes` should render the returned `discoveredScopes` and indicate which one was evaluated.

### Main workspace

Left panel:

- grouped shell timeline
- one card per shell command
- show command text, running/completed state, exit code, duration, stdout, stderr
- do not render one flat raw log blob

Right panel:

- render the seven metric cards only
- remove quick wins and discovered scopes from this panel
- keep cards dimmed until populated
- stack the metric cards vertically in a single column
- ensure cards stay inside the right-hand container at all breakpoints

Metric card score rendering:

- `0` => red
- `1` => orange
- `2` => yellow
- `3` => green
- pending => muted

This color coding should apply to the displayed score number itself, not just the card border.

CSS guardrails for the right panel:

- the panel container must set `min-width: 0`
- metric cards must set `min-width: 0`
- long evidence/gap/next-step text must wrap aggressively
- do not rely on breakpoint-only fixes for overflow

## Streaming Transport

Browser to backend:

- `POST /api/analyze`
- streamed NDJSON response

Do not use `EventSource`, because the initial request body includes the repo URL and optional instructions.

The UI must show progress immediately after submit.

That means:

- the client should optimistically enter a running state before the first backend chunk arrives
- the client should render early status messages such as:
  - `Opening analysis stream...`
  - `Connected. Waiting for hosted shell events...`
- do not wait for the first shell command before showing visible loading state
- do not defer streamed updates behind React transitions if that makes the UI feel buffered

App-level event union:

- `run_started`
- `status`
- `shell_call_started`
- `shell_output`
- `shell_call_completed`
- `final_result`
- `run_failed`

The reducer should:

- preserve shell output grouped by `callId`
- trim oversized stdout/stderr buffers
- update run status correctly
- apply `final_result` atomically
- treat early `status` events as sufficient to move the UI into `running`

## Streaming UX Requirements

The app must never appear frozen while the hosted shell request is being created or queued.

Show all of the following while a run is active:

- a pulsing live indicator
- a current phase label in the run-state summary card
- the same current phase label near the hosted-shell timeline header
- optimistic pre-shell status messages

The phase label may be derived client-side from the latest status text and running shell command.

Recommended phase labels:

- `opening stream`
- `preparing request`
- `requesting shell`
- `queueing`
- `waiting for shell`
- `cloning repository`
- `discovering scopes`
- `scoring repository`
- `running hosted shell`
- `finalizing result`
- terminal states:
  - `completed`
  - `failed`
  - `cancelled`

## OpenAI Event Mapping

The backend must translate streamed Responses events into app events.

Important cases:

- `response.created` => status
- `response.queued` => status
- `response.in_progress` => status
- `response.output_item.added` / `response.output_item.done` => shell lifecycle and output
- `response.completed` => parse final result
- `response.failed` => `run_failed`
- `response.incomplete` => `run_failed`
- `error` => `run_failed`

Final result extraction must not assume `response.output_text` is always populated.

It must:

1. try `response.output_text`
2. fall back to the final assistant `output_text` content in `response.output`

Implementation notes:

- return the NDJSON response immediately and continue writing events asynchronously
- prefer `TransformStream` plus a background async writer for the route response
- emit initial `run_started` and `status` events before awaiting the upstream Responses stream

## Backend Validation Rules

Only accept canonical public GitHub repository URLs:

- `https://github.com/<owner>/<repo>`

Reject:

- non-GitHub hosts
- issue URLs
- pull request URLs
- nested GitHub pages
- malformed paths

Normalize into:

- `repoUrl`
- `normalizedRepo` as `owner/repo`
- `cloneUrl`
- `owner`
- `repo`

## Logging Requirements

Keep temporary but useful backend logs for iteration:

- normalized repo
- model
- skill id
- request-level allowed domains

Do not log secrets.

These logs are especially useful for diagnosing:

- wrong project/API key
- stale env config
- wrong skill id
- allowlist mismatches

## Skill Management Rules

When the skill changes:

1. validate the local skill first
2. upload a new hosted version under the existing skill id
3. keep `version: "latest"` in the app

When creating a new hosted version via API:

- upload a bundle under a single top-level directory
- the endpoint expects `files`, not an arbitrary `bundle` field

If the upload fails with:

- `Missing required parameter: 'files'`
  - fix the multipart field name
- `All files must be under a single top-level directory`
  - rebuild the zip so it contains one enclosing directory

## Validation Checklist

Before considering the build complete, run:

- `python3 -m py_compile` for the scorer
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Also manually verify one known nested-scope repo to ensure:

- nested scope discovery works
- nested `AGENTS.md` is recognized
- `structured_docs` does not recommend creating `docs/` when it already exists
- the page shows progress immediately after submit, before the first shell command arrives
- the current phase label changes as the run advances
- vertically stacked metric cards stay inside the right-hand panel without horizontal overflow

## Known Good Behavioral Expectations

A correct build should satisfy these expectations:

- the app can analyze a public GitHub repo end-to-end with one Responses run
- the hosted shell can clone from GitHub
- the final result parses without JSON extraction errors
- the UI shows an evaluated scope when the scorer selects a nested subtree
- the UI exposes custom instructions for steering scope
- the scorecard is seven metrics, not eight
- the metrics panel uses color-coded score numbers
- the metrics panel stacks vertically without overflow
- the summary row shows quick wins and discovered scopes
- the UI shows visible live progress and a current phase label before shell output arrives

## Non-Goals For V1

Do not add these yet:

- fanout by metric family
- persistence
- auth
- job resume
- background runs
- repo history
- multi-run comparison
- richer semantic summarization of shell logs
- dynamic skill upload from the UI

Those belong in a later version once the single-run path is stable.
