/**
 * Turning a failed submission into something the person at the keyboard can act on.
 *
 * A form POST can fail in ways that never reach our own JSON error body: the
 * host rejects an oversized upload before the route runs, a gateway returns an
 * HTML error page, the session expires, the network drops. `res.json()` throws
 * on all of those, and the raw exception ("Unexpected token '<'…") tells the
 * customer nothing. Every message this produces is non-empty, so a failure can
 * never render as a blank banner.
 */

import { INLINE_LIMIT_LABEL, LARGE_FILE_ADVICE } from "@/lib/part-source";

/** Shown when we genuinely cannot tell what went wrong. */
export const GENERIC_SUBMIT_ERROR =
  "Something went wrong submitting this request. Nothing was saved — please try again.";

/**
 * Vercel caps a serverless function's request body at ~4.5MB and rejects the
 * request before the route ever runs. The forms keep a post under that
 * (MAX_INLINE_BYTES) — a bigger file goes straight to storage instead — so this
 * should be rare: a browser that did not check, or a request that came another
 * way. It arrives as a 413 with no JSON body, so name it plainly instead of
 * letting it surface as a parse error.
 */
const TOO_LARGE =
  `That upload is too large to send. The limit is ${INLINE_LIMIT_LABEL} per request — ` +
  `a ZIP of the model may bring it under. ${LARGE_FILE_ADVICE}`;

const SESSION_EXPIRED =
  "Your session has expired. Sign in again, then resubmit — nothing was saved.";

const FORBIDDEN = "You do not have permission to submit this request.";

/**
 * Reads the error message out of a failed response. Prefers the API's own
 * `{ error }` body, and falls back to something specific to the status when
 * the body is missing or is not JSON at all.
 */
export async function readSubmitError(res: Response): Promise<string> {
  let fromBody: string | null = null;
  try {
    const data = await res.json();
    if (data && typeof data.error === "string" && data.error.trim()) {
      fromBody = data.error.trim();
    }
  } catch {
    // Not JSON — a host-level rejection or an HTML error page. Fall through.
  }

  if (fromBody) return fromBody;

  if (res.status === 413) return TOO_LARGE;
  if (res.status === 401) return SESSION_EXPIRED;
  if (res.status === 403) return FORBIDDEN;
  if (res.status === 408 || res.status === 504) {
    return "The server took too long to respond. Nothing was saved — please try again.";
  }
  if (res.status >= 500) {
    return `The server hit an error (${res.status}). Nothing was saved — please try again, and tell us if it keeps happening.`;
  }
  if (res.status >= 400) {
    return `The request was rejected (${res.status}). Please check the form and try again.`;
  }

  return GENERIC_SUBMIT_ERROR;
}

/**
 * Describes a `fetch` that never produced a response at all — offline, a
 * dropped connection, or a request aborted mid-upload.
 */
export function describeSubmitException(err: unknown): string {
  if (err instanceof Error && err.message) {
    // A TypeError from fetch itself means the request never completed. Its
    // message ("Failed to fetch", "Load failed") is browser jargon, so replace it.
    if (err instanceof TypeError) {
      return "Could not reach the server. Check your connection and try again — nothing was saved.";
    }
    return err.message;
  }
  return GENERIC_SUBMIT_ERROR;
}
