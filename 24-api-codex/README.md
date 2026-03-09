# 24 API Codex

This folder packages the Agentic Legibility demo for open-source use inside `build-hours`.

- `agentic-legibility-scorecard/` contains the Next.js app that runs a hosted-shell audit and renders the scorecard UI.
- `skills/agentic-legibility/` contains the local skill source you can upload or register to obtain your own hosted `OPENAI_SKILL_ID`.
- `PLAN.md` captures the implementation plan and request shape behind the demo.

## Setup

1. Create a hosted skill from [`skills/agentic-legibility/`](./skills/agentic-legibility/).
2. In [`agentic-legibility-scorecard/`](./agentic-legibility-scorecard/), copy `.env.example` to `.env.local`.
3. Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and the hosted `OPENAI_SKILL_ID`.
4. Run `pnpm install`, `pnpm test`, and `pnpm build` from `agentic-legibility-scorecard/`.
