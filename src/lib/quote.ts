/**
 * "Request a quote" plumbing.
 *
 * There is one quote button on this site — `RequestQuoteButton`, in the
 * masthead, the hero, the workflow, the rate sheet, the stock index, contact,
 * and the footer — and it has two destinations, decided by who is holding it:
 *
 *   Signed in  → the composer on their desk, with `?quote=1` attached. The
 *                composer reads that flag once, when it mounts, to pre-tick its
 *                "Quote" checkbox. It is off by default everywhere else, and
 *                arriving any other way leaves it off.
 *   Signed out → `/quote`, the public form, which needs no account at all.
 *
 * Resolving it here rather than adding a second button anywhere is the whole
 * point: no placement had to change, and no page has to decide which call to
 * action a visitor deserves.
 */

import { GUEST_QUOTE_HREF } from "@/lib/guest-quote";

export const QUOTE_PARAM = "quote";
const QUOTE_VALUE = "1";

/** The signed-in destination: the composer, with the Quote box pre-ticked. */
export const COMPOSER_QUOTE_HREF = `/dashboard?${QUOTE_PARAM}=${QUOTE_VALUE}`;

/**
 * Where a quote button goes. The public form is the default because it is what
 * a visitor with no session gets, and it is the honest destination while the
 * session is still loading — landing there signed in bounces straight to the
 * composer, whereas the reverse would flash a login wall at someone who never
 * needed one.
 */
export function quoteHref(isSignedIn: boolean): string {
  return isSignedIn ? COMPOSER_QUOTE_HREF : GUEST_QUOTE_HREF;
}

/** The same destination, with a material from the stock index pre-selected. */
export function quoteHrefForMaterial(material: string, isSignedIn = false): string {
  const encoded = encodeURIComponent(material);
  return isSignedIn
    ? `/dashboard?material=${encoded}&${QUOTE_PARAM}=${QUOTE_VALUE}`
    : `${GUEST_QUOTE_HREF}?material=${encoded}`;
}

/** True when the visitor arrived through a quote button. */
export function isQuoteRequested(value: string | null | undefined): boolean {
  return value === QUOTE_VALUE || value === "true" || value === "on";
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
