/**
 * The no-account quote lane.
 *
 * Someone standing next to a broken machine should be able to photograph the
 * part, say what it is, and get a price started — without inventing a password
 * first. `/quote` is that form, and this module is the vocabulary it shares
 * with `POST /api/requests/guest`, so the page and the server agree on limits,
 * on wording, and on what is actually required.
 *
 * The deliberate design decision behind all of it: a guest quote is NOT a
 * second kind of record. It is an ordinary `PartRequest` on the QUOTE track,
 * owned by a `User` row that has been opened but never claimed
 * (`User.isGuest`). Everything downstream — the admin console, pricing a
 * quote, converting it to a build, invoicing, status emails, the reports PDF —
 * already knows how to handle exactly that shape, so none of it needed a
 * second code path. What is genuinely new here is only the front door and the
 * checks that keep bots out of it.
 *
 * Required, and nothing else: what the part is (a file or a description), a
 * name, an email, and a phone number. Material, quantity, the date, and notes
 * are all optional — the shop can ask on the callback, and every extra
 * required field is another reason to abandon the form on a job site.
 */

import { addDays } from "date-fns";

/** Where a logged-out visitor's "Request a quote" button goes. */
export const GUEST_QUOTE_HREF = "/quote";

export const MAX_CONTACT_NAME_CHARS = 100;
export const MAX_EMAIL_CHARS = 100;
export const MAX_PHONE_CHARS = 50;
export const MAX_COMPANY_CHARS = 120;
export const MAX_NOTES_CHARS = 2000;

/** The shop's standing minimum, the same one the signed-in composer enforces. */
export const MIN_LEAD_DAYS = 3;

/**
 * What we assume when a guest leaves "needed by" blank. `PartRequest.dateNeeded`
 * is not nullable and quoting does not need a date, so rather than force a
 * date-picker on someone in a hurry we book two weeks out and let the shop
 * agree a real one on the callback.
 */
export const DEFAULT_LEAD_DAYS = 14;

/** Chosen when a guest does not pick a material, and shown to the shop as-is. */
export const MATERIAL_UNDECIDED = "";
export const MATERIAL_UNDECIDED_LABEL = "Not sure — recommend one";

/**
 * Anti-bot field names. The honeypot is a real input that is hidden from
 * people; the other two carry the proof-of-form-load token and, when the
 * deployment has configured it, the Turnstile response.
 */
export const HONEYPOT_FIELD = "nickname";
export const FORM_TOKEN_FIELD = "formToken";
export const TURNSTILE_FIELD = "cf-turnstile-response";

/**
 * The Turnstile widget's public key, or null when this deployment has not
 * configured one — in which case nothing Cloudflare-related is rendered or
 * loaded at all. It lives in this client-safe module rather than beside the
 * server-side verification (src/lib/turnstile.ts), so the form never imports a
 * file that reads a secret.
 */
export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

/** Scope string tying a form token to this form and no other. */
export const GUEST_QUOTE_TOKEN_SCOPE = "guest-quote";

/** Everything the guest form collects that the composer gets from the account. */
export interface GuestContactState {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export function emptyGuestContact(): GuestContactState {
  return { name: "", email: "", phone: "", company: "" };
}

/** The register route's rule, so one address cannot be two people. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Deliberately permissive. A regex cannot decide whether an address exists,
 * and a stricter one only ever rejects real customers — the confirmation email
 * is what actually proves the address, and the shop has the phone number
 * either way.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailShaped(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/**
 * At least seven digits, ignoring formatting — enough to reject "call me" and
 * a stray keystroke without arguing with international or extension formats.
 */
export function isPhoneShaped(phone: string): boolean {
  return (phone.match(/\d/g) || []).length >= 7;
}

/**
 * Shared client/server check on the contact block. Returns an error message,
 * or null when it is good enough to send. The API re-validates all of this.
 */
export function validateGuestContact(state: GuestContactState): string | null {
  const name = state.name.trim();
  if (!name) return "Tell us who to send the quote to.";
  if (name.length > MAX_CONTACT_NAME_CHARS) {
    return `Name must be ${MAX_CONTACT_NAME_CHARS} characters or fewer.`;
  }

  const email = normalizeEmail(state.email);
  if (!email) return "We need an email address to send the quote to.";
  if (email.length > MAX_EMAIL_CHARS) {
    return `Email must be ${MAX_EMAIL_CHARS} characters or fewer.`;
  }
  if (!isEmailShaped(email)) return "That email address doesn't look right.";

  const phone = state.phone.trim();
  if (!phone) return "We need a phone number — most quotes start with a quick call.";
  if (phone.length > MAX_PHONE_CHARS) {
    return `Phone number must be ${MAX_PHONE_CHARS} characters or fewer.`;
  }
  if (!isPhoneShaped(phone)) return "That phone number doesn't look right.";

  if (state.company.trim().length > MAX_COMPANY_CHARS) {
    return `Company must be ${MAX_COMPANY_CHARS} characters or fewer.`;
  }

  return null;
}

/**
 * The date the request is stored with. A blank date is the common case and is
 * not an error; anything sooner than the standing minimum is.
 */
export function resolveDateNeeded(
  raw: string | null | undefined,
  now: Date = new Date()
): { date: Date } | { error: string } {
  if (!raw || !raw.trim()) {
    return { date: addDays(now, DEFAULT_LEAD_DAYS) };
  }

  const date = new Date(raw);
  if (isNaN(date.getTime())) return { error: "That date isn't valid." };

  const earliest = addDays(now, MIN_LEAD_DAYS);
  date.setHours(0, 0, 0, 0);
  earliest.setHours(0, 0, 0, 0);
  if (date < earliest) {
    return {
      error: `We need at least ${MIN_LEAD_DAYS} days' lead time. Need it sooner? Call the shop and we'll see what we can do.`,
    };
  }

  return { date };
}

/**
 * The short code a guest is given on screen and in their confirmation email.
 * They have no dashboard to look a request up on, so this is how they and the
 * shop name the same job on the phone. Derived from the row's id rather than
 * stored: nothing to keep unique, and it cannot drift from what it names.
 */
export function quoteReference(requestId: string): string {
  return `Q-${requestId.slice(-6).toUpperCase()}`;
}

/** Notes are the only free text a guest can send beyond the part description. */
export function validateGuestNotes(notes: string): string | null {
  if (notes.length > MAX_NOTES_CHARS) {
    return `Notes must be ${MAX_NOTES_CHARS} characters or fewer.`;
  }
  return null;
}
