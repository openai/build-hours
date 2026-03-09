# 24 API Codex

This folder packages the Agentic Legibility demo for open-source use inside `build-hours`.

- `agentic-legibility-scorecard/` contains the Next.js app that runs a hosted-shell audit and renders the scorecard UI.
- `skills/agentic-legibility/` contains the local skill source you can upload or register to obtain your own hosted `OPENAI_SKILL_ID`.
- `PLAN.md` captures the implementation plan and request shape behind the demo.

## Setup

1. Create a hosted skill from [`skills/agentic-legibility/`](./skills/agentic-legibility/).
   See the public [Skills guide](https://developers.openai.com/api/docs/guides/tools-skills/), the [Shell guide: Attach skills](https://developers.openai.com/api/docs/guides/tools-shell/#attach-skills), and the [Skills in OpenAI API cookbook](https://developers.openai.com/cookbook/examples/skills_in_api/).
2. In [`agentic-legibility-scorecard/`](./agentic-legibility-scorecard/), copy `.env.example` to `.env.local`.
3. Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and the hosted `OPENAI_SKILL_ID`.
4. Make sure the API project or org behind your key allows hosted-shell egress to `github.com`, `api.github.com`, and `codeload.github.com`. The app sets those domains on each request, but the upstream allowlist must also permit them. See the [Shell guide](https://developers.openai.com/api/docs/guides/tools-shell/) and [Skills guide](https://developers.openai.com/api/docs/guides/tools-skills/).
5. Run `pnpm install`, `pnpm test`, and `pnpm build` from `agentic-legibility-scorecard/`.
6. Start the app with `pnpm dev` and open `http://localhost:3000`.

## API Docs

- [Skills guide](https://developers.openai.com/api/docs/guides/tools-skills/)
- [Shell guide](https://developers.openai.com/api/docs/guides/tools-shell/)
- [Shell guide: Attach skills](https://developers.openai.com/api/docs/guides/tools-shell/#attach-skills)
- [Skills in OpenAI API cookbook](https://developers.openai.com/cookbook/examples/skills_in_api/)
- [OpenAI API changelog](https://developers.openai.com/api/docs/changelog/)
