import type {
  AnalysisResult,
  AnalysisStreamEvent,
} from "@/lib/analysis/types";

export type ShellCallView = {
  callId: string;
  command?: string;
  startedAt?: string;
  durationMs?: number;
  exitCode?: number;
  status: "running" | "completed" | "incomplete";
  stdout: string;
  stderr: string;
};

export type AnalysisViewState = {
  runStatus: "idle" | "running" | "completed" | "failed" | "cancelled";
  repoUrl: string | null;
  normalizedRepo: string | null;
  statusMessages: string[];
  shellOrder: string[];
  shellCalls: Record<string, ShellCallView>;
  result: AnalysisResult | null;
  errorMessage: string | null;
  errorDetail: string | null;
};

export type AnalysisViewAction =
  | AnalysisStreamEvent
  | { type: "reset" }
  | { type: "cancelled"; message: string };

const MAX_STATUS_MESSAGES = 8;
const MAX_STREAM_CHARS = 4000;

export function createInitialAnalysisViewState(): AnalysisViewState {
  return {
    runStatus: "idle",
    repoUrl: null,
    normalizedRepo: null,
    statusMessages: [],
    shellOrder: [],
    shellCalls: {},
    result: null,
    errorMessage: null,
    errorDetail: null,
  };
}

export function analysisViewReducer(
  state: AnalysisViewState,
  action: AnalysisViewAction,
): AnalysisViewState {
  switch (action.type) {
    case "reset":
      return createInitialAnalysisViewState();
    case "cancelled":
      return {
        ...state,
        runStatus: "cancelled",
        errorMessage: action.message,
      };
    case "run_started":
      return {
        ...createInitialAnalysisViewState(),
        runStatus: "running",
        repoUrl: action.repoUrl,
        normalizedRepo: action.normalizedRepo,
      };
    case "status":
      return {
        ...state,
        runStatus: state.runStatus === "idle" ? "running" : state.runStatus,
        errorMessage: null,
        errorDetail: null,
        statusMessages: appendMessage(state.statusMessages, action.message),
      };
    case "shell_call_started": {
      const existing = state.shellCalls[action.callId];
      const shellCalls = {
        ...state.shellCalls,
        [action.callId]: {
          callId: action.callId,
          command: action.command ?? existing?.command,
          startedAt: action.startedAt,
          durationMs: existing?.durationMs,
          exitCode: existing?.exitCode,
          status: "running" as const,
          stdout: existing?.stdout ?? "",
          stderr: existing?.stderr ?? "",
        },
      };

      return {
        ...state,
        runStatus: "running",
        errorMessage: null,
        errorDetail: null,
        shellCalls,
        shellOrder: state.shellOrder.includes(action.callId)
          ? state.shellOrder
          : [...state.shellOrder, action.callId],
      };
    }
    case "shell_output": {
      const existing = state.shellCalls[action.callId] ?? {
        callId: action.callId,
        status: "running" as const,
        stdout: "",
        stderr: "",
      };

      const key = action.stream === "stdout" ? "stdout" : "stderr";
      const nextValue = trimStream(`${existing[key]}${action.text}`);
      return {
        ...state,
        runStatus: "running",
        errorMessage: null,
        errorDetail: null,
        shellCalls: {
          ...state.shellCalls,
          [action.callId]: {
            ...existing,
            [key]: nextValue,
          },
        },
        shellOrder: state.shellOrder.includes(action.callId)
          ? state.shellOrder
          : [...state.shellOrder, action.callId],
      };
    }
    case "shell_call_completed": {
      const existing = state.shellCalls[action.callId] ?? {
        callId: action.callId,
        status: "running" as const,
        stdout: "",
        stderr: "",
      };

      return {
        ...state,
        runStatus: "running",
        shellCalls: {
          ...state.shellCalls,
          [action.callId]: {
            ...existing,
            status: action.exitCode === undefined ? "incomplete" : "completed",
            exitCode: action.exitCode ?? existing.exitCode,
            durationMs: action.durationMs ?? existing.durationMs,
          },
        },
      };
    }
    case "final_result":
      return {
        ...state,
        runStatus: "completed",
        result: action.result,
        errorMessage: null,
        errorDetail: null,
      };
    case "run_failed":
      return {
        ...state,
        runStatus: "failed",
        errorMessage: action.message,
        errorDetail: action.detail ?? null,
      };
  }
}

function appendMessage(messages: string[], nextMessage: string): string[] {
  return [...messages, nextMessage].slice(-MAX_STATUS_MESSAGES);
}

function trimStream(text: string): string {
  if (text.length <= MAX_STREAM_CHARS) {
    return text;
  }

  return text.slice(text.length - MAX_STREAM_CHARS);
}
