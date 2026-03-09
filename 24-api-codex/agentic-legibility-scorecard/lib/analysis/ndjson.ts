import {
  AnalysisStreamEventSchema,
  type AnalysisStreamEvent,
} from "@/lib/analysis/types";

export function serializeNdjsonEvent(event: AnalysisStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export async function consumeNdjsonStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AnalysisStreamEvent) => void | Promise<void>,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = await flushLines(buffer, onEvent);
  }

  const remaining = buffer.trim();
  if (remaining) {
    await onEvent(AnalysisStreamEventSchema.parse(JSON.parse(remaining)));
  }
}

async function flushLines(
  input: string,
  onEvent: (event: AnalysisStreamEvent) => void | Promise<void>,
): Promise<string> {
  let buffer = input;

  while (true) {
    const newlineIndex = buffer.indexOf("\n");
    if (newlineIndex === -1) {
      return buffer;
    }

    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);

    if (!line) {
      continue;
    }

    await onEvent(AnalysisStreamEventSchema.parse(JSON.parse(line)));
  }
}
