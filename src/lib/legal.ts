/**
 * Shared facts behind the three legal pages and the cookie notice.
 *
 * Everything here describes what the application actually does today. The
 * cookie table in particular is an inventory, not boilerplate: each entry
 * corresponds to a cookie this deployment genuinely sets, and there is
 * nothing else to disclose because the site loads no analytics, advertising,
 * or third-party tracking scripts at all.
 *
 * If a tracker is ever added, two things have to change together — an entry
 * here, and the notice in `CookieNotice` has to grow a real opt-in control,
 * because a non-essential cookie may not be set before the visitor agrees.
 */

import { BUSINESS, SITE_NAME } from "./seo";

/** Shown on every legal page. Bump whenever the substance changes. */
export const LEGAL_LAST_UPDATED = "September 1, 2026";

/** Where privacy and terms questions go. Same inbox published site-wide. */
export const LEGAL_CONTACT = {
  email: BUSINESS.email,
  telephone: "385-695-4178",
  postal: `${SITE_NAME}, Utah, United States`,
} as const;

/**
 * Square's privacy notice, cited by both the privacy policy and the terms.
 *
 * Kept here rather than inline so the two documents cannot drift apart, and
 * so there is a single line to correct if Square moves the page. Square
 * publishes this at squareup.com/us/en/legal/general/privacy; the URL could
 * not be reached from the build environment to confirm it, so treat it as
 * needing a click-through before release.
 */
export const SQUARE_PRIVACY_URL =
  "https://squareup.com/us/en/legal/general/privacy";

/** Governing law for the Terms, and the venue named in them. */
export const GOVERNING_LAW = "the State of Utah, United States";

export interface LegalRoute {
  href: string;
  label: string;
  /** Short blurb used by the footer and the cross-links between documents. */
  blurb: string;
}

export const LEGAL_ROUTES: LegalRoute[] = [
  {
    href: "/terms",
    label: "Terms of Service",
    blurb: "How orders, quotes, and manufacturing work",
  },
  {
    href: "/privacy",
    label: "Privacy Policy",
    blurb: "What we collect and what we do with it",
  },
  {
    href: "/cookies",
    label: "Cookie Policy",
    blurb: "Every cookie this site sets, and why",
  },
];

export interface CookieEntry {
  /** The name as it appears in the browser, `__Secure-` prefix and all. */
  name: string;
  purpose: string;
  /** How long the browser keeps it. */
  duration: string;
  /** Strictly necessary means it is exempt from prior consent. */
  category: "Strictly necessary";
}

/**
 * The complete inventory. All three cookies are set by NextAuth on the
 * authenticated side of the site; a visitor who never signs in is never
 * given any of them. The `__Secure-` / `__Host-` prefixes appear on HTTPS
 * deployments, which is every real one.
 */
export const COOKIE_INVENTORY: CookieEntry[] = [
  {
    name: "__Secure-next-auth.session-token",
    purpose:
      "Keeps you signed in to your client account so the dashboard can show your requests without asking for your password on every page.",
    duration: "30 days, or until you sign out",
    category: "Strictly necessary",
  },
  {
    name: "__Host-next-auth.csrf-token",
    purpose:
      "A security token that proves a sign-in or form submission came from this site, which is what stops another site from acting on your behalf.",
    duration: "Until you close the browser",
    category: "Strictly necessary",
  },
  {
    name: "__Secure-next-auth.callback-url",
    purpose:
      "Remembers the page you were headed to when sign-in interrupted you, so you land there afterwards instead of at the top of the site.",
    duration: "Until you close the browser",
    category: "Strictly necessary",
  },
];

/**
 * Not a cookie, but it is storage on your device, so it is disclosed in the
 * same table. This is the key `CookieNotice` writes when the banner is
 * dismissed — versioned so a materially changed notice can be shown again.
 */
export const COOKIE_NOTICE_STORAGE_KEY = "takomoco:cookie-notice:v1";
