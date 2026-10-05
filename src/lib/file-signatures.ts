/**
 * Server-side content sniffing for uploads.
 *
 * An extension is a claim, not a fact. Every upload route checks that the first
 * bytes of a file actually match the type its name promises before the bytes
 * reach R2, so a renamed executable cannot ride in as a "photo".
 *
 * Server only — this reaches for Buffer and must stay out of client bundles.
 */

/** ISO base-media brands used by iPhone photos (HEIC/HEIF). */
const HEIF_BRANDS = ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"];

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, i) => buffer[i] === byte);
}

function isPng(buffer: Buffer): boolean {
  return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isJpeg(buffer: Buffer): boolean {
  return startsWith(buffer, [0xff, 0xd8, 0xff]);
}

function isGif(buffer: Buffer): boolean {
  return startsWith(buffer, [0x47, 0x49, 0x46, 0x38]); // GIF8
}

function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function isHeif(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  return HEIF_BRANDS.includes(buffer.subarray(8, 12).toString("ascii").toLowerCase());
}

function isPdf(buffer: Buffer): boolean {
  return startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
}

/**
 * The MIME type for a reference photo/sketch/drawing, or null when the name and
 * the bytes disagree (or the type is not one we accept).
 */
export function referenceMimeType(fileName: string, buffer: Buffer): string | null {
  const name = fileName.toLowerCase();

  if (name.endsWith(".png")) return isPng(buffer) ? "image/png" : null;
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return isJpeg(buffer) ? "image/jpeg" : null;
  if (name.endsWith(".webp")) return isWebp(buffer) ? "image/webp" : null;
  if (name.endsWith(".gif")) return isGif(buffer) ? "image/gif" : null;
  if (name.endsWith(".heic")) return isHeif(buffer) ? "image/heic" : null;
  if (name.endsWith(".heif")) return isHeif(buffer) ? "image/heif" : null;
  if (name.endsWith(".pdf")) return isPdf(buffer) ? "application/pdf" : null;

  return null;
}

/**
 * STEP (ISO 10303-21) is clear text and opens with the keyword
 * `ISO-10303-21;`. Real exporters write it at byte zero; a byte-order mark and
 * leading white space are tolerated because some Windows tools add them.
 */
function isStep(buffer: Buffer): boolean {
  // Latin-1 decodes each byte to one character, so a UTF-8 byte-order mark
  // reads as \xEF\xBB\xBF here.
  const head = buffer.subarray(0, 64).toString("latin1").replace(/^\xEF\xBB\xBF/, "");
  return /^\s*ISO-10303-21\s*;/i.test(head);
}

/**
 * IGES is a fixed-format text file of 80-column records. Column 73 names the
 * section and columns 74-80 hold a right-justified sequence number, and the
 * file always opens with the first record of the Start section: an `S` in
 * column 73 and a `1` ending column 80. The 72 columns before it are free text
 * — usually blank, sometimes a description a non-English CAD install wrote with
 * accents — so they may hold anything but control bytes, which is what keeps a
 * binary file out.
 */
function isIges(buffer: Buffer): boolean {
  if (buffer.length < 80) return false;
  for (let i = 0; i < 72; i++) {
    if (buffer[i] < 0x20 || buffer[i] === 0x7f) return false;
  }
  if (buffer[72] !== 0x53) return false; // "S"
  return buffer.subarray(73, 80).toString("ascii").trim() === "1";
}

/**
 * The MIME type for a 3D model upload, or null when the name and the bytes
 * disagree. ZIP is checked by its local-file-header signature; STL may be ASCII
 * ("solid" …) or binary (an exact 84 + 50 × triangle-count byte length); STEP
 * and IGES are text formats with a fixed opening, checked above.
 */
export function modelMimeType(fileName: string, buffer: Buffer): string | null {
  const name = fileName.toLowerCase();

  if (name.endsWith(".zip")) {
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    return isZip ? "application/zip" : null;
  }

  if (name.endsWith(".stl")) {
    const isAsciiStl =
      buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii").toLowerCase() === "solid";
    let isBinaryStl = false;
    if (buffer.length >= 84) {
      const triangleCount = buffer.readUInt32LE(80);
      isBinaryStl = buffer.length === 84 + triangleCount * 50;
    }
    return isAsciiStl || isBinaryStl ? "application/sla" : null;
  }

  if (name.endsWith(".step") || name.endsWith(".stp")) {
    return isStep(buffer) ? "model/step" : null;
  }

  if (name.endsWith(".iges") || name.endsWith(".igs")) {
    return isIges(buffer) ? "model/iges" : null;
  }

  return null;
}
