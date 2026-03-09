import { describe, expect, it } from "vitest";

import {
  buildAnalysisRequest,
  createOpenAIEventMapper,
  extractAnalysisSummaryFromResponse,
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

const scorerReport = {
  evaluated_scope: finalResult.evaluatedScope,
  discovered_scopes: finalResult.discoveredScopes,
  score: finalResult.score,
  max_score: finalResult.maxScore,
  score_percentage: finalResult.scorePercentage,
  quick_wins: finalResult.quickWins,
  metrics: {
    bootstrap_self_sufficiency: {
      ...finalResult.metrics.bootstrap_self_sufficiency,
      next_step: finalResult.metrics.bootstrap_self_sufficiency.nextStep,
    },
    task_entrypoints: {
      ...finalResult.metrics.task_entrypoints,
      next_step: finalResult.metrics.task_entrypoints.nextStep,
    },
    validation_harness: {
      ...finalResult.metrics.validation_harness,
      next_step: finalResult.metrics.validation_harness.nextStep,
    },
    lint_format_gates: {
      ...finalResult.metrics.lint_format_gates,
      next_step: finalResult.metrics.lint_format_gates.nextStep,
    },
    agent_repo_map: {
      ...finalResult.metrics.agent_repo_map,
      next_step: finalResult.metrics.agent_repo_map.nextStep,
    },
    structured_docs: {
      ...finalResult.metrics.structured_docs,
      next_step: finalResult.metrics.structured_docs.nextStep,
    },
    decision_records: {
      ...finalResult.metrics.decision_records,
      next_step: finalResult.metrics.decision_records.nextStep,
    },
  },
} as const;

describe("extractAnalysisSummaryFromResponse", () => {
  it("parses the final structured summary payload", () => {
    const response = {
      output_text: JSON.stringify({ summary: finalResult.summary }),
    };

    expect(extractAnalysisSummaryFromResponse(response as never)).toEqual({
      summary: finalResult.summary,
    });
  });

  it("accepts legacy full scorecard payloads and keeps only the summary", () => {
    const response = {
      output_text: JSON.stringify(finalResult),
    };

    expect(extractAnalysisSummaryFromResponse(response as never)).toEqual({
      summary: finalResult.summary,
    });
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
              text: JSON.stringify({ summary: finalResult.summary }),
              annotations: [],
            },
          ],
        },
      ],
    };

    expect(extractAnalysisSummaryFromResponse(response as never)).toEqual({
      summary: finalResult.summary,
    });
  });
});

describe("createOpenAIEventMapper", () => {
  it("maps shell lifecycle output and builds the final result from scorer stdout", () => {
    const mapper = createOpenAIEventMapper(repo);

    mapper.mapEvent({
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

    mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 2,
      sequence_number: 3,
      item: {
        id: "item_3",
        type: "shell_call",
        call_id: "call_2",
        status: "in_progress",
        action: {
          commands: ["python scripts/score_repo.py /workspace/Hello-World --format json"],
          max_output_length: 2000,
          timeout_ms: 60_000,
        },
        environment: null,
      },
    } as never);

    mapper.mapEvent({
      type: "response.output_item.done",
      output_index: 3,
      sequence_number: 4,
      item: {
        id: "item_4",
        type: "shell_call_output",
        call_id: "call_2",
        status: "completed",
        max_output_length: 2000,
        output: [
          {
            stdout: JSON.stringify(scorerReport),
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
      sequence_number: 5,
      response: {
        output_text: JSON.stringify({
          summary: finalResult.summary,
          score: 0,
          evaluatedScope: "wrong-scope",
        }),
      },
    } as never);

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

  it("marks timed out shell calls as completed without an exit code", () => {
    const mapper = createOpenAIEventMapper(repo);

    mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 0,
      sequence_number: 1,
      item: {
        id: "item_timeout_1",
        type: "shell_call",
        call_id: "call_timeout",
        status: "in_progress",
        action: {
          commands: ["python scripts/score_repo.py /workspace/Hello-World --format json"],
          max_output_length: 2000,
          timeout_ms: 60_000,
        },
        environment: null,
      },
    } as never);

    const timeoutEvents = mapper.mapEvent({
      type: "response.output_item.done",
      output_index: 1,
      sequence_number: 2,
      item: {
        id: "item_timeout_2",
        type: "shell_call_output",
        call_id: "call_timeout",
        status: "completed",
        max_output_length: 2000,
        output: [
          {
            stdout: "",
            stderr: "timed out",
            outcome: {
              type: "timeout",
            },
          },
        ],
      },
    } as never);

    expect(timeoutEvents).toEqual([
      {
        type: "shell_output",
        callId: "call_timeout",
        stream: "stderr",
        text: "timed out",
      },
      expect.objectContaining({
        type: "shell_call_completed",
        callId: "call_timeout",
      }),
    ]);
  });

  it("preserves repeated shell output when it arrives in distinct output items", () => {
    const mapper = createOpenAIEventMapper(repo);

    mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 0,
      sequence_number: 1,
      item: {
        id: "item_repeat_call",
        type: "shell_call",
        call_id: "call_repeat",
        status: "in_progress",
        action: {
          commands: ["echo repeated output"],
          max_output_length: 2000,
          timeout_ms: 60_000,
        },
        environment: null,
      },
    } as never);

    const firstEvents = mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 1,
      sequence_number: 2,
      item: {
        id: "item_repeat_1",
        type: "shell_call_output",
        call_id: "call_repeat",
        status: "completed",
        max_output_length: 2000,
        output: [
          {
            stdout: "repeat\n",
            stderr: "",
            outcome: {
              type: "exit",
              exit_code: 0,
            },
          },
        ],
      },
    } as never);

    const duplicateDoneEvents = mapper.mapEvent({
      type: "response.output_item.done",
      output_index: 1,
      sequence_number: 3,
      item: {
        id: "item_repeat_1",
        type: "shell_call_output",
        call_id: "call_repeat",
        status: "completed",
        max_output_length: 2000,
        output: [
          {
            stdout: "repeat\n",
            stderr: "",
            outcome: {
              type: "exit",
              exit_code: 0,
            },
          },
        ],
      },
    } as never);

    const secondEvents = mapper.mapEvent({
      type: "response.output_item.added",
      output_index: 2,
      sequence_number: 4,
      item: {
        id: "item_repeat_2",
        type: "shell_call_output",
        call_id: "call_repeat",
        status: "completed",
        max_output_length: 2000,
        output: [
          {
            stdout: "repeat\n",
            stderr: "",
            outcome: {
              type: "exit",
              exit_code: 0,
            },
          },
        ],
      },
    } as never);

    expect(firstEvents[0]).toEqual({
      type: "shell_output",
      callId: "call_repeat",
      stream: "stdout",
      text: "repeat\n",
    });
    expect(duplicateDoneEvents).toEqual([]);
    expect(secondEvents[0]).toEqual({
      type: "shell_output",
      callId: "call_repeat",
      stream: "stdout",
      text: "repeat\n",
    });
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
