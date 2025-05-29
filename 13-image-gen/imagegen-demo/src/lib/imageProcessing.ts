import sharp from "sharp";

export type BorderSide = "left" | "right" | "top" | "bottom";

interface BorderOptions {
  /** which side the SVG word-mark should be rendered on */
  side: BorderSide;
  /** thickness in px for the *vertical* bands (ignored for top/bottom) */
  sideWidth: number;
  /** thickness in px for the *horizontal* bands (ignored for left/right) */
  topBottomHeight: number;
  /** horizontal alignment for top/bottom bands */
  hAlign?: "center" | "left" | "right";   // default = center
  /** scale factor (0 < scale <= 1) to shrink the SVG overlay; default = 1 (no scaling) */
  svgScale?: number;
}

/**
 * Add a white mortise + SVG word-mark to an image *without touching* the pixels
 * of the original photograph.  Returns a PNG buffer.
 */
export async function addBorderToImage (
  photoBuf: Buffer,
  svgBuf:   Buffer,
  {
    side,
    sideWidth,
    topBottomHeight,
    hAlign = "center",
    svgScale = 1,
  }: BorderOptions,
): Promise<Buffer> {
  const photo = sharp(photoBuf);
  const { width: w, height: h } = await photo.metadata();
  if (!w || !h) throw new Error("input image has no dimensions");

  /* ------------------------------------------------------------------
   * 1. Prepare SVG overlay: rotate → trim → scale → clamp
   * ---------------------------------------------------------------- */
  let ov = sharp(svgBuf);

  if (side === "left" || side === "right") {
    // Rotate so the text baseline faces inward
    ov = ov.rotate(side === "left" ? -90 : 90, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    // Remove transparent padding so the first/last glyphs sit flush
    ov = ov.trim();

    // Scale to match the photograph's height exactly, then reduce by 20%
    ov = ov.resize({ height: Math.round(h * 0.8) });

    // Clamp to the available strip width, preserving aspect ratio
    ov = ov.resize({ width: Math.round(sideWidth * 0.8), fit: "contain" });
  } else {
    // Horizontal mortise (top/bottom) — same strategy
    ov = ov.trim();
    ov = ov.resize({ width: Math.round(w * 0.8) });
    ov = ov.resize({ height: Math.round(topBottomHeight * 0.8), fit: "contain" });
  }

  // Render the prepared SVG overlay into a buffer
  let overlayBuf = await ov.toBuffer();
  // Determine its dimensions
  let { width: oW = 0, height: oH = 0 } = await sharp(overlayBuf).metadata();
  // Optionally scale the SVG overlay by a factor (e.g., shrink by 30%)
  if (svgScale !== 1) {
    const scaledBuf = await sharp(overlayBuf)
      .resize({
        width: Math.round(oW * svgScale),
        height: Math.round(oH * svgScale),
        fit: "contain",
      })
      .toBuffer();
    overlayBuf = scaledBuf;
    const meta2 = await sharp(overlayBuf).metadata();
    oW = meta2.width || 0;
    oH = meta2.height || 0;
  }

  /* ------------------------------------------------------------------
   * 2. White canvas + composite
   * ---------------------------------------------------------------- */
  // Always add white border margins on all sides; overlay is rendered on the specified side
  const extraLeft   = sideWidth;
  const extraRight  = sideWidth;
  const extraTop    = topBottomHeight;
  const extraBottom = topBottomHeight;

  const canvasW = w + extraLeft + extraRight;
  const canvasH = h + extraTop + extraBottom;

  const base = sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: "white",
    },
  });

  const comps: sharp.OverlayOptions[] = [
    { input: photoBuf, left: extraLeft, top: extraTop },
  ];

  // position overlay
  if (side === "left" || side === "right") {
    // Center SVG within the side margin (horizontal strip) as original
    const left = side === "left"
      ? 0
      : extraLeft + w + Math.round((sideWidth - oW) / 2);
    // Align SVG overlay flush with the top of the photo (no vertical centering)
    const top = extraTop;
    comps.push({ input: overlayBuf, left, top });
  } else if (side === "top" || side === "bottom") {
    const left = Math.round(
      extraLeft + (hAlign === "left" ? 0 : hAlign === "right" ? w - oW : (w - oW) / 2),
    );
    const top = side === "top" ? 0 : extraTop + h + Math.round((topBottomHeight - oH) / 2);
    comps.push({ input: overlayBuf, left, top });
  }

  return base.composite(comps).png().toBuffer();
}