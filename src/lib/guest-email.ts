import { createHmac, timingSafeEqual } from "crypto";
import { absoluteUrl } from "@/lib/seo";
import { PricedRecord, isEstimate } from "@/lib/request-status";

/**
 * Proof that the person at a guest estimate's email address is the person who
 * sent it — asked for after the fact, and never required.
 *
 * Anyone can type anyone's address into a public form. Nothing can stop that
 * at the form without costing a real customer a step (an emailed code breaks
 * the "standing next to the broken machine" case the form exists for), so the
 * form accepts every estimate at once and makes the address worthless to
 * anyone who does not own it:
 *
 *   * The one email the form sends carries nothing the sender typed — not
 *     their name, not the part — only the reference and two links. There is
 *     nothing in it to use as a message to a stranger.
 *   * "Confirm it's me" stamps `PartRequest.guestEmailConfirmedAt`. The console
 *     shows unconfirmed rows, and the shop calls the number before pricing one.
 *   * "This wasn't me" deletes the estimate and its files (while the shop has
 *     not yet moved it on) and puts the address on the do-not-email list
 *     (src/lib/email-suppression.ts), so the form never emails it again.
 *   * At most one of these emails a day goes to any one address, whatever is
 *     submitted.
 *
 * Both links land on /estimate/confirm, which does nothing until a button is
 * pressed. Mail scanners (Outlook Safe Links and friends) fetch every link in
 * an incoming message; a link that acted on GET would confirm every estimate
 * — or delete every real customer's — before anyone read the email.
 *
 * The token is stateless, like the form token: an HMAC over the request id and
 * issue time under NEXTAUTH_SECRET, so nothing is stored to issue one and a
 * link for one estimate cannot act on another. No database here, on purpose —
 * the confirm page verifies a token on a plain GET.
 */

/** Binds a signature to this purpose, so no other HMAC in the app can be replayed as one. */
const TOKEN_SCOPE = "guest-email";

/** How long the links in a confirmation email work. Estimates are answered in a day. */
export const GUEST_EMAIL_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Where both links in the email land. */
export const GUEST_EMAIL_CONFIRM_PATH = "/estimate/confirm";

export type GuestEmailAction = "confirm" | "disown";

/**
 * What became of the confirmation email on one submission, for the shop's
 * notification: sent; withheld because the address is on the do-not-email
 * list; withheld because the address already had one today; or not sent for
 * any other reason (no secret, list unreadable, mail provider refused).
 */
export type GuestConfirmationOutcome = "sent" | "suppressed" | "capped" | "not-sent";

/** At most this many confirmation emails reach one address per day, however many estimates name it. */
export const GUEST_CONFIRMATIONS_PER_ADDRESS_PER_DAY = 1;

export function isGuestEmailAction(value: unknown): value is GuestEmailAction {
  return value === "confirm" || value === "disown";
}

export type GuestEmailTokenFailure = "missing" | "malformed" | "unsigned" | "expired" | "no-secret";

export type GuestEmailTokenResult =
  | { ok: true; requestId: string }
  | { ok: false; reason: GuestEmailTokenFailure };

function secret(): string | null {
  return process.env.NEXTAUTH_SECRET || null;
}

function sign(requestId: string, issuedAt: number, key: string): string {
  return createHmac("sha256", key)
    .update(`${TOKEN_SCOPE}.${requestId}.${issuedAt}`)
    .digest("base64url");
}

/** A token for the links in one estimate's confirmation email, or null with no secret to sign it. */
export function issueGuestEmailToken(requestId: string, now: number = Date.now()): string | null {
  const key = secret();
  if (!key) {
    console.error("[guest-email] NEXTAUTH_SECRET is not set; cannot issue confirmation links");
    return null;
  }
  return `${requestId}.${now}.${sign(requestId, now, key)}`;
}

/** Check a token's signature and age. Pure — no database, no side effects. */
export function verifyGuestEmailToken(
  token: string | null | undefined,
  now: number = Date.now()
): GuestEmailTokenResult {
  const key = secret();
  if (!key) return { ok: false, reason: "no-secret" };
  if (!token || typeof token !== "string") return { ok: false, reason: "missing" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [requestId, issuedRaw, signature] = parts;
  if (!/^[a-z0-9]{1,64}$/i.test(requestId) || !/^\d{1,16}$/.test(issuedRaw)) {
    return { ok: false, reason: "malformed" };
  }
  const issuedAt = Number(issuedRaw);

  const expected = Buffer.from(sign(requestId, issuedAt, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "unsigned" };
  }

  // A token from the future was not issued by this clock; treat it as spent.
  const age = now - issuedAt;
  if (age < 0 || age > GUEST_EMAIL_TOKEN_MAX_AGE_MS) return { ok: false, reason: "expired" };

  return { ok: true, requestId };
}

/** The two links the confirmation email carries. */
export function guestEmailLinks(token: string): Record<GuestEmailAction, string> {
  const link = (action: GuestEmailAction) =>
    absoluteUrl(`${GUEST_EMAIL_CONFIRM_PATH}?a=${action}&t=${encodeURIComponent(token)}`);
  return { confirm: link("confirm"), disown: link("disown") };
}

/**
 * May "This wasn't me" delete this row outright? Only while it is still an
 * estimate the shop has not moved on. Once converted onto the build queue the
 * shop has spoken to somebody, priced it, and may have invoiced it — and an
 * order record is kept for accounting (/privacy §07) — so a person has to look.
 */
export function isDisownable(request: PricedRecord & { convertedAt?: Date | string | null }): boolean {
  return isEstimate(request) && !request.convertedAt;
}
