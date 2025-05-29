import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import path from "path"
import fs from "fs/promises"
import { addBorderToImage, BorderSide } from "@/lib/imageProcessing"

export async function POST (request: NextRequest) {
  try {
    const { imageData } = await request.json();
    const sideWidth = 100; // Hardcoded for testing
    const topBottomHeight = 50; // Hardcoded for testing

    if (typeof imageData !== "string") {
      return NextResponse.json({ error: "imageData must be a base64 data URL string" }, { status: 400 });
    }

    // --- Decode the incoming data‑URI --------------------------------------------------------
    const match = imageData.match(/^data:(?:image\/(?:png|jpe?g));base64,(.*)$/i);
    if (!match || !match[1]) {
      return NextResponse.json({ error: "Invalid imageData format" }, { status: 400 });
    }
    const originalBuffer = Buffer.from(match[1], "base64");

    // --- Locate SVG assets ------------------------------------------------------------------
    // Detect whether the current working directory already ends with `public` (this can vary
    // between local dev and the compiled Next.js server output).  If it does, use it as-is;
    // otherwise, append the segment so we always resolve from the actual `public` folder
    // without accidentally producing a duplicated `public/public/...` path.
    const cwd = process.cwd();
    const publicDir = cwd.endsWith(`${path.sep}public`) ? cwd : path.join(cwd, "public");
    // --- Locate the right-side SVG asset and compose the border ----------------------------
    const svgRightPath = path.join(publicDir, "OpenAI_Frontiers-2025.svg");
    let svgRight: Buffer;
    try {
      svgRight = await fs.readFile(svgRightPath);
    } catch (err) {
      console.error("Failed to read SVG file for right border", err);
      return NextResponse.json({ error: "Border SVG file not found" }, { status: 500 });
    }
    // Add a white border and render the SVG only on the right side
    const withBorder = await addBorderToImage(originalBuffer, svgRight, {
      side:        "right" satisfies BorderSide,
      sideWidth,
      topBottomHeight,
      // Shrink the SVG overlay to 70% of its default size
      svgScale:    0.7,
    });

    // --- Encode back to data‑URI -------------------------------------------------------------
    const dataUrl = `data:image/png;base64,${withBorder.toString("base64")}`;
    return NextResponse.json({ imageData: dataUrl });
  } catch (error) {
    console.error("/api/process error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
