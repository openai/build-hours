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
  // Modifier-to-prompt mapping (mirrored from generate/route.ts)
  const modifierPrompts: Record<string, string> = {
    "ghibli-style": "Transform into a Studio Ghibli style with soft colours, dreamy atmosphere. Background should feature rolling green hills, drifting clouds, and subtle magical details such as floating spores or tiny forest spirits. One of the clouds in the background should be the OpenAI logo",
    "paperback": "Design a dramatic vintage paperback book cover in the style of 1980s speculative sci-fi. You should be able to see the whole book cover as if its rested on a wooden side table. Use the subject(s) as the central character illustration, stylized with exaggerated cinematic lighting in front of a wall of GPUs in a data center. Frame the layout with torn, worn edges, slight creases, and a retro paperback texture. Title the book in large bold serif font at the top: \"BUILD HOUR\". Subtitle in smaller italicized text below: “From the author of: 2025 is the year of Agents”. Include additional flourishes of genre fiction covers such as: A glowing tagline in cursive font like \"Fine-tuned for maximum impact!\" Buzzwords in various fonts and sizes like “Prompt Engineered”, “RFT Gone Too Far?”, and “GPT-5 Secrets” scattered like dramatic callouts. There should be elements representing AI cognition — swirling code, vector networks, glowing neurons, or a stylized datacenter skyline. Use a muted but high-contrast color palette: purples, oranges, deep blues, with halftone effects or risograph print style. Make it feel serious but slightly campy, like a speculative techno-thriller from the late Cold War era. The tone should echo Stephen King or Philip K. Dick covers — uncanny, powerful, and technical.",
    "action-figure": `Create a highly detailed and realistic 3D-rendered image of a boxed action figure inspired by 1980s–1990s toy packaging. Keep the package in landscape format. The figure(s) should match the subject(s) in the reference photo. They should appear as a cartoonish posable plastic toy with authentic joints and molded clothing detail. The packaging is a classic retro-style blister or window box, featuring slightly worn edges, printed cardboard art, and a clear plastic front shell. The branding should resemble real vintage toys like TMNT, Buzz Lightyear, or WWF action figures. At the top, include bold retro typography that says: **BUILD HOUR**. The package should also include a motif of OpenAI logos. Inside the package, include accessory items in separate compartments: - A laptop with an OpenAI logo sticker - A 1990s pager - A retro brick-style cell phone -  Additional design features: - Add printed "New: Fine Tuned Action!" and "For Models GPT-4o and Up" labels - Use slightly distressed cardboard texture and offset printing colors - Include illustrated character artwork in the background including the subject(s) holding a GPU in the sky like a boombox- Mimic harsh toy-store shelf lighting with a shadowed plastic sheen - Style the figure and accessories to match realistic toy mold aesthetics from the late '80s and early '90s`,
    "lego-minifigure-style": "Render the subject as a Lego minifigure with blocky proportions, glossy plastic texture, and signature claw hands. Situate them in a lego San Francisco. Have one of the cloud be an OpenAI logo.",
    "japanese-anime-movie-poster": `Design a late-1970s / early-1980s Japanese anime theatrical poster for "Build Hour 2025". Illustrate the subject as a heroic protagonist in dynamic pose, with a prominent OpenAI logo. Use hand-painted cel-style shading, dramatic starburst gradients, and a retro palette of deep indigo, vermilion, and mustard. Overlay faint fold-crease lines and subtle paper wear to suggest the poster has been stored and unfolded for decades; add small production credits along the bottom margin.`,
    "80s-cave": "CompositionalPortrait(2, Style(2: 'editorial rotcore', '80s technology nostalgia', '1990s disposable flash zine', 'polaroid'), Subject(3: 'Subject or subjects wearing a retro-futurist OpenAI varsity jacket (1980s style)', Face('(painted 80s movie-poster, Drew Struzan style, Stranger Things illustration, Dungeons-&-Dragons module cover illustration)'), MadeOutOf('vintage arcade remnants'), Arrangement('Sitting casually on a throne built from stacked CRT monitors, circuit boards, and arcade machine panels'), Accessories('Misc 80s arcade cabinets with glowing vector-style OpenAI marquees'), Background('Neon OpenAI logo arcade sign, classic cabinets, smoky arcade ambience'), Lighting('handheld camera flash, blown-out highlights, visible vignette, haze'), OutputStyle('high-resolution photo with grain, eerie warmth, lo-fi editorial finish, a very small barely visible handwritten \"OpenAI Labs\" watermark in the lower right corner'))",
    "mission-patch": `Embed the subject(s) as astronaut caricatures on a landscape shaped embroidered mission patch. Have the same number of subjects as the original image. Around the rim: "Build Hour 2025 • San Francisco". Centre features a stylised OpenAI logo blasting upward. Render fine thread texture, merrowed edge stitching, and metallic bullion accents for an authentic NASA patch feel.`,
    "knitted-cozy-scene": "Re-create the subjects as chunky knitted yarn doll seated on a plush chenille armchair beside a crackling fireplace. A cable-knit throw pillow sports an embroidered OpenAI emblem. Use warm lamplight, shallow depth of field, and visible yarn fibres to emphasise tactile softness.",
    "comic-panel": "Create a single-page comic of 4–6 panels that tells a complete, self-contained story featuring the subject(s) of the original image as they discover an invitation to Build Hour Executive Summit 2025,  arrive in San Francisco amid iconic city sights, dive into the summit's demos by listening to an engineer who is sharing his terminal (it should say: import OpenAI from \"openai\";) who has a speech bubble with the OpenAI logo in it, and conclude the adventure by wearing an I <3 AGI shirt and making an AI pun (e.g. referencs to transformer, model, embeddings, fine tuning, GPT, tokens, positive reinforcement, prompt or AI) —keeping all narration and dialogue concise enough to fit comfortably within that single page.",
  };
  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${image.type};base64,${base64}`;
  // Use mapped prompt if available, otherwise fallback to generic
  const mappedPrompt = modifierPrompts[modifier] 
    ? `${modifierPrompts[modifier]}. Maintain the original composition and subject.`
    : `Generate an image of the subject with the following modifier: ${mappedPrompt}. Maintain the original composition and subject.`;
  console.log('Generating with modifier:', modifier, 'Prompt:', mappedPrompt);

  const prompt = mappedPrompt;
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

