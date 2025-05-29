import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI();

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const image = formData.get("image") as File | null;
  const modifier = formData.get("modifier") as string | null;
  if (!image || !modifier) {
    return NextResponse.json({ error: "Image and modifier are required" }, { status: 400 });
  }
  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${image.type};base64,${base64}`;
  const prompt = `Generate an image of the subject with the following modifier: ${modifier}. Maintain the original composition and subject.`;
  console.log('Generating with modifier:', modifier);
  const openaiStream = await client.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: dataUrl, detail: "high" },
        ],
      },
    ],
    tools: [
      {
        type: "image_generation",
        partial_images: 3,
        size: "1024x1024",
        quality: "high",
        moderation: "low",
      },
    ],
    stream: true, 
    tool_choice: 'required',
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    for await (const event of openaiStream) {
      if (typeof event !== "object" || !event.type) continue;
      if (event.type === "response.image_generation_call.partial_image") {
        const partialId = ((event as any).item_id || (event as any).id);
        console.log('stream partial image', partialId);
        const url = `data:image/png;base64,${(event as any).partial_image_b64}`;
        await writer.write(JSON.stringify({ type: "partial", url }) + "\n");
      } else if (event.type === "response.image_generation_call.completed") {
        const id = ((event as any).item_id || (event as any).id);
        console.log('stream final image with id:', id);
        await writer.write(
          JSON.stringify({ type: "final", id }) + "\n",
        );
      } else {
        console.log('Received event type:', event.type);
      }
    }
    await writer.close();
  })();

  return new NextResponse(readable, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
  });
}

