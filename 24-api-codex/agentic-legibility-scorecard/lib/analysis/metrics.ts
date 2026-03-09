import type { AnalysisMetricName, ScoreValue } from "@/lib/analysis/types";

export const METRIC_DEFINITIONS: Record<
  AnalysisMetricName,
  { title: string; description: string }
> = {
  bootstrap_self_sufficiency: {
    title: "Bootstrap Self-Sufficiency",
    description: "How well the repo declares its toolchain and local setup path.",
  },
  task_entrypoints: {
    title: "Task Entrypoints",
    description: "Whether common workflows are exposed as stable repo-level commands.",
  },
  validation_harness: {
    title: "Validation Harness",
    description: "How easily an agent can verify routine changes locally.",
  },
  lint_format_gates: {
    title: "Lint + Format Gates",
    description: "Whether static checks are discoverable and mechanically enforced.",
  },
  agent_repo_map: {
    title: "Agent Repo Map",
    description: "Whether the repo includes a concise navigation aid for coding agents.",
  },
  structured_docs: {
    title: "Structured Docs",
    description: "How organized and cross-linked the repository documentation is.",
  },
  decision_records: {
    title: "Decision Records",
    description: "Whether important technical decisions are versioned inside the repo.",
  },
};

export const METRIC_ORDER = Object.keys(METRIC_DEFINITIONS) as AnalysisMetricName[];

export function scoreTone(
  score: ScoreValue | null,
): "red" | "orange" | "yellow" | "green" | "pending" {
  if (score === null) {
    return "pending";
  }

  switch (score) {
    case 0:
      return "red";
    case 1:
      return "orange";
    case 2:
      return "yellow";
    case 3:
      return "green";
  }
}
