/**
 * Removing a customer's stored files from the bucket when the records that
 * name them go away.
 *
 * /file-retention promises that closing an account removes the files attached
 * to it. Deleting the database rows alone does not: the objects stay in R2,
 * unreachable through /api/download/[fileId] (which finds no owner for them)
 * but still held. These helpers find the keys, and the routes delete the
 * objects *before* the rows — the same order the guest "this wasn't me" flow
 * uses — so a storage failure stops the deletion while the rows still name the
 * files, and pressing the button again finishes the job.
 *
 * One file can be named by two requests: a reorder points a new request at the
 * stored file of the order it repeats (src/lib/reorder.ts). Reorders stay
 * within one customer, so every file of a customer being deleted is theirs
 * alone; a single request's model file is only removed when no other request
 * still names it. Reference attachments are never shared (`fileId` is unique).
 *
 * Server only.
 */

import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

/** Every stored file belonging to a customer: models and reference attachments. */
export async function storedFilesForUser(userId: string): Promise<string[]> {
  const [requests, attachments] = await Promise.all([
    prisma.partRequest.findMany({
      where: { userId, fileId: { not: null } },
      select: { fileId: true },
    }),
    prisma.requestAttachment.findMany({
      where: { request: { userId } },
      select: { fileId: true },
    }),
  ]);
  return unique([...requests.map((r) => r.fileId), ...attachments.map((a) => a.fileId)]);
}

/**
 * The stored files that go with one request: its attachments, and its model
 * file unless another request (a reorder, or the order it repeated) still
 * names it.
 */
export async function storedFilesForRequest(request: {
  id: string;
  fileId: string | null;
  attachments: { fileId: string }[];
}): Promise<string[]> {
  const keys = request.attachments.map((a) => a.fileId);
  if (request.fileId) {
    const sharedWith = await prisma.partRequest.count({
      where: { fileId: request.fileId, id: { not: request.id } },
    });
    if (sharedWith === 0) keys.push(request.fileId);
  }
  return unique(keys);
}

/**
 * Delete each object. Throws on the first failure so the caller can refuse to
 * report a deletion that did not happen; deleting a key that is already gone
 * succeeds, so a retry is safe.
 */
export async function deleteStoredFiles(keys: string[]): Promise<void> {
  for (const key of keys) await deleteFromR2(key);
}

function unique(keys: (string | null)[]): string[] {
  return Array.from(new Set(keys.filter((key): key is string => Boolean(key))));
}
