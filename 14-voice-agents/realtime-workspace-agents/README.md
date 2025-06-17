# Realtime API Agents Build Hours Demo

This is a demonstration of more advanced patterns for voice agents, using the OpenAI Realtime API and the OpenAI Agents SDK. 

## About the OpenAI Agents SDK

This project uses the [OpenAI Agents SDK](https://github.com/openai/openai-agents), a toolkit for building, managing, and deploying advanced AI agents. The SDK provides:

- A unified interface for defining agent behaviors and tool integrations.
- Built-in support for agent orchestration, state management, and event handling.
- Easy integration with the OpenAI Realtime API for low-latency, streaming interactions.
- Extensible patterns for multi-agent collaboration, handoffs, and tool use.

For full documentation, guides, and API references, see the official [OpenAI Agents SDK Documentation](https://github.com/openai/openai-agents#readme).

**NOTE:** This Build Hours Demo is a fork of the [openai-realtime-agents project](https://github.com/openai/openai-realtime-agents/).



## Setup

- This is a Next.js typescript app. Install dependencies with `npm i`.
- Add your `OPENAI_API_KEY` to your env. Either add it to your `.bash_profile` or equivalent, or copy `.env.sample` to `.env` and add it there.
- Start the server with `npm run dev`
- Open your browser to [http://localhost:3000](http://localhost:3000). It should default to the `workspaceBuilder` Agent Config.
- You can change examples via the "Scenario" dropdown in the top right.

# Agentic Pattern: Responder-Thinker
<img width="1011" alt="Screenshot 2025-06-17 at 11 38 42 AM" src="https://github.com/user-attachments/assets/192bbd72-80af-4a76-9db1-aca4bbc8b2a4" />
