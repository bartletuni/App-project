/**
 * Direct uploads: the browser sends a file straight to Cloudflare R2, and the
 * form post carries only a receipt for it.
 *
 * Why. The forms post through a serverless function, and the host rejects a
 * request body over about 4.5MB before our code runs, so a large STL or a few
 * phone photos could not be submitted at all (see MAX_INLINE_BYTES in
 * src/lib/part-source.ts). A file sent to R2 on a signed URL never passes
 * through the function, so there is no body to cap. The tradeoff is that the
 * bytes are no longer in our hands when the request arrives, so everything the
 * inline path checks has to be checked another way. The rules, in order:
 *
 *   1. A signed URL is good for ONE exact PUT: this key, this content type, this
 *      many bytes (src/lib/r2.ts presignPutUrl). The size is declared up front,
 *      validated against the limit, and signed in, so the upload cannot be
 *      larger than what we agreed to.
 *   2. Files land in `pending/`, a prefix nothing serves. The download route
 *      refuses a key with a slash and only serves a key that a request row
 *      points at, so an upload nobody submits is unreachable as well as unused.
 *   3. The receipt is an HMAC over key, name, size, type, kind, who uploaded it
 *      and when it expires. A submission can only name a file its own uploader
 *      was issued: a guest's receipt is no good to a signed-in customer, and one
 *      customer's is no good to another, so keys cannot be swapped between
 *      requests even by someone who learns one.
 *   4. Nothing is trusted because it was signed. Before a receipt is accepted
 *      the object is read back: it must exist, be exactly the declared size, and
 *      begin with the bytes its extension promises (inspectUpload) — the same
 *      "extension is a claim, the bytes are the fact" rule as the inline path,
 *      applied to the first kilobyte instead of the whole file. A file that
 *      fails is deleted.
 *   5. Only then is it promoted (copied) to a permanent key and the pending
 *      object deleted. A receipt is therefore single-use: the second submission
 *      finds nothing at the pending key.
 *   6. An upload that is never submitted is deleted after PENDING_MAX_AGE_MS —
 *      by `sweepStalePending`, which runs from the presign route, so the
 *      promise made in /file-retention is kept by this code and does not depend
 *      on a lifecycle rule set up in the Cloudflare dashboard (which is a
 *      sensible second line, and is in the README).
 *
 * Server only.
 */

import { createHmac, timingSafeEqual } from "crypto";

import {
  expectedModelMime,
  expectedReferenceMime,
  modelMimeType,
  referenceMimeType,
} from "@/lib/file-signatures";
import { MAX_MODEL_BYTES, MAX_REFERENCE_BYTES } from "@/lib/part-source";
import {
  copyWithinR2,
  deleteFromR2,
  listObjectsInR2,
  newObjectKey,
  presignPutUrl,
  readObjectStart,
} from "@/lib/r2";

export type UploadKind = "model" | "reference";

/** Where an upload waits between arriving and being submitted. */
export const PENDING_PREFIX = "pending/";

/** How long the signed PUT URL works. Long enough for a big file on a slow line. */
export const UPLOAD_URL_TTL_SECONDS = 30 * 60;

/** How long a receipt works: the upload, plus the time to finish the form. */
export const RECEIPT_TTL_MS = 2 * 60 * 60 * 1000;

/** An upload nobody submitted is deleted after this. */
export const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** How much of the start of an object is read to check it. */
const INSPECT_BYTES = 1024;

export interface UploadReceipt {
  /** The object's key in the pending area. */
  key: string;
  fileName: string;
  size: number;
  mimeType: string;
  kind: UploadKind;
  /** Who it was issued to: `user:<id>` or `guest`. */
  scope: string;
  expiresAt: number;
}

export function uploadLimitFor(kind: UploadKind): number {
  return kind === "model" ? MAX_MODEL_BYTES : MAX_REFERENCE_BYTES;
}

function secret(): string | null {
  return process.env.NEXTAUTH_SECRET || null;
}

function sign(encodedPayload: string, key: string): string {
  return createHmac("sha256", key).update(`direct-upload.v1.${encodedPayload}`).digest("base64url");
}

function signatureMatches(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueReceipt(receipt: UploadReceipt): string | null {
  const key = secret();
  if (!key) {
    console.error("[direct-upload] NEXTAUTH_SECRET is not set; cannot issue upload receipts");
    return null;
  }
  const encoded = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${encoded}.${sign(encoded, key)}`;
}

/**
 * The receipt a token carries, if it is genuine, unexpired, of the right kind,
 * and was issued to `scope`. The one failure message is deliberately vague: it
 * is for a person, and every cause has the same remedy — send the file again.
 */
export function readReceipt(
  token: string,
  scope: string,
  kind: UploadKind,
  now: number = Date.now()
): { receipt: UploadReceipt } | { error: string } {
  const invalid = { error: "That upload could not be verified. Please send the file again." };
  const key = secret();
  if (!key || typeof token !== "string") return invalid;

  const parts = token.split(".");
  if (parts.length !== 2) return invalid;
  const [encoded, signature] = parts;
  if (!signatureMatches(sign(encoded, key), signature)) return invalid;

  let receipt: UploadReceipt;
  try {
    receipt = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return invalid;
  }

  if (
    !receipt ||
    receipt.kind !== kind ||
    receipt.scope !== scope ||
    typeof receipt.key !== "string" ||
    !receipt.key.startsWith(PENDING_PREFIX) ||
    typeof receipt.fileName !== "string" ||
    typeof receipt.size !== "number" ||
    typeof receipt.mimeType !== "string" ||
    typeof receipt.expiresAt !== "number"
  ) {
    return invalid;
  }
  if (now > receipt.expiresAt) {
    return { error: "That upload has expired. Please send the file again." };
  }
  return { receipt };
}

/** What a request to upload must look like before anything is signed. */
export function validateUploadRequest(input: {
  kind: unknown;
  fileName: unknown;
  size: unknown;
}): { kind: UploadKind; fileName: string; size: number; mimeType: string } | { error: string } {
  const { kind, fileName, size } = input;

  if (kind !== "model" && kind !== "reference") return { error: "Unknown kind of upload." };
  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 255) {
    return { error: "A file name of 255 characters or fewer is required." };
  }
  const mimeType = kind === "model" ? expectedModelMime(fileName) : expectedReferenceMime(fileName);
  if (!mimeType) {
    return {
      error:
        kind === "model"
          ? "That kind of file is not accepted as a 3D model."
          : "That kind of file is not accepted as a photo or drawing.",
    };
  }
  if (typeof size !== "number" || !Number.isInteger(size) || size < 1) {
    return { error: "The file's size is required." };
  }
  if (size > uploadLimitFor(kind)) return { error: "That file is over the size limit." };

  return { kind, fileName, size, mimeType };
}

/** Everything the browser needs to send one file: where, and with which header. */
export interface UploadTicket {
  url: string;
  headers: Record<string, string>;
  token: string;
}

export async function createUploadTicket(
  request: { kind: UploadKind; fileName: string; size: number; mimeType: string },
  scope: string,
  now: number = Date.now()
): Promise<UploadTicket | null> {
  const key = newObjectKey(request.fileName, PENDING_PREFIX);
  const token = issueReceipt({
    key,
    fileName: request.fileName,
    size: request.size,
    mimeType: request.mimeType,
    kind: request.kind,
    scope,
    expiresAt: now + RECEIPT_TTL_MS,
  });
  if (!token) return null;

  const url = await presignPutUrl({
    key,
    contentType: request.mimeType,
    contentLength: request.size,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  });
  return { url, headers: { "Content-Type": request.mimeType }, token };
}

/** Delete a pending object; a failure only means the sweep will find it later. */
export async function discardUpload(key: string): Promise<void> {
  try {
    await deleteFromR2(key);
  } catch (error) {
    console.error("[direct-upload] could not delete a pending upload:", error);
  }
}

/**
 * Read back what actually arrived. Returns the verified type, or an error — and
 * deletes the object when it is the file that is wrong, not the lookup.
 */
export async function inspectUpload(
  receipt: UploadReceipt
): Promise<{ mimeType: string } | { error: string }> {
  let found: Awaited<ReturnType<typeof readObjectStart>>;
  try {
    found = await readObjectStart(receipt.key, INSPECT_BYTES);
  } catch (error) {
    console.error("[direct-upload] could not read an uploaded file back:", error);
    return { error: "We couldn't check the uploaded file just now. Please try again in a moment." };
  }

  if (!found) {
    return { error: "We couldn't find that upload. Please send the file again." };
  }

  // Exactly what was declared, and so exactly what was signed.
  if (found.totalSize !== receipt.size || found.totalSize > uploadLimitFor(receipt.kind)) {
    await discardUpload(receipt.key);
    return { error: "That upload was not the size it was declared as. Please send the file again." };
  }

  const sniffed =
    receipt.kind === "model"
      ? modelMimeType(receipt.fileName, found.head, found.totalSize)
      : referenceMimeType(receipt.fileName, found.head);
  if (!sniffed || sniffed !== receipt.mimeType) {
    await discardUpload(receipt.key);
    return {
      error:
        receipt.kind === "model"
          ? "File content does not match its extension"
          : "Reference file content does not match its extension",
    };
  }

  return { mimeType: sniffed };
}

/** Move a verified upload to its permanent key. Throws on failure. */
export async function promoteUpload(receipt: UploadReceipt): Promise<string> {
  const finalKey = newObjectKey(receipt.fileName);
  await copyWithinR2(receipt.key, finalKey);
  // The permanent copy exists; a failure here only leaves a pending object for
  // the sweep, and must not fail the customer's request.
  await discardUpload(receipt.key);
  return finalKey;
}

/** Throttle: one sweep per instance per this long. */
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const SWEEP_PAGE = 200;
let lastSweep = 0;

/**
 * Delete pending uploads older than PENDING_MAX_AGE_MS. Best effort and bounded
 * — one page of keys, throttled — and never throws: it runs on the path of a
 * customer's upload and must not be able to fail it.
 */
export async function sweepStalePending(now: number = Date.now()): Promise<number> {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return 0;
  lastSweep = now;

  try {
    const objects = await listObjectsInR2(PENDING_PREFIX, SWEEP_PAGE);
    const stale = objects.filter((o) => now - o.lastModified.getTime() > PENDING_MAX_AGE_MS);
    await Promise.all(stale.map((o) => discardUpload(o.key)));
    return stale.length;
  } catch (error) {
    console.error("[direct-upload] sweep of stale pending uploads failed:", error);
    return 0;
  }
}

/** Test seam: lets a test run the sweep again without waiting out the throttle. */
export function resetSweepThrottle(): void {
  lastSweep = 0;
}
