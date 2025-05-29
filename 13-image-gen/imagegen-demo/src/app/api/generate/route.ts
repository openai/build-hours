import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
export const maxDuration = 350;


const client = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File

    // Create prompts based on modifiers
    const modifierPrompts = {
      "ghibli-style": "Transform into a Studio Ghibli style with soft colours, dreamy atmosphere. Background should feature rolling green hills, drifting clouds, and subtle magical details such as floating spores or tiny forest spirits. One of the clouds in the background should be the OpenAI logo",
      "paperback": "Design a dramatic vintage paperback book cover in the style of 1980s speculative sci-fi. You should be able to see the whole book cover as if its rested on a wooden side table. Use the subject(s) as the central character illustration, stylized with exaggerated cinematic lighting in front of a wall of GPUs in a data center. Frame the layout with torn, worn edges, slight creases, and a retro paperback texture. Title the book in large bold serif font at the top: \"BUILD HOUR\". Subtitle in smaller italicized text below: “From the author of: 2025 is the year of Agents”. Include additional flourishes of genre fiction covers such as: A glowing tagline in cursive font like \"Fine-tuned for maximum impact!\" Buzzwords in various fonts and sizes like “Prompt Engineered”, “RFT Gone Too Far?”, and “GPT-5 Secrets” scattered like dramatic callouts. There should be elements representing AI cognition — swirling code, vector networks, glowing neurons, or a stylized datacenter skyline. Use a muted but high-contrast color palette: purples, oranges, deep blues, with halftone effects or risograph print style. Make it feel serious but slightly campy, like a speculative techno-thriller from the late Cold War era. The tone should echo Stephen King or Philip K. Dick covers — uncanny, powerful, and technical.",
      "action-figure": `Create a highly detailed and realistic 3D-rendered image of a boxed action figure inspired by 1980s–1990s toy packaging. Keep the package in landscape format. The figure(s) should match the subject(s) in the reference photo. They should appear as a cartoonish posable plastic toy with authentic joints and molded clothing detail. The packaging is a classic retro-style blister or window box, featuring slightly worn edges, printed cardboard art, and a clear plastic front shell. The branding should resemble real vintage toys like TMNT, Buzz Lightyear, or WWF action figures. At the top, include bold retro typography that says: **BUILD HOUR**. The package should also include a motif of OpenAI logos. Inside the package, include accessory items in separate compartments: - A laptop with an OpenAI logo sticker - A 1990s pager - A retro brick-style cell phone -  Additional design features: - Add printed "New: Fine Tuned Action!" and "For Models GPT-4o and Up" labels - Use slightly distressed cardboard texture and offset printing colors - Include illustrated character artwork in the background including the subject(s) holding a GPU in the sky like a boombox- Mimic harsh toy-store shelf lighting with a shadowed plastic sheen - Style the figure and accessories to match realistic toy mold aesthetics from the late '80s and early '90s`,
      "lego-minifigure-style": "Render the subject as a Lego minifigure with blocky proportions, glossy plastic texture, and signature claw hands. Situate them in a lego San Francisco. Have one of the cloud be an OpenAI logo.",
      "japanese-anime-movie-poster": `Design a late-1970s / early-1980s Japanese anime theatrical poster for "Build Hour 2025". Illustrate the subject as a heroic protagonist in dynamic pose, with a prominent OpenAI logo. Use hand-painted cel-style shading, dramatic starburst gradients, and a retro palette of deep indigo, vermilion, and mustard. Overlay faint fold-crease lines and subtle paper wear to suggest the poster has been stored and unfolded for decades; add small production credits along the bottom margin.`,
      "80s-cave": "CompositionalPortrait(2, Style(2: 'editorial rotcore', '80s technology nostalgia', '1990s disposable flash zine', 'polaroid'), Subject(3: 'Subject or subjects wearing a retro-futurist OpenAI varsity jacket (1980s style)', Face('(painted 80s movie-poster, Drew Struzan style, Stranger Things illustration, Dungeons-&-Dragons module cover illustration)'), MadeOutOf('vintage arcade remnants'), Arrangement('Sitting casually on a throne built from stacked CRT monitors, circuit boards, and arcade machine panels'), Accessories('Misc 80s arcade cabinets with glowing vector-style OpenAI marquees'), Background('Neon OpenAI logo arcade sign, classic cabinets, smoky arcade ambience'), Lighting('handheld camera flash, blown-out highlights, visible vignette, haze'), OutputStyle('high-resolution photo with grain, eerie warmth, lo-fi editorial finish, a very small barely visible handwritten \"OpenAI Labs\" watermark in the lower right corner'))",
      "mission-patch": `Embed the subject(s) as astronaut caricatures on a landscape shaped embroidered mission patch. Have the same number of subjects as the original image. Around the rim: "Build Hour 2025 • San Francisco". Centre features a stylised OpenAI logo blasting upward. Render fine thread texture, merrowed edge stitching, and metallic bullion accents for an authentic NASA patch feel.`,
      "knitted-cozy-scene": "Re-create the subjects as chunky knitted yarn doll seated on a plush chenille armchair beside a crackling fireplace. A cable-knit throw pillow sports an embroidered OpenAI emblem. Use warm lamplight, shallow depth of field, and visible yarn fibres to emphasise tactile softness.",
      "comic-panel": "Create a single-page comic of 4–6 panels that tells a complete, self-contained story featuring the subject(s) of the original image as they discover an invitation to Build Hour Executive Summit 2025,  arrive in San Francisco amid iconic city sights, dive into the summit's demos by listening to an engineer who is sharing his terminal (it should say: import OpenAI from \"openai\";) who has a speech bubble with the OpenAI logo in it, and conclude the adventure by wearing an I <3 AGI shirt and making an AI pun (e.g. referencs to transformer, model, embeddings, fine tuning, GPT, tokens, positive reinforcement, prompt or AI) —keeping all narration and dialogue concise enough to fit comfortably within that single page.",
    }

    type ModifierKey = keyof typeof modifierPrompts
    const modifiers = formData.getAll("modifiers[]") as ModifierKey[]

    if (!image || !modifiers.length) {
      return NextResponse.json({ error: "Image and modifiers are required" }, { status: 400 })
    }
  

    // Generate images for each selected modifier
    const imagePromises = modifiers.map(async (modifier) => {
      const prompt = `${modifierPrompts[modifier] || `Apply ${modifier} effect`}. Maintain the original composition and subject.`

      // Create an array of promises to make 4 parallel calls
      const parallelCalls = Array.from({ length: 4 }, async () => {
        try {
          const result = await client.images.edit({
            model: "gpt-image-1",
            prompt,
            image,
            //@ts-expect-error - this is a bug in the OpenAI SDK
            size: "1536x1024",
          })

          // If the OpenAI call was successful, return the generated image as a base64 data URL.
          return `data:image/png;base64,${result.data![0].b64_json}`
        } catch (error) {
          // Log the individual failure but do **not** return a placeholder – instead, signal
          // that this particular generation attempt was unsuccessful by returning `null`.
          console.error(`Error generating image with modifier ${modifier}:`, error)
          return null
        }
      })

      // Wait for all parallel calls to complete and return the first successful result
      const results = await Promise.all(parallelCalls)
      // Return the first successful result for this modifier, or `null` if none succeeded.
      return results.find((url) => url) ?? null
    })

    // Resolve all modifier promises and remove any `null` entries so that only successfully
    // generated images are returned to the client.
    const generatedImageUrls = (await Promise.all(imagePromises)).filter(
      (url): url is string => Boolean(url),
    )

    return NextResponse.json({ urls: generatedImageUrls })
  } catch (error) {
    console.error("Error generating images:", error)
    return NextResponse.json(
      {
        error: "Failed to generate images",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

