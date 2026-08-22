/**
 * "Request a quote" plumbing.
 *
 * Every quote button on the public site points at the same place — the request
 * composer on the client desk — with `?quote=1` attached. The composer reads
 * that flag once, when it mounts, to pre-tick its "Quote" checkbox. The
 * checkbox is off by default everywhere else, and arriving any other way
 * leaves it off.
 */

export const QUOTE_PARAM = "quote";
const QUOTE_VALUE = "1";

/** Where every "Request a quote" button goes. */
export const QUOTE_HREF = `/dashboard?${QUOTE_PARAM}=${QUOTE_VALUE}`;

/** The same destination, with a material from the stock index pre-selected. */
export function quoteHrefForMaterial(material: string): string {
  return `/dashboard?material=${encodeURIComponent(material)}&${QUOTE_PARAM}=${QUOTE_VALUE}`;
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
