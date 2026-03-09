"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from "react";

import styles from "./page.module.css";

import {
  METRIC_DEFINITIONS,
  METRIC_ORDER,
  scoreTone,
} from "@/lib/analysis/metrics";
import { consumeNdjsonStream } from "@/lib/analysis/ndjson";
import {
  analysisViewReducer,
  createInitialAnalysisViewState,
  type AnalysisViewState,
} from "@/lib/analysis/state";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, dispatch] = useReducer(
    analysisViewReducer,
    undefined,
    createInitialAnalysisViewState,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    abortRef.current?.abort();
    dispatch({ type: "reset" });
    dispatch({
      type: "status",
      message: "Opening analysis stream...",
    });

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl, customInstructions }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await safeReadJson(response)) as
          | { message?: string; detail?: string }
          | null;

        dispatch({
          type: "run_failed",
          message: payload?.message ?? "The analysis request was rejected.",
          detail: payload?.detail,
        });
        return;
      }

      if (!response.body) {
        dispatch({
          type: "run_failed",
          message: "The server did not return a streaming response.",
        });
        return;
      }

      dispatch({
        type: "status",
        message: "Connected. Waiting for hosted shell events...",
      });

      await consumeNdjsonStream(response.body, async (streamEvent) => {
        dispatch(streamEvent);
      });
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({
          type: "cancelled",
          message: "Analysis cancelled.",
        });
      } else {
        dispatch({
          type: "run_failed",
          message: "The analysis request failed.",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  const result = state.result;
  const isLive = isSubmitting || state.runStatus === "running";
  const runTone = runStatusTone(state.runStatus);
  const currentPhase = currentPhaseLabel(state);
  const overallGrade = result ? letterGrade(result.scorePercentage) : null;
  const overallTone = result ? percentageTone(result.scorePercentage) : "pending";
  const runSummaryText = describeRunState(state);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIntro}>
          <div className={styles.heroHeader}>
            <p className={styles.repoBadge}>
              {state.normalizedRepo ?? "Awaiting public GitHub repo"}
            </p>
          </div>
          <h1>Agentic Legibility Scorecard</h1>
          <p className={styles.subtitle}>
            Paste a public GitHub repository to watch the hosted-shell run, see which scope gets
            evaluated, and get a final seven-metric scorecard with evidence and next steps.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <label className={styles.label} htmlFor="repo-url">
              Public GitHub repository URL
            </label>
            <div className={styles.formRow}>
              <input
                id="repo-url"
                className={styles.input}
                type="url"
                name="repoUrl"
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Analyzing..." : "Analyze repo"}
              </button>
            </div>
          </div>

          <div className={styles.formSection}>
            <label className={styles.label} htmlFor="custom-instructions">
              Custom instructions
            </label>
            <textarea
              id="custom-instructions"
              className={styles.textarea}
              name="customInstructions"
              placeholder="Focus on client/. Treat server/ and worker/ separately. Ignore generated docs."
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value)}
              rows={2}
            />
          </div>

          <div className={styles.formFooter}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={handleCancel}
              disabled={!isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      <section className={styles.summaryRow}>
        <div className={styles.summaryCard} data-tone={runTone}>
          <div className={styles.summaryHeader}>
            <p className={styles.summaryLabel}>Run state</p>
            {isLive ? (
              <span className={styles.liveIndicator}>
                <span className={styles.liveDot} />
                live
              </span>
            ) : null}
          </div>
          <p className={styles.summaryValue}>{state.runStatus}</p>
          <p className={styles.summaryText}>{runSummaryText}</p>
          <div className={styles.summaryMeta}>
            <span>Phase: {currentPhase}</span>
            <span>Repo: {state.normalizedRepo ?? "-"}</span>
            <span>Scope: {result?.evaluatedScope ?? "-"}</span>
          </div>
        </div>

        <div className={styles.summaryCard} data-tone={overallTone}>
          <p className={styles.summaryLabel}>Overall score</p>
          <p className={styles.summaryValue}>
            {result ? `${result.score}/${result.maxScore}` : "-"}
          </p>
          <p className={styles.summaryText}>
            {result
              ? `${result.scorePercentage}%${overallGrade ? ` · Grade ${overallGrade}` : ""}`
              : "Percentage and letter grade land with the final structured scorecard."}
          </p>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Quick wins</p>
          {result?.quickWins.length ? (
            <ul className={styles.summaryList}>
              {result.quickWins.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.summaryText}>Quick wins populate from the final result.</p>
          )}
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Discovered scopes</p>
          {result?.discoveredScopes.length ? (
            <ul className={styles.summaryList}>
              {result.discoveredScopes.map((scope) => (
                <li key={scope.path}>
                  <span className={styles.scopePath}>{scope.path}</span>
                  <span className={styles.scopeMeta}>
                    score {scope.score}
                    {scope.path === result.evaluatedScope ? " · evaluated" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.summaryText}>
              {result
                ? "No nested scopes were discovered for this run."
                : "Discovered scopes populate once the scorer returns."}
            </p>
          )}
        </div>
      </section>

      <section className={styles.workspace}>
        <article className={`${styles.panel} ${styles.timelinePanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Hosted shell</p>
              <h2>Timeline</h2>
            </div>
            <div className={styles.panelHeaderMeta}>
              {isLive ? (
                <span className={styles.liveIndicator}>
                  <span className={styles.liveDot} />
                  streaming
                </span>
              ) : null}
              <span className={styles.phaseBadge}>{currentPhase}</span>
            </div>
          </div>

          <div className={styles.statusRail}>
            {state.statusMessages.length > 0 ? (
              state.statusMessages.map((message, index) => (
                <div className={styles.statusPill} key={`${message}-${index}`}>
                  {message}
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                Submit a repo URL to open the stream. Early status updates will appear here before
                the first shell command starts.
              </div>
            )}
          </div>

          <div className={styles.shellList}>
            {state.shellOrder.length > 0 ? (
              state.shellOrder.map((callId) => {
                const shellCall = state.shellCalls[callId];

                return (
                  <section
                    className={styles.shellCard}
                    key={callId}
                    data-status={shellCall.status}
                  >
                    <div className={styles.shellHeader}>
                      <div className={styles.shellHeaderText}>
                        <p className={styles.shellLabel}>Command</p>
                        <pre className={styles.shellCommand}>
                          {shellCall.command ?? "Waiting for shell command details..."}
                        </pre>
                      </div>

                      <div className={styles.shellMeta}>
                        <span>{shellCall.status}</span>
                        {typeof shellCall.exitCode === "number" ? (
                          <span>exit {shellCall.exitCode}</span>
                        ) : null}
                        {typeof shellCall.durationMs === "number" ? (
                          <span>{formatDuration(shellCall.durationMs)}</span>
                        ) : null}
                      </div>
                    </div>

                    {(shellCall.stdout || shellCall.stderr) && (
                      <div className={styles.shellOutputGrid}>
                        {shellCall.stdout ? (
                          <div className={styles.shellStream}>
                            <p className={styles.streamLabel}>stdout</p>
                            <pre className={styles.shellOutput}>{shellCall.stdout}</pre>
                          </div>
                        ) : null}
                        {shellCall.stderr ? (
                          <div className={styles.shellStream}>
                            <p className={styles.streamLabel}>stderr</p>
                            <pre className={styles.shellOutput}>{shellCall.stderr}</pre>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </section>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                Each hosted shell command renders as its own timeline card with command text,
                status, exit code, duration, and grouped output.
              </div>
            )}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.scorePanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Scorecard</p>
              <h2>Seven metrics</h2>
            </div>
            <p className={styles.panelMeta}>7 metrics</p>
          </div>

          <div className={styles.metricStack}>
            {METRIC_ORDER.map((metricName) => {
              const metric = METRIC_DEFINITIONS[metricName];
              const metricResult = result?.metrics[metricName] ?? null;
              const tone = scoreTone(metricResult?.score ?? null);

              return (
                <section
                  className={styles.metricCard}
                  data-pending={metricResult ? "false" : "true"}
                  key={metricName}
                >
                  <div className={styles.metricHeader}>
                    <div className={styles.metricHeaderCopy}>
                      <p className={styles.metricTitle}>{metric.title}</p>
                      <p className={styles.metricDescription}>{metric.description}</p>
                    </div>
                    <p className={styles.metricScoreValue} data-tone={tone}>
                      {metricResult ? metricResult.score : "-"}
                    </p>
                  </div>

                  {metricResult ? (
                    <div className={styles.metricDetails}>
                      <p className={styles.metricMeta}>
                        Confidence: <strong>{metricResult.confidence}</strong>
                      </p>
                      {metricResult.evidence.length ? (
                        <p className={styles.metricMeta}>
                          Evidence: {metricResult.evidence.join(", ")}
                        </p>
                      ) : null}
                      <p className={styles.metricBody}>{metricResult.gaps}</p>
                      <p className={styles.metricNextStep}>{metricResult.nextStep}</p>
                    </div>
                  ) : (
                    <p className={styles.metricPending}>
                      Waiting for the final structured score to land.
                    </p>
                  )}
                </section>
              );
            })}
          </div>

          {state.errorMessage ? (
            <div className={styles.errorBox}>
              <p>{state.errorMessage}</p>
              {state.errorDetail ? <p>{state.errorDetail}</p> : null}
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function describeRunState(state: AnalysisViewState): string {
  return (
    state.result?.summary ??
    state.errorMessage ??
    state.statusMessages.at(-1) ??
    "Submit a repo URL to start one live hosted-shell audit."
  );
}

function runStatusTone(
  runStatus: AnalysisViewState["runStatus"],
): "red" | "orange" | "yellow" | "green" | "pending" {
  switch (runStatus) {
    case "completed":
      return "green";
    case "running":
      return "yellow";
    case "cancelled":
      return "orange";
    case "failed":
      return "red";
    case "idle":
      return "pending";
  }
}

function currentPhaseLabel(state: AnalysisViewState): string {
  switch (state.runStatus) {
    case "idle":
      return "idle";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "completed":
      return "completed";
    case "running":
      break;
  }

  const runningCall = [...state.shellOrder]
    .reverse()
    .map((callId) => state.shellCalls[callId])
    .find((call) => call?.status === "running");

  if (runningCall?.command) {
    const command = runningCall.command.toLowerCase();

    if (command.includes("git clone")) {
      return "cloning repository";
    }

    if (command.includes("--list-scopes")) {
      return "discovering scopes";
    }

    if (command.includes("score_repo.py")) {
      return "scoring repository";
    }

    return "running hosted shell";
  }

  const lastStatus = state.statusMessages.at(-1)?.toLowerCase();
  if (lastStatus) {
    if (lastStatus.includes("opening analysis stream")) {
      return "opening stream";
    }

    if (lastStatus.includes("preparing hosted-shell audit")) {
      return "preparing request";
    }

    if (lastStatus.includes("request created")) {
      return "requesting shell";
    }

    if (lastStatus.includes("waiting for hosted shell capacity")) {
      return "queueing";
    }

    if (lastStatus.includes("connected")) {
      return "waiting for shell";
    }

    if (lastStatus.includes("running the repo audit")) {
      return state.shellOrder.length > 0 ? "finalizing result" : "running hosted shell";
    }
  }

  if (state.shellOrder.length > 0) {
    return "finalizing result";
  }

  return "waiting for shell";
}

function letterGrade(scorePercentage: number): string {
  if (scorePercentage >= 80) {
    return "A";
  }
  if (scorePercentage >= 60) {
    return "B";
  }
  if (scorePercentage >= 40) {
    return "C";
  }
  if (scorePercentage >= 20) {
    return "D";
  }
  return "F";
}

function percentageTone(
  scorePercentage: number,
): "red" | "orange" | "yellow" | "green" | "pending" {
  if (scorePercentage >= 80) {
    return "green";
  }
  if (scorePercentage >= 60) {
    return "yellow";
  }
  if (scorePercentage >= 40) {
    return "orange";
  }
  return "red";
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1_000).toFixed(1)} s`;
}

async function safeReadJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
