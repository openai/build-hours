import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI();
export const runtime = "edge";

export async function POST(request: NextRequest) {
  const { image, prompt } = await request.json();
  if (!image || !prompt) {
    return NextResponse.json({ error: "image and prompt are required" }, { status: 400 });
  }
  const promptText = `Edit the image with the following prompt: ${prompt}. Maintain the original composition and subject.`;
  console.log("Editing image with prompt", prompt);
  const openaiStream = await client.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: promptText },
          { type: "input_image", image_url: image, detail: "high" },
        ],//not here
      },
    ], //not
    tools: [
      {
        type: "image_generation",
        partial_images: 3,
        size: "1024x1024",
        quality: "medium",
        moderation: "low",
      },
      { type: 'web_search_preview' }
    ],
    stream: true,
    tool_choice: 'required',
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    for await (const event of openaiStream) {
      if (typeof event !== "object" || !(event as any).type) continue;
      if ((event as any).type === "response.image_generation_call.partial_image") {
        const url = `data:image/png;base64,${(event as any).partial_image_b64}`;
        await writer.write(JSON.stringify({ type: "partial", url }) + "\n");
      } else if ((event as any).type === "response.image_generation_call.completed") {
        const id = ((event as any).item_id || (event as any).id);
        await writer.write(
          JSON.stringify({ type: "final", id }) + "\n",
        );
      } else {
        console.log('Received event type:', (event as any).type);
      }
    }
    await writer.close();
  })();

  return new NextResponse(readable, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
  });
}
