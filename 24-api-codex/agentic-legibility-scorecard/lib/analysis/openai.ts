import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type {
  Response,
  ResponseCreateParamsStreaming,
  ResponseFunctionShellToolCall,
  ResponseFunctionShellToolCallOutput,
  ResponseOutputItemAddedEvent,
  ResponseOutputItemDoneEvent,
  ResponseQueuedEvent,
  ResponseInProgressEvent,
  ResponseCreatedEvent,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";

import type { NormalizedGitHubRepo } from "@/lib/analysis/github";
import {
  AnalysisSummarySchema,
  AnalysisResultSchema,
  type AnalysisSummary,
  type AnalysisResult,
  type AnalysisStreamEvent,
} from "@/lib/analysis/types";

export const HOSTED_SHELL_ALLOWED_DOMAINS = [
  "github.com",
  "api.github.com",
  "codeload.github.com",
] as const;

export type OpenAIAnalysisConfig = {
  apiKey: string;
  model: string;
  skillId: string;
};

export type OpenAIEventMapper = {
  mapEvent: (event: ResponseStreamEvent) => AnalysisStreamEvent[];
  hasFinalResult: () => boolean;
};

const ScorerMetricSchema = z.object({
  score: z.number().int().min(0).max(3),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(z.string()),
  gaps: z.string(),
  next_step: z.string(),
});

const ScorerReportSchema = z.object({
  evaluated_scope: z.string().min(1),
  discovered_scopes: z.array(
    z.object({
      path: z.string().min(1),
      score: z.number().int().nonnegative(),
      signals: z.array(z.string()),
    }),
  ),
  score: z.number().int().min(0),
  max_score: z.number().int().positive(),
  score_percentage: z.number().int().min(0).max(100),
  quick_wins: z.array(z.string()),
  metrics: z.object({
    bootstrap_self_sufficiency: ScorerMetricSchema,
    task_entrypoints: ScorerMetricSchema,
    validation_harness: ScorerMetricSchema,
    lint_format_gates: ScorerMetricSchema,
    agent_repo_map: ScorerMetricSchema,
    structured_docs: ScorerMetricSchema,
    decision_records: ScorerMetricSchema,
  }),
});

type ScorerReport = z.infer<typeof ScorerReportSchema>;

export function getOpenAIConfig(): OpenAIAnalysisConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  const skillId = process.env.OPENAI_SKILL_ID?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  if (!model) {
    throw new Error("Missing OPENAI_MODEL.");
  }

  if (!skillId) {
    throw new Error("Missing OPENAI_SKILL_ID.");
  }

  return { apiKey, model, skillId };
}

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export function buildAnalysisRequest(
  repo: NormalizedGitHubRepo,
  model: string,
  skillId: string,
  customInstructions?: string,
): ResponseCreateParamsStreaming {
  const trimmedCustomInstructions = customInstructions?.trim();

  return {
    model,
    stream: true,
    store: false,
    tool_choice: "auto",
    text: {
      format: zodTextFormat(AnalysisSummarySchema, "analysis_summary"),
    },
    tools: [
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
              skill_id: skillId,
              version: "latest",
            },
          ],
        },
      },
    ],
    instructions: [
      "You are auditing a public GitHub repository for agentic legibility.",
      "Use the hosted shell as the only tool and rely on the attached agentic-legibility skill.",
      `Clone exactly this repository: ${repo.cloneUrl}`,
      "Stay repo-visible only. Do not install dependencies, do not run package managers, and do not bootstrap the target repository.",
      "Read the attached skill instructions, locate scripts/score_repo.py from that skill, and treat the scorer output as authoritative.",
      "If you need scope discovery, run score_repo.py --list-scopes first.",
      "Run score_repo.py exactly once in JSON mode for the cloned repository using the seven default metrics.",
      "The scorer may auto-discover a nested scope to evaluate if the repo clearly routes work into one self-contained subsystem.",
      "If you intentionally choose a specific subdirectory because the user asked for it or the repo structure makes that the only coherent scope, use score_repo.py with --scope <relative-path>.",
      "Then produce exactly one final JSON object with only one field: summary.",
      "Write a short summary that highlights the strongest signals and the most important legibility gaps.",
      "Do not restate scores, scopes, quick wins, or metric details because the backend derives those directly from score_repo.py output.",
      "Do not include markdown fences, prose before the JSON, or extra fields.",
      trimmedCustomInstructions
        ? `Additional user instructions for scope or emphasis: ${trimmedCustomInstructions}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Analyze the public repository ${repo.repoUrl}.`,
              "Clone it in hosted shell, use the attached skill, and return one final JSON scorecard.",
            ].join(" "),
          },
        ],
      },
    ],
  };
}

export function createOpenAIEventMapper(
  repo: NormalizedGitHubRepo,
): OpenAIEventMapper {
  const startedAtByCall = new Map<string, number>();
  const commandsByCall = new Map<string, string>();
  const outputByCall = new Map<string, { stdout: string; stderr: string }>();
  const completedCallIds = new Set<string>();
  const seenOutputFingerprints = new Set<string>();
  let sawFinalResult = false;

  return {
    mapEvent(event) {
      switch (event.type) {
        case "response.created":
          return [statusMessage(event, "Hosted shell request created.")];
        case "response.queued":
          return [statusMessage(event, "Waiting for hosted shell capacity.")];
        case "response.in_progress":
          return [statusMessage(event, "Running the repo audit.")];
        case "response.output_item.added":
          return mapOutputItem(
            event,
            startedAtByCall,
            commandsByCall,
            outputByCall,
            completedCallIds,
            seenOutputFingerprints,
          );
        case "response.output_item.done":
          return mapOutputItem(
            event,
            startedAtByCall,
            commandsByCall,
            outputByCall,
            completedCallIds,
            seenOutputFingerprints,
          );
        case "response.completed": {
          const summary = extractAnalysisSummaryFromResponse(event.response);
          const scorerReport = extractAuthoritativeScorerReport(commandsByCall, outputByCall);
          const result = overwriteRepoIdentity(buildAnalysisResult(summary, scorerReport), repo);
          sawFinalResult = true;
          return [{ type: "final_result", result }];
        }
        case "response.failed":
          return [
            {
              type: "run_failed",
              message: "The hosted-shell analysis failed.",
              detail:
                event.response.error?.message ??
                "The Responses API returned a failed status.",
            },
          ];
        case "response.incomplete":
          return [
            {
              type: "run_failed",
              message: "The hosted-shell analysis ended before a final scorecard was produced.",
              detail:
                event.response.incomplete_details?.reason ??
                "The Responses API returned an incomplete status.",
            },
          ];
        case "error":
          return [
            {
              type: "run_failed",
              message: event.message,
              detail: event.code ?? undefined,
            },
          ];
        default:
          return [];
      }
    },
    hasFinalResult() {
      return sawFinalResult;
    },
  };
}

export function extractAnalysisSummaryFromResponse(response: Response): AnalysisSummary {
  const rawText = extractResponseText(response);
  const parsed = JSON.parse(rawText);
  return AnalysisSummarySchema.parse(parsed);
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error &&
      (error.name === "AbortError" ||
        error.message.toLowerCase().includes("aborted"))) ||
    false
  );
}

function overwriteRepoIdentity(
  result: AnalysisResult,
  repo: NormalizedGitHubRepo,
): AnalysisResult {
  return {
    ...result,
    repoUrl: repo.repoUrl,
    normalizedRepo: repo.normalizedRepo,
  };
}

function statusMessage(
  _event: ResponseCreatedEvent | ResponseQueuedEvent | ResponseInProgressEvent,
  message: string,
): AnalysisStreamEvent {
  return { type: "status", message };
}

function mapOutputItem(
  event: ResponseOutputItemAddedEvent | ResponseOutputItemDoneEvent,
  startedAtByCall: Map<string, number>,
  commandsByCall: Map<string, string>,
  outputByCall: Map<string, { stdout: string; stderr: string }>,
  completedCallIds: Set<string>,
  seenOutputFingerprints: Set<string>,
): AnalysisStreamEvent[] {
  const item = event.item;

  if (item.type === "shell_call") {
    return mapShellCallItem(item, startedAtByCall, commandsByCall, completedCallIds);
  }

  if (item.type === "shell_call_output") {
    return mapShellCallOutputItem(
      item,
      startedAtByCall,
      outputByCall,
      completedCallIds,
      seenOutputFingerprints,
    );
  }

  return [];
}

function mapShellCallItem(
  item: ResponseFunctionShellToolCall,
  startedAtByCall: Map<string, number>,
  commandsByCall: Map<string, string>,
  completedCallIds: Set<string>,
): AnalysisStreamEvent[] {
  const events: AnalysisStreamEvent[] = [];
  const startedAt = new Date().toISOString();
  const command = item.action.commands.join("\n");

  commandsByCall.set(item.call_id, command);

  if (!startedAtByCall.has(item.call_id)) {
    startedAtByCall.set(item.call_id, Date.now());
    events.push({
      type: "shell_call_started",
      callId: item.call_id,
      command,
      startedAt,
    });
  }

  if (item.status === "incomplete" && !completedCallIds.has(item.call_id)) {
    completedCallIds.add(item.call_id);
    events.push({
      type: "shell_call_completed",
      callId: item.call_id,
      durationMs: durationMs(item.call_id, startedAtByCall),
    });
  }

  return events;
}

function mapShellCallOutputItem(
  item: ResponseFunctionShellToolCallOutput,
  startedAtByCall: Map<string, number>,
  outputByCall: Map<string, { stdout: string; stderr: string }>,
  completedCallIds: Set<string>,
  seenOutputFingerprints: Set<string>,
): AnalysisStreamEvent[] {
  const events: AnalysisStreamEvent[] = [];

  for (const [chunkIndex, chunk] of item.output.entries()) {
    if (chunk.stdout) {
      appendShellOutput(outputByCall, item.call_id, "stdout", chunk.stdout);
      pushShellOutput(
        events,
        seenOutputFingerprints,
        item.id,
        chunkIndex,
        item.call_id,
        "stdout",
        chunk.stdout,
      );
    }

    if (chunk.stderr) {
      appendShellOutput(outputByCall, item.call_id, "stderr", chunk.stderr);
      pushShellOutput(
        events,
        seenOutputFingerprints,
        item.id,
        chunkIndex,
        item.call_id,
        "stderr",
        chunk.stderr,
      );
    }

    if (isCompletedShellOutcome(chunk.outcome.type) && !completedCallIds.has(item.call_id)) {
      completedCallIds.add(item.call_id);
      events.push({
        type: "shell_call_completed",
        callId: item.call_id,
        exitCode:
          chunk.outcome.type === "exit"
            ? chunk.outcome.exit_code
            : undefined,
        durationMs: durationMs(item.call_id, startedAtByCall),
      });
    }
  }

  if (
    item.status === "incomplete" &&
    !completedCallIds.has(item.call_id)
  ) {
    completedCallIds.add(item.call_id);
    events.push({
      type: "shell_call_completed",
      callId: item.call_id,
      durationMs: durationMs(item.call_id, startedAtByCall),
    });
  }

  return events;
}

function pushShellOutput(
  events: AnalysisStreamEvent[],
  seenOutputFingerprints: Set<string>,
  itemId: string,
  chunkIndex: number,
  callId: string,
  stream: "stdout" | "stderr",
  text: string,
): void {
  const fingerprint = `${itemId}:${chunkIndex}:${stream}:${text}`;
  if (seenOutputFingerprints.has(fingerprint)) {
    return;
  }

  seenOutputFingerprints.add(fingerprint);
  events.push({
    type: "shell_output",
    callId,
    stream,
    text,
  });
}

function durationMs(
  callId: string,
  startedAtByCall: Map<string, number>,
): number | undefined {
  const startedAt = startedAtByCall.get(callId);
  if (startedAt === undefined) {
    return undefined;
  }

  return Math.max(0, Date.now() - startedAt);
}

function appendShellOutput(
  outputByCall: Map<string, { stdout: string; stderr: string }>,
  callId: string,
  stream: "stdout" | "stderr",
  text: string,
): void {
  const existing = outputByCall.get(callId) ?? { stdout: "", stderr: "" };
  existing[stream] += text;
  outputByCall.set(callId, existing);
}

function isCompletedShellOutcome(outcomeType: string): boolean {
  return outcomeType === "exit" || outcomeType === "timeout" || outcomeType === "signal";
}

function extractAuthoritativeScorerReport(
  commandsByCall: Map<string, string>,
  outputByCall: Map<string, { stdout: string; stderr: string }>,
): ScorerReport {
  for (const [callId, command] of [...commandsByCall.entries()].reverse()) {
    if (!isAuthoritativeScorerCommand(command)) {
      continue;
    }

    const output = outputByCall.get(callId);
    if (!output?.stdout.trim()) {
      continue;
    }

    return ScorerReportSchema.parse(JSON.parse(output.stdout));
  }

  throw new Error("Hosted shell completed without parseable score_repo.py JSON output.");
}

function isAuthoritativeScorerCommand(command: string): boolean {
  return command.includes("score_repo.py") && !command.includes("--list-scopes");
}

function buildAnalysisResult(
  summary: AnalysisSummary,
  scorerReport: ScorerReport,
): AnalysisResult {
  return AnalysisResultSchema.parse({
    repoUrl: "https://github.com/placeholder/placeholder",
    normalizedRepo: "placeholder/placeholder",
    evaluatedScope: scorerReport.evaluated_scope,
    discoveredScopes: scorerReport.discovered_scopes,
    score: scorerReport.score,
    maxScore: scorerReport.max_score,
    scorePercentage: scorerReport.score_percentage,
    summary: summary.summary,
    quickWins: scorerReport.quick_wins,
    metrics: {
      bootstrap_self_sufficiency: mapScorerMetric(
        scorerReport.metrics.bootstrap_self_sufficiency,
      ),
      task_entrypoints: mapScorerMetric(scorerReport.metrics.task_entrypoints),
      validation_harness: mapScorerMetric(scorerReport.metrics.validation_harness),
      lint_format_gates: mapScorerMetric(scorerReport.metrics.lint_format_gates),
      agent_repo_map: mapScorerMetric(scorerReport.metrics.agent_repo_map),
      structured_docs: mapScorerMetric(scorerReport.metrics.structured_docs),
      decision_records: mapScorerMetric(scorerReport.metrics.decision_records),
    },
  });
}

function mapScorerMetric(metric: ScorerReport["metrics"]["bootstrap_self_sufficiency"]) {
  return {
    score: metric.score,
    confidence: metric.confidence,
    evidence: metric.evidence,
    gaps: metric.gaps,
    nextStep: metric.next_step,
  };
}

function extractResponseText(response: Response): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    throw new Error("Response completed without a final JSON message.");
  }

  const messageItems = response.output.filter(
    (item): item is Extract<Response["output"][number], { type: "message" }> =>
      item.type === "message",
  );

  for (let index = messageItems.length - 1; index >= 0; index -= 1) {
    const message = messageItems[index];

    for (let contentIndex = message.content.length - 1; contentIndex >= 0; contentIndex -= 1) {
      const content = message.content[contentIndex];
      if (content.type === "output_text" && content.text.trim()) {
        return content.text;
      }
    }
  }

  throw new Error("Response completed without a final JSON message.");
}
