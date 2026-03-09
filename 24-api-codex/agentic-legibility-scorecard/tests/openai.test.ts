import { describe, expect, it } from "vitest";

import {
  buildAnalysisRequest,
  createOpenAIEventMapper,
  extractFinalResultFromResponse,
  HOSTED_SHELL_ALLOWED_DOMAINS,
} from "@/lib/analysis/openai";

const repo = {
  repoUrl: "https://github.com/octocat/Hello-World",
  normalizedRepo: "octocat/Hello-World",
  cloneUrl: "https://github.com/octocat/Hello-World.git",
  owner: "octocat",
  repo: "Hello-World",
};

const finalResult = {
  repoUrl: repo.repoUrl,
  normalizedRepo: repo.normalizedRepo,
  evaluatedScope: "server",
  discoveredScopes: [
    {
      path: "server",
      score: 7,
      signals: ["agent_doc:AGENTS.md", "manifest:package.json", "task_surface:package.json"],
    },
  ],
  score: 12,
  maxScore: 21,
  scorePercentage: 57,
  summary: "The repo has partial agent-oriented affordances.",
  quickWins: ["Add AGENTS.md", "Add a setup task"],
  metrics: {
    bootstrap_self_sufficiency: {
      score: 1,
      confidence: "medium",
      evidence: ["package.json"],
      gaps: "Bootstrap is only partially declared.",
      nextStep: "Add a setup entrypoint.",
    },
    task_entrypoints: {
      score: 2,
      confidence: "high",
      evidence: ["package.json"],
      gaps: "Task surface is decent but incomplete.",
      nextStep: "Add dev and build commands.",
    },
    validation_harness: {
      score: 1,
      confidence: "medium",
      evidence: ["tests/"],
      gaps: "Validation coverage is narrow.",
      nextStep: "Add broader test coverage.",
    },
    lint_format_gates: {
      score: 2,
      confidence: "high",
      evidence: ["eslint.config.mjs"],
      gaps: "Formatting is not fully standardized.",
      nextStep: "Add a format command.",
    },
    agent_repo_map: {
      score: 0,
      confidence: "high",
      evidence: [],
      gaps: "No concise agent map exists.",
      nextStep: "Add AGENTS.md.",
    },
    structured_docs: {
      score: 2,
      confidence: "medium",
      evidence: ["docs/"],
      gaps: "Docs exist but need stronger indexing.",
      nextStep: "Add a docs index page.",
    },
    decision_records: {
      score: 1,
      confidence: "low",
      evidence: [],
      gaps: "Decision history is weakly recorded.",
      nextStep: "Add ADRs.",
    },
  },
} as const;

describe("extractFinalResultFromResponse", () => {
  it("parses the final structured JSON payload", () => {
    const response = {
      output_text: JSON.stringify(finalResult),
    };

    expect(extractFinalResultFromResponse(response as never)).toEqual(finalResult);
  });

  it("falls back to the final assistant message text when output_text is empty", () => {
    const response = {
      output_text: "",
      output: [
        {
          type: "message",
          id: "msg_1",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(finalResult),
              annotations: [],
            },
          ],
        },
      ],
    };

    expect(extractFinalResultFromResponse(response as never)).toEqual(finalResult);
  });
});

describe("createOpenAIEventMapper", () => {
  it("maps shell lifecycle output and final results", () => {
    const mapper = createOpenAIEventMapper(repo);

    const startedEvents = mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 0,
      sequence_number: 1,
      item: {
        id: "item_1",
        type: "shell_call",
        call_id: "call_1",
        status: "in_progress",
        action: {
          commands: ["git clone https://github.com/octocat/Hello-World.git"],
          max_output_length: 2000,
          timeout_ms: 60_000,
        },
        environment: null,
      },
    } as never);

    const outputEvents = mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 1,
      sequence_number: 2,
      item: {
        id: "item_2",
        type: "shell_call_output",
        call_id: "call_1",
        status: "completed",
        max_output_length: 2000,
        output: [
          {
            stdout: "Cloning into 'Hello-World'...\n",
            stderr: "",
            outcome: {
              type: "exit",
              exit_code: 0,
            },
          },
        ],
      },
    } as never);

    const finalEvents = mapper.mapEvent({
      type: "response.completed",
      sequence_number: 3,
      response: {
        output_text: JSON.stringify({
          ...finalResult,
          repoUrl: "https://github.com/other/repo",
          normalizedRepo: "other/repo",
        }),
      },
    } as never);

    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]).toMatchObject({
      type: "shell_call_started",
      callId: "call_1",
    });

    expect(outputEvents).toEqual([
      {
        type: "shell_output",
        callId: "call_1",
        stream: "stdout",
        text: "Cloning into 'Hello-World'...\n",
      },
      expect.objectContaining({
        type: "shell_call_completed",
        callId: "call_1",
        exitCode: 0,
      }),
    ]);

    expect(finalEvents).toEqual([
      {
        type: "final_result",
        result: finalResult,
      },
    ]);
    expect(mapper.hasFinalResult()).toBe(true);
  });

  it("waits for shell output exit metadata before closing a shell call", () => {
    const mapper = createOpenAIEventMapper(repo);

    const startedEvents = mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 0,
      sequence_number: 1,
      item: {
        id: "item_1",
        type: "shell_call",
        call_id: "call_2",
        status: "in_progress",
        action: {
          commands: ["python scripts/score_repo.py --json"],
          max_output_length: 2000,
          timeout_ms: 60_000,
        },
        environment: null,
      },
    } as never);

    const doneWithoutExit = mapper.mapEvent({
      type: "response.output_item.done",
      output_index: 0,
      sequence_number: 2,
      item: {
        id: "item_1",
        type: "shell_call",
        call_id: "call_2",
        status: "completed",
        action: {
          commands: ["python scripts/score_repo.py --json"],
          max_output_length: 2000,
          timeout_ms: 60_000,
        },
        environment: null,
      },
    } as never);

    const outputEvents = mapper.mapEvent({
      type: "response.output_item.done",
      output_index: 1,
      sequence_number: 3,
      item: {
        id: "item_2",
        type: "shell_call_output",
        call_id: "call_2",
        status: "completed",
        max_output_length: 2000,
        output: [
          {
            stdout: "{\"score\":12}\n",
            stderr: "",
            outcome: {
              type: "exit",
              exit_code: 0,
            },
          },
        ],
      },
    } as never);

    expect(startedEvents).toHaveLength(1);
    expect(doneWithoutExit).toEqual([]);
    expect(outputEvents).toEqual([
      {
        type: "shell_output",
        callId: "call_2",
        stream: "stdout",
        text: "{\"score\":12}\n",
      },
      expect.objectContaining({
        type: "shell_call_completed",
        callId: "call_2",
        exitCode: 0,
      }),
    ]);
  });
});

describe("buildAnalysisRequest", () => {
  it("uses hosted shell with the pinned allowlist and latest hosted skill version", () => {
    const request = buildAnalysisRequest(
      repo,
      "codex-model",
      "skill_123",
      "Focus on client/",
    );

    expect(request.stream).toBe(true);
    expect(request.tools).toEqual([
      {
        type: "shell",
        environment: {
          type: "container_auto",
          network_policy: {
            type: "allowlist",
            allowed_domains: [...HOSTED_SHELL_ALLOWED_DOMAINS],
          },
          skills: [
            {
              type: "skill_reference",
              skill_id: "skill_123",
              version: "latest",
            },
          ],
        },
      },
    ]);
    expect(request.instructions).toContain("Additional user instructions for scope or emphasis: Focus on client/");
  });
});
