/**
 * "Request an estimate" plumbing.
 *
 * There is one pricing button on this site — `RequestEstimateButton`, in the
 * masthead, the hero, the workflow, the rate sheet, the stock index, contact,
 * and the footer — and it has two destinations, decided by who is holding it:
 *
 *   Signed in  → the composer on their desk, with `?estimate=1` attached. The
 *                composer reads that flag once, when it mounts, to pre-tick its
 *                pricing checkbox. It is off by default everywhere else, and
 *                arriving any other way leaves it off.
 *   Signed out → `/estimate`, the public form, which needs no account at all.
 *
 * Resolving it here rather than adding a second button anywhere is the whole
 * point: no placement had to change, and no page has to decide which call to
 * action a visitor deserves.
 *
 * The button says "estimate" wherever it appears, because that is all a
 * visitor can be promised before we know who they are and what they are
 * sending. Whether the submission it leads to becomes an estimate or a
 * guaranteed quote is decided at the composer, from the account and the file —
 * see `pricingKindFor` in src/lib/request-status.ts.
 */

import { GUEST_ESTIMATE_HREF } from "@/lib/guest-estimate";

export const ESTIMATE_PARAM = "estimate";
const ESTIMATE_VALUE = "1";

/**
 * The parameter this flag used to travel under. Still read, never written: a
 * bookmark, an email, or a search result from before the rename must keep
 * working.
 */
export const LEGACY_QUOTE_PARAM = "quote";

/** The signed-in destination: the composer, with the pricing box pre-ticked. */
export const COMPOSER_ESTIMATE_HREF = `/dashboard?${ESTIMATE_PARAM}=${ESTIMATE_VALUE}`;

/**
 * Where a pricing button goes. The public form is the default because it is
 * what a visitor with no session gets, and it is the honest destination while
 * the session is still loading — landing there signed in bounces straight to
 * the composer, whereas the reverse would flash a login wall at someone who
 * never needed one.
 */
export function estimateHref(isSignedIn: boolean): string {
  return isSignedIn ? COMPOSER_ESTIMATE_HREF : GUEST_ESTIMATE_HREF;
}

/** The same destination, with a material from the stock index pre-selected. */
export function estimateHrefForMaterial(material: string, isSignedIn = false): string {
  const encoded = encodeURIComponent(material);
  return isSignedIn
    ? `/dashboard?material=${encoded}&${ESTIMATE_PARAM}=${ESTIMATE_VALUE}`
    : `${GUEST_ESTIMATE_HREF}?material=${encoded}`;
}

/** True when the visitor arrived through a pricing button. */
export function isPricingRequested(value: string | null | undefined): boolean {
  return value === ESTIMATE_VALUE || value === "true" || value === "on";
}

/**
 * Signing in bounces a visitor off the destination they asked for, so it rides
 * along as `?next=`. Only same-site absolute paths come back: anything
 * protocol-relative or absolute could hand a freshly signed-in user to another
 * origin. Backslashes are rejected too — several browsers normalise `/\` to
 * `//` when resolving a URL.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
