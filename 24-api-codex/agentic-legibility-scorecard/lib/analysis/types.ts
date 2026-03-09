import { z } from "zod";

const GITHUB_REPO_URL_PATTERN =
  /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const ANALYSIS_METRIC_NAMES = [
  "bootstrap_self_sufficiency",
  "task_entrypoints",
  "validation_harness",
  "lint_format_gates",
  "agent_repo_map",
  "structured_docs",
  "decision_records",
] as const;

export const AnalysisMetricNameSchema = z.enum(ANALYSIS_METRIC_NAMES);
export const ScoreValueSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const AnalysisMetricResultSchema = z.object({
  score: ScoreValueSchema,
  confidence: ConfidenceSchema,
  evidence: z.array(z.string()),
  gaps: z.string(),
  nextStep: z.string(),
});

export const ScopeCandidateSchema = z.object({
  path: z.string().min(1),
  score: z.number().int().nonnegative(),
  signals: z.array(z.string()),
});

export const AnalysisMetricsSchema = z.object({
  bootstrap_self_sufficiency: AnalysisMetricResultSchema,
  task_entrypoints: AnalysisMetricResultSchema,
  validation_harness: AnalysisMetricResultSchema,
  lint_format_gates: AnalysisMetricResultSchema,
  agent_repo_map: AnalysisMetricResultSchema,
  structured_docs: AnalysisMetricResultSchema,
  decision_records: AnalysisMetricResultSchema,
});

export const AnalysisResultSchema = z.object({
  repoUrl: z
    .string()
    .regex(GITHUB_REPO_URL_PATTERN, "Expected a canonical https://github.com/owner/repo URL."),
  normalizedRepo: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Expected owner/repo."),
  evaluatedScope: z.string().min(1),
  discoveredScopes: z.array(ScopeCandidateSchema),
  score: z.number().int().min(0),
  maxScore: z.number().int().positive(),
  scorePercentage: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  quickWins: z.array(z.string()),
  metrics: AnalysisMetricsSchema,
});

export const AnalysisSummarySchema = z.object({
  summary: z.string().min(1),
});

export const AnalyzeRequestSchema = z.object({
  repoUrl: z.string().min(1),
  customInstructions: z
    .string()
    .max(4000, "Custom instructions must be 4000 characters or fewer.")
    .optional(),
});

export const AnalysisStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_started"),
    repoUrl: z
      .string()
      .regex(GITHUB_REPO_URL_PATTERN, "Expected a canonical https://github.com/owner/repo URL."),
    normalizedRepo: z.string(),
  }),
  z.object({
    type: z.literal("status"),
    message: z.string(),
  }),
  z.object({
    type: z.literal("shell_call_started"),
    callId: z.string(),
    command: z.string().optional(),
    startedAt: z.string(),
  }),
  z.object({
    type: z.literal("shell_output"),
    callId: z.string(),
    stream: z.enum(["stdout", "stderr"]),
    text: z.string(),
  }),
  z.object({
    type: z.literal("shell_call_completed"),
    callId: z.string(),
    exitCode: z.number().int().optional(),
    durationMs: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("final_result"),
    result: AnalysisResultSchema,
  }),
  z.object({
    type: z.literal("run_failed"),
    message: z.string(),
    detail: z.string().optional(),
  }),
]);

export type AnalysisMetricName = z.infer<typeof AnalysisMetricNameSchema>;
export type ScoreValue = z.infer<typeof ScoreValueSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type AnalysisMetricResult = z.infer<typeof AnalysisMetricResultSchema>;
export type ScopeCandidate = z.infer<typeof ScopeCandidateSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalysisSummary = z.infer<typeof AnalysisSummarySchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalysisStreamEvent = z.infer<typeof AnalysisStreamEventSchema>;
