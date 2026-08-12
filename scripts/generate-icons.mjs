/**
 * Regenerates src/app/icon.png and src/app/apple-icon.png from the logo.
 *
 * Run from the repo root after changing public/logo.png:
 *
 *   npm install --no-save sharp && node scripts/generate-icons.mjs
 *
 * sharp is deliberately not a project dependency — this runs by hand on the
 * rare occasions the mark changes, and the generated PNGs are committed, so
 * nothing at build or request time needs it.
 *
 * Note that public/logo.png is actually a JPEG despite the extension. sharp
 * sniffs the real format, so that does not matter here.
 */
import sharp from "sharp";

const SRC = "public/logo.png";
const CREAM = { r: 0xf4, g: 0xec, b: 0xdf, alpha: 1 }; // cream-200

/**
 * The source is a JPEG of a blue mark on white, with a soft drop shadow.
 * Trimming alone leaves that white field intact, which then reads as a white
 * box sitting on the cream ground. So we key the white (and the grey shadow)
 * out to transparency first, and only then place the mark on cream.
 *
 * The test is deliberately two-part: a pixel is background only if it is both
 * near-white AND unsaturated. That keeps the palest blue bar at the top of the
 * mark — which is light, but decidedly blue — fully opaque.
 */
function keyOutWhite(data, pixels) {
  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const min = Math.min(r, g, b);
    const sat = Math.max(r, g, b) - min;
    const depth = 255 - min; // 0 = pure white

    if (sat < 10) {
      // White or grey: drop it. The cutoff is set past the drop shadow's
      // darkest point so no grey smudge survives under the mark. Safe to be
      // this aggressive because every part of the mark itself is blue, and
      // blue lands in the saturated branch below.
      data[o + 3] = Math.max(0, Math.min(255, (depth - 60) * 12));
    } else {
      data[o + 3] = 255; // Coloured ink — always keep.
    }
  }
}

async function build(size, out) {
  const trimmed = await sharp(SRC)
    .trim({ threshold: 12 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = trimmed.info;
  keyOutWhite(trimmed.data, width * height);

  const inner = Math.round(size * 0.82);
  const scaled = await sharp(trimmed.data, { raw: { width, height, channels: 4 } })
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: CREAM },
  })
    .composite([{ input: scaled, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out);

  const m = await sharp(out).metadata();
  console.log(`${out}  ${m.width}x${m.height}  (mark trimmed to ${width}x${height})`);
}

// 192 is a multiple of 48, which is what Google requires of a search favicon.
await build(192, "src/app/icon.png");
// Apple's touch-icon convention.
await build(180, "src/app/apple-icon.png");
