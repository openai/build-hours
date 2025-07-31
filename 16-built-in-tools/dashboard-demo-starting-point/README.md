# Responses & Built-in tools demo

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![NextJS](https://img.shields.io/badge/Built_with-NextJS-blue)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)

This repository contains a NextJS app built on top of the [Responses API](https://platform.openai.com/docs/api-reference/responses).

It leverages the following built-in tools:

- [web search](https://platform.openai.com/docs/guides/tools-web-search?api-mode=responses)
- [function calling](https://platform.openai.com/docs/guides/function-calling)
- [code interpreter](https://platform.openai.com/docs/guides/tools-code-interpreter)
- [remote mcp](https://platform.openai.com/docs/guides/tools-remote-mcp)

## How to use

1. **Set up the OpenAI API:**

   - If you're new to the OpenAI API, [sign up for an account](https://platform.openai.com/signup).
   - Follow the [Quickstart](https://platform.openai.com/docs/quickstart) to retrieve your API key.

2. **Set the OpenAI API key:**

   2 options:

   - Set the `OPENAI_API_KEY` environment variable [globally in your system](https://platform.openai.com/docs/libraries#create-and-export-an-api-key)
   - Set the `OPENAI_API_KEY` environment variable in the project: Create a `.env` file at the root of the project and add the following line (see `.env.example` for reference):

   ```bash
   OPENAI_API_KEY=<your_api_key>
   ```

3. **Clone the Repository:**

   ```bash
   git clone https://github.com/openai/openai-responses-starter-app.git
   ```

4. **Install dependencies:**

   Run in the project root:

   ```bash
   npm install
   ```

5. **Run the app:**

   ```bash
   npm run dev
   ```

   The app will be available at [`http://localhost:3000`](http://localhost:3000).

## Demo flow

See notion for details - but basically give main branch to codex to arrive to final state.

You need a `STRIPE_API_KEY` for this demo to work.
