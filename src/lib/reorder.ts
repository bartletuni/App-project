/**
 * Reordering a part: "the same again", without starting over.
 *
 * /file-retention tells customers that we keep the file after the job so that
 * asking for the part again means "nothing to re-upload", and the replacement-
 * parts page promises the next one is a reprint rather than a fresh start. This
 * is what keeps that promise. A reorder is an ordinary new request — same
 * route, same validation, same pricing track — whose model is the file already
 * on record rather than one uploaded again.
 *
 * Server only: it reads the database and the bucket.
 *
 * Three rules, because this is the one place a request names a file it did not
 * upload:
 *
 *   1. The order being reordered must belong to the customer the new request is
 *      for. Ownership is part of the query, not a check after it, and a missing
 *      order and someone else's answer identically, so the field cannot be used
 *      to find out which ids exist or whose they are.
 *   2. The file is looked for before a new request points at it. Deleting a file
 *      on request removes the object and leaves the order behind, so the stored
 *      key is not proof the file is there.
 *   3. The new request shares the file's key; it does not copy it. Both rows
 *      belong to the same customer, so /api/download/[fileId] authorises either
 *      the same way, and a deletion request for the file takes it away from
 *      both, which is what the customer asked for. Anything that deletes a
 *      file because one request went away has to remember the other.
 */

import { format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { objectExistsInR2 } from "@/lib/r2";
import { requestTitle } from "@/lib/part-source";

export const REORDER_NOT_FOUND = "We couldn't find the order to reorder from.";
export const REORDER_FILE_GONE =
  "The file from that order is no longer on record, so please upload it again.";
export const REORDER_CHECK_FAILED =
  "We couldn't check the stored file just now. Please try again in a moment.";

/** What a new request needs to know about the order it repeats. */
export interface ReorderSource {
  id: string;
  /** The file name, or the part name when there was no file. */
  title: string;
  /** Written into the new request's notes: "bracket.stl (Sep 3, 2026)". */
  note: string;
  fileId: string | null;
  fileName: string | null;
}

export type ReorderResult = { reorder: ReorderSource } | { error: string; status: number };

/** The customer's own earlier order, or "not found" — never "not yours". */
export async function loadReorder(rawId: string, ownerId: string): Promise<ReorderResult> {
  const id = rawId.trim();
  if (!id || id.length > 64) return { error: REORDER_NOT_FOUND, status: 404 };

  const original = await prisma.partRequest.findFirst({
    where: { id, userId: ownerId },
    select: { id: true, fileId: true, fileName: true, partName: true, createdAt: true },
  });
  if (!original) return { error: REORDER_NOT_FOUND, status: 404 };

  const title = requestTitle(original);
  return {
    reorder: {
      id: original.id,
      title,
      note: `${title} (${format(original.createdAt, "MMM d, yyyy")})`,
      fileId: original.fileId,
      fileName: original.fileName,
    },
  };
}

/** Confirms a stored file is still in the bucket before a request is pointed at it. */
export async function confirmStoredFile(
  fileId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  try {
    if (await objectExistsInR2(fileId)) return { ok: true };
    return { error: REORDER_FILE_GONE, status: 409 };
  } catch (error) {
    console.error("Could not check a stored file for a reorder:", error);
    return { error: REORDER_CHECK_FAILED, status: 503 };
  }
}
