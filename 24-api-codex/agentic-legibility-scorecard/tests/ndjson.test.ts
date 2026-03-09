import { describe, expect, it } from "vitest";

import { consumeNdjsonStream, serializeNdjsonEvent } from "@/lib/analysis/ndjson";
import type { AnalysisStreamEvent } from "@/lib/analysis/types";

describe("consumeNdjsonStream", () => {
  it("parses chunked NDJSON into typed events", async () => {
    const events: AnalysisStreamEvent[] = [
      {
        type: "run_started",
        repoUrl: "https://github.com/octocat/Hello-World",
        normalizedRepo: "octocat/Hello-World",
      },
      {
        type: "status",
        message: "Running audit.",
      },
      {
        type: "run_failed",
        message: "Failed",
      },
    ];

    const payload = events.map(serializeNdjsonEvent).join("");
    const chunks = [payload.slice(0, 35), payload.slice(35, 70), payload.slice(70)];
    const seen: AnalysisStreamEvent[] = [];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    await consumeNdjsonStream(stream, async (event) => {
      seen.push(event);
    });

    expect(seen).toEqual(events);
  });
});
