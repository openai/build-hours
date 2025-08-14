import { MODEL } from "@/config/constants";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { messages, previous_response_id, tools } = await request.json();
    console.log("Received messages:", messages);

    // Inject API keys for MCP calls
    const updatedTools = (tools || []).map((tool: any) => {
      if (tool.type === "mcp" && tool.server_label === "stripe") {
        return {
          ...tool,
          headers: {
            ...(tool.headers || {}),
            Authorization: `Bearer ${process.env.STRIPE_API_KEY}`,
          },
        };
      }
      // Add other auth headers here
      return tool;
    });

    const openai = new OpenAI();

    const params = {
      model: MODEL,
      input: messages,
      tools: updatedTools,
      stream: true,
      parallel_tool_calls: false,
    };

    if (previous_response_id) {
      // Chain the new response with the previous one
      (params as any).previous_response_id = previous_response_id;
    }

    const events = await openai.responses.create(params as any);

    // Create a ReadableStream that emits SSE data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of events as any) {
            // Sending all events to the client
            const data = JSON.stringify({
              event: event.type,
              data: event,
            });
            controller.enqueue(`data: ${data}\n\n`);
          }
          // End of stream
          controller.close();
        } catch (error) {
          console.error("Error in streaming loop:", error);
          controller.error(error);
        }
      },
    });

    // Return the ReadableStream as SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
