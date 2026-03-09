import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
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
  AnalysisResultSchema,
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
      format: zodTextFormat(AnalysisResultSchema, "analysis_result"),
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
      "Then produce exactly one final JSON object matching the requested schema.",
      "Populate repoUrl and normalizedRepo from the target repository.",
      "Preserve evaluatedScope and discoveredScopes from the scorer output.",
      "Map maxScore from the script's max_score field and scorePercentage from score_percentage.",
      "Carry the script's quick_wins into quickWins.",
      "Write a short summary that highlights the strongest signals and the most important legibility gaps.",
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
            completedCallIds,
            seenOutputFingerprints,
          );
        case "response.output_item.done":
          return mapOutputItem(
            event,
            startedAtByCall,
            completedCallIds,
            seenOutputFingerprints,
          );
        case "response.completed": {
          const result = overwriteRepoIdentity(
            extractFinalResultFromResponse(event.response),
            repo,
          );
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

export function extractFinalResultFromResponse(response: Response): AnalysisResult {
  const rawText = extractResponseText(response);
  const parsed = JSON.parse(rawText);
  return AnalysisResultSchema.parse(parsed);
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
  completedCallIds: Set<string>,
  seenOutputFingerprints: Set<string>,
): AnalysisStreamEvent[] {
  const item = event.item;

  if (item.type === "shell_call") {
    return mapShellCallItem(item, startedAtByCall, completedCallIds);
  }

  if (item.type === "shell_call_output") {
    return mapShellCallOutputItem(
      item,
      startedAtByCall,
      completedCallIds,
      seenOutputFingerprints,
    );
  }

  return [];
}

function mapShellCallItem(
  item: ResponseFunctionShellToolCall,
  startedAtByCall: Map<string, number>,
  completedCallIds: Set<string>,
): AnalysisStreamEvent[] {
  const events: AnalysisStreamEvent[] = [];
  const startedAt = new Date().toISOString();

  if (!startedAtByCall.has(item.call_id)) {
    startedAtByCall.set(item.call_id, Date.now());
    events.push({
      type: "shell_call_started",
      callId: item.call_id,
      command: item.action.commands.join("\n"),
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
  completedCallIds: Set<string>,
  seenOutputFingerprints: Set<string>,
): AnalysisStreamEvent[] {
  const events: AnalysisStreamEvent[] = [];

  for (const chunk of item.output) {
    if (chunk.stdout) {
      pushShellOutput(
        events,
        seenOutputFingerprints,
        item.call_id,
        "stdout",
        chunk.stdout,
      );
    }

    if (chunk.stderr) {
      pushShellOutput(
        events,
        seenOutputFingerprints,
        item.call_id,
        "stderr",
        chunk.stderr,
      );
    }

    if (
      chunk.outcome.type === "exit" &&
      !completedCallIds.has(item.call_id)
    ) {
      completedCallIds.add(item.call_id);
      events.push({
        type: "shell_call_completed",
        callId: item.call_id,
        exitCode: chunk.outcome.exit_code,
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
  callId: string,
  stream: "stdout" | "stderr",
  text: string,
): void {
  const fingerprint = `${callId}:${stream}:${text}`;
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
