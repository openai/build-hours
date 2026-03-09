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
   Public docs for that flow:
   - [Skills guide](https://developers.openai.com/api/docs/guides/tools-skills/)
   - [Shell guide: Attach skills](https://developers.openai.com/api/docs/guides/tools-shell/#attach-skills)
   - [Skills in OpenAI API cookbook](https://developers.openai.com/cookbook/examples/skills_in_api/)
2. Make sure the API project or org used by your key allows hosted-shell egress to:

- `github.com`
- `api.github.com`
- `codeload.github.com`

   The request config in this app sets that same allowlist, but the upstream hosted-shell allowlist must also permit those domains. See the [Shell guide](https://developers.openai.com/api/docs/guides/tools-shell/) and [Skills guide](https://developers.openai.com/api/docs/guides/tools-skills/).
3. Copy `.env.example` to `.env.local`.
4. Set:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_SKILL_ID`

`OPENAI_MODEL` should be a Codex-capable Responses model that supports hosted shell.

`OPENAI_SKILL_ID` must point to the hosted version of the included `agentic-legibility` skill. The app always references that skill as `version: "latest"`.

## Notes

- The backend validates public `https://github.com/<owner>/<repo>` URLs before contacting OpenAI.
- The hosted-shell request explicitly sets an allowlist for `github.com`, `api.github.com`, and `codeload.github.com`.
- The backend derives metrics, scopes, and quick wins directly from `score_repo.py` JSON output and uses the model only for the final summary.
- The local skill source in `../skills/agentic-legibility/` is included so you can create your own hosted skill without depending on an internal artifact.
- Use custom instructions to steer scope selection, for example `Focus on client/` or `Ignore generated docs`.

## Commands

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Then open `http://localhost:3000`.

## API Docs

- [Skills guide](https://developers.openai.com/api/docs/guides/tools-skills/)
- [Shell guide](https://developers.openai.com/api/docs/guides/tools-shell/)
- [Shell guide: Attach skills](https://developers.openai.com/api/docs/guides/tools-shell/#attach-skills)
- [Skills in OpenAI API cookbook](https://developers.openai.com/cookbook/examples/skills_in_api/)
- [OpenAI API changelog](https://developers.openai.com/api/docs/changelog/)
