import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Proof that a form was actually loaded, and that a human took a moment over it.
 *
 * The public quote endpoint is the first thing on this site anyone can POST to
 * without an account, and the cheapest spam is a script that posts straight at
 * the URL, thousands of times, having never fetched a page. This closes that
 * door without asking the customer for anything:
 *
 *   * The page fetches a token when it mounts. A blind POST does not have one,
 *     and cannot forge one — it is HMAC'd with the deployment's secret.
 *   * The token carries the moment it was issued, so the server can tell that
 *     a submission arrived 200ms after the form loaded. Nobody fills in a part
 *     description that fast; a headless browser does.
 *   * It expires, so a token harvested once cannot be replayed all week.
 *
 * Stateless on purpose — no table, no session, nothing to clean up, and it
 * works the same on a cold serverless instance as on a warm one.
 *
 * This is one layer of several (honeypot, rate limit, and Turnstile where it
 * is configured). None of them is sufficient alone, and none of them costs the
 * customer a click.
 */

/** Faster than this and it was not typed by a person. */
export const MIN_FILL_MS = 2_500;

/** A form left open longer than this asks for a fresh token. */
export const MAX_TOKEN_AGE_MS = 3 * 60 * 60 * 1000;

export type FormTokenFailure =
  | "missing"
  | "malformed"
  | "unsigned"
  | "too-fast"
  | "expired"
  | "no-secret";

export interface FormTokenResult {
  ok: boolean;
  reason?: FormTokenFailure;
}

/**
 * The signing key. `NEXTAUTH_SECRET` is already required for the session
 * cookie, so there is no new secret to provision or rotate. Absent, we sign
 * nothing and verify nothing: the check fails closed rather than silently
 * accepting every token, because a deployment missing this variable has no
 * working auth either.
 */
function secret(): string | null {
  return process.env.NEXTAUTH_SECRET || null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/**
 * Issue a token for one form. `scope` binds it to that form, so a token minted
 * for the quote page cannot be spent anywhere else a token is ever accepted.
 */
export function issueFormToken(scope: string, now: number = Date.now()): string | null {
  const key = secret();
  if (!key) {
    console.error("[form-token] NEXTAUTH_SECRET is not set; cannot issue form tokens");
    return null;
  }
  const payload = `${scope}.${now}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload, key)}`;
}

/** Constant-time compare that tolerates a length mismatch. */
function signatureMatches(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyFormToken(
  token: string | null | undefined,
  scope: string,
  now: number = Date.now()
): FormTokenResult {
  const key = secret();
  if (!key) {
    console.error("[form-token] NEXTAUTH_SECRET is not set; rejecting form token");
    return { ok: false, reason: "no-secret" };
  }

  if (!token || typeof token !== "string") return { ok: false, reason: "missing" };

  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "malformed" };

  const [tokenScope, issuedRaw, , signature] = parts;
  if (tokenScope !== scope) return { ok: false, reason: "unsigned" };

  const payload = parts.slice(0, 3).join(".");
  if (!signatureMatches(sign(payload, key), signature)) {
    return { ok: false, reason: "unsigned" };
  }

  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: "malformed" };

  const age = now - issuedAt;
  // A clock skewed into the future is treated as too fast rather than trusted.
  if (age < MIN_FILL_MS) return { ok: false, reason: "too-fast" };
  if (age > MAX_TOKEN_AGE_MS) return { ok: false, reason: "expired" };

  return { ok: true };
}

/**
 * What to tell the person at the keyboard. Never leaks which check tripped in
 * a way that helps tune a bot, but always leaves a real customer something to
 * do — every one of these is fixed by reloading and sending again.
 */
export function describeFormTokenFailure(reason: FormTokenFailure | undefined): string {
  if (reason === "expired") {
    return "This form has been open a while. Refresh the page and send it again — your details are still filled in on the reloaded form only if your browser restores them, so copy anything long first.";
  }
  if (reason === "too-fast") {
    return "That came through faster than the form can be filled in. Give it a moment and try again.";
  }
  return "We couldn't verify this form. Refresh the page and send it again.";
}
