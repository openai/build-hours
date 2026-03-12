import { describe, expect, it } from "vitest";

import {
  analysisViewReducer,
  createInitialAnalysisViewState,
} from "@/lib/analysis/state";

describe("analysisViewReducer", () => {
  it("moves into running state on status events so the UI can show optimistic progress", () => {
    const state = analysisViewReducer(createInitialAnalysisViewState(), {
      type: "status",
      message: "Opening analysis stream...",
    });

    expect(state.runStatus).toBe("running");
    expect(state.statusMessages).toEqual(["Opening analysis stream..."]);
  });

  it("groups shell output and applies the final result", () => {
    let state = createInitialAnalysisViewState();

    state = analysisViewReducer(state, {
      type: "run_started",
      repoUrl: "https://github.com/octocat/Hello-World",
      normalizedRepo: "octocat/Hello-World",
    });
    state = analysisViewReducer(state, {
      type: "shell_call_started",
      callId: "call_1",
      command: "git clone https://github.com/octocat/Hello-World.git",
      startedAt: "2026-03-07T19:00:00.000Z",
    });
    state = analysisViewReducer(state, {
      type: "shell_output",
      callId: "call_1",
      stream: "stdout",
      text: "cloning...\n",
    });
    state = analysisViewReducer(state, {
      type: "shell_call_completed",
      callId: "call_1",
      exitCode: 0,
      durationMs: 1200,
    });
    state = analysisViewReducer(state, {
      type: "final_result",
      result: {
        repoUrl: "https://github.com/octocat/Hello-World",
        normalizedRepo: "octocat/Hello-World",
        evaluatedScope: "server",
        discoveredScopes: [
          {
            path: "server",
            score: 6,
            signals: ["agent_doc:AGENTS.md", "manifest:package.json"],
          },
        ],
        score: 10,
        maxScore: 21,
        scorePercentage: 48,
        summary: "Some repo signals are present, but the task surface is uneven.",
        quickWins: ["Add AGENTS.md", "Expose lint and test commands"],
        metrics: {
          bootstrap_self_sufficiency: {
            score: 1,
            confidence: "medium",
            evidence: [],
            gaps: "Weak bootstrap story.",
            nextStep: "Add a setup task.",
          },
          task_entrypoints: {
            score: 2,
            confidence: "high",
            evidence: ["package.json"],
            gaps: "Build and lint exist, but setup is unclear.",
            nextStep: "Add setup and dev entrypoints.",
          },
          validation_harness: {
            score: 1,
            confidence: "medium",
            evidence: ["tests/"],
            gaps: "Narrow validation coverage.",
            nextStep: "Add integration coverage.",
          },
          lint_format_gates: {
            score: 1,
            confidence: "medium",
            evidence: ["eslint.config.mjs"],
            gaps: "Formatting path is unclear.",
            nextStep: "Expose format scripts.",
          },
          agent_repo_map: {
            score: 0,
            confidence: "high",
            evidence: [],
            gaps: "No agent guide found.",
            nextStep: "Add AGENTS.md.",
          },
          structured_docs: {
            score: 2,
            confidence: "medium",
            evidence: ["docs/"],
            gaps: "Docs exist but are not fully indexed.",
            nextStep: "Add a docs index.",
          },
          decision_records: {
            score: 1,
            confidence: "low",
            evidence: [],
            gaps: "Few decision artifacts.",
            nextStep: "Add ADRs.",
          },
        },
      },
    });

    expect(state.runStatus).toBe("completed");
    expect(state.shellOrder).toEqual(["call_1"]);
    expect(state.shellCalls.call_1.stdout).toContain("cloning...");
    expect(state.shellCalls.call_1.exitCode).toBe(0);
    expect(state.result?.metrics.agent_repo_map.score).toBe(0);
    expect(state.result?.evaluatedScope).toBe("server");
    expect(state.result?.quickWins).toHaveLength(2);
  });
});
