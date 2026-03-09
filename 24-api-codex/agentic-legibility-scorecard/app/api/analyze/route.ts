import {
  GitHubRepoUrlError,
  normalizeGitHubRepoUrl,
} from "@/lib/analysis/github";
import { serializeNdjsonEvent } from "@/lib/analysis/ndjson";
import {
  buildAnalysisRequest,
  createOpenAIClient,
  createOpenAIEventMapper,
  getOpenAIConfig,
  HOSTED_SHELL_ALLOWED_DOMAINS,
  isAbortError,
} from "@/lib/analysis/openai";
import {
  AnalyzeRequestSchema,
  type AnalysisStreamEvent,
} from "@/lib/analysis/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return Response.json(
      {
        message:
          fieldErrors.repoUrl?.[0] ??
          fieldErrors.customInstructions?.[0] ??
          "Request body must include repoUrl.",
      },
      { status: 400 },
    );
  }

  let repo;
  try {
    repo = normalizeGitHubRepoUrl(parsed.data.repoUrl);
  } catch (error) {
    if (error instanceof GitHubRepoUrlError) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }

  let config;
  try {
    config = getOpenAIConfig();
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Missing OpenAI configuration." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const emit = async (event: AnalysisStreamEvent) => {
    await writer.write(encoder.encode(serializeNdjsonEvent(event)));
  };

  void (async () => {
    try {
      await emit({
        type: "run_started",
        repoUrl: repo.repoUrl,
        normalizedRepo: repo.normalizedRepo,
      });
      await emit({
        type: "status",
        message: `Preparing hosted-shell audit for ${repo.normalizedRepo}.`,
      });

      console.info("Starting agentic legibility analysis", {
        repoUrl: repo.repoUrl,
        normalizedRepo: repo.normalizedRepo,
        model: config.model,
        allowedDomains: HOSTED_SHELL_ALLOWED_DOMAINS,
      });

      const client = createOpenAIClient(config.apiKey);
      const mapper = createOpenAIEventMapper(repo);
      const responseStream = await client.responses.create(
        buildAnalysisRequest(
          repo,
          config.model,
          config.skillId,
          parsed.data.customInstructions,
        ),
        { signal: request.signal },
      );

      for await (const event of responseStream) {
        for (const mappedEvent of mapper.mapEvent(event)) {
          await emit(mappedEvent);
        }
      }

      if (!mapper.hasFinalResult() && !request.signal.aborted) {
        await emit({
          type: "run_failed",
          message: "The analysis stream ended without a final scorecard.",
        });
      }
    } catch (error) {
      console.error("Agentic legibility analysis failed", {
        repoUrl: repo.repoUrl,
        normalizedRepo: repo.normalizedRepo,
        model: config.model,
        allowedDomains: HOSTED_SHELL_ALLOWED_DOMAINS,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!isAbortError(error)) {
        await emit({
          type: "run_failed",
          message: "The analysis request failed.",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
