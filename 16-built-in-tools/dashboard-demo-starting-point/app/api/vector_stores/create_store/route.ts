import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request: Request) {
  const { name } = await request.json();
  try {
    const vectorStore = await openai.vectorStores.create({
      name,
    });
    return new Response(JSON.stringify(vectorStore), { status: 200 });
  } catch (error) {
    console.error("Error creating vector store:", error);
    return new Response("Error creating vector store", { status: 500 });
  }
}
