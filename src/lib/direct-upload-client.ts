/**
 * The browser half of direct uploads (see src/lib/direct-upload.ts for the
 * design and the reasons).
 *
 * A submission whose files are too big to ride in the form post sends each file
 * straight to Cloudflare R2 first: ask the server for a signed URL, PUT the file
 * to it, and keep the receipt the server returned. The form is then posted with
 * the receipts in place of the files (`appendPartSource`).
 *
 * Small submissions never come through here — they go in the post as they
 * always have, which needs no storage configuration at all.
 */

import {
  DIRECT_UPLOADS,
  DIRECT_UPLOAD_THRESHOLD_BYTES,
  LARGE_FILE_ADVICE,
  PartSourceState,
  PreparedUploads,
  SUBMISSION_MODEL,
  totalBytes,
} from "@/lib/part-source";
import { readSubmitError } from "@/lib/submit-error";

/** Who is asking: a signed-in customer needs nothing; the public form sends its form token. */
export interface UploadAuth {
  formToken?: string;
}

export interface UploadProgress {
  fileName: string;
  /** Which file of how many, counting from 1. */
  index: number;
  count: number;
  loaded: number;
  total: number;
}

/** The files this submission would send, in the order they would go. */
function filesToSend(state: PartSourceState): { file: File; kind: "model" | "reference" }[] {
  if (state.mode === SUBMISSION_MODEL) {
    return state.file ? [{ file: state.file, kind: "model" }] : [];
  }
  return state.references.map((file) => ({ file, kind: "reference" as const }));
}

/**
 * Whether this submission has to take the direct road: direct uploads are on,
 * and what it carries is more than a form post can hold. A model that is
 * already on record from an earlier order (a reorder) sends nothing at all.
 */
export function needsDirectUpload(state: PartSourceState): boolean {
  if (!DIRECT_UPLOADS) return false;
  return totalBytes(filesToSend(state).map((f) => f.file)) > DIRECT_UPLOAD_THRESHOLD_BYTES;
}

async function requestTicket(
  file: File,
  kind: "model" | "reference",
  auth: UploadAuth
): Promise<{ url: string; headers: Record<string, string>; token: string }> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, fileName: file.name, size: file.size, formToken: auth.formToken }),
  });
  if (!res.ok) throw new Error(await readSubmitError(res));
  return res.json();
}

/** PUT with progress, which `fetch` cannot report. */
function putFile(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const failed = () =>
      reject(
        new Error(
          `We couldn't send “${file.name}”. Check your connection and try again. ${LARGE_FILE_ADVICE}`
        )
      );
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : failed());
    xhr.onerror = failed;
    xhr.onabort = failed;
    xhr.send(file);
  });
}

/**
 * Send every file this submission carries to storage, one after another, and
 * return the receipts. Throws an Error whose message is fit to show.
 */
export async function prepareUploads(
  state: PartSourceState,
  auth: UploadAuth,
  onProgress?: (progress: UploadProgress) => void
): Promise<PreparedUploads> {
  const files = filesToSend(state);
  const prepared: PreparedUploads = { modelUpload: null, referenceUploads: [] };

  for (let i = 0; i < files.length; i++) {
    const { file, kind } = files[i];
    const ticket = await requestTicket(file, kind, auth);
    await putFile(ticket.url, ticket.headers, file, (loaded, total) =>
      onProgress?.({ fileName: file.name, index: i + 1, count: files.length, loaded, total })
    );
    if (kind === "model") prepared.modelUpload = ticket.token;
    else prepared.referenceUploads.push(ticket.token);
  }

  return prepared;
}

/** "Uploading bracket.stl — 43%" (or "… 2 of 3 — 43%"), for a button or a status line. */
export function describeProgress(progress: UploadProgress): string {
  const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
  const which = progress.count > 1 ? `${progress.index} of ${progress.count} — ` : "";
  return `Uploading ${which}${percent}%`;
}
