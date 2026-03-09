# Agentic Legibility Scorecard

`agentic-legibility-scorecard/` is a lightweight Next.js app that analyzes one public GitHub repository with one streamed Responses API run using hosted shell and a hosted copy of the included `agentic-legibility` skill.

The UI is organized around the build plan:

- compact hero with repo URL input and optional custom instructions
- immediate optimistic progress before the first shell command arrives
- four summary cards for run state, overall score, quick wins, and discovered scopes
- grouped hosted-shell timeline on the left
- vertically stacked seven-metric scorecard on the right
- one final structured JSON payload that fills the scorecard atomically

## Environment

1. Upload or register the local skill from `../skills/agentic-legibility/` so you have a hosted skill ID.
2. Copy `.env.example` to `.env.local`.
3. Set:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_SKILL_ID`

`OPENAI_MODEL` should be a Codex-capable Responses model that supports hosted shell.

`OPENAI_SKILL_ID` must point to the hosted version of the included `agentic-legibility` skill. The app always references that skill as `version: "latest"`.

## Notes

- The backend validates public `https://github.com/<owner>/<repo>` URLs before contacting OpenAI.
- The hosted-shell request explicitly sets an allowlist for `github.com`, `api.github.com`, and `codeload.github.com`.
- The app expects the scorer to return `evaluatedScope`, `discoveredScopes`, `quickWins`, and the seven-metric JSON result in one final object.
- The local skill source in `../skills/agentic-legibility/` is included so you can create your own hosted skill without depending on an internal artifact.
- Use custom instructions to steer scope selection, for example `Focus on client/` or `Ignore generated docs`.

## Commands

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```
