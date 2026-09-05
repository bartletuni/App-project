/**
 * Single source of truth for the site's canonical origin and the business
 * facts that feed metadata and structured data.
 *
 * Every value here is one the shop already publishes on the site itself —
 * nothing is asserted to search engines that a visitor cannot verify on the
 * page. Deliberately absent: a street address, geo coordinates, and any
 * review or rating markup. We don't have that information, and inventing it
 * would be both false and a structured-data policy violation.
 */

/**
 * Canonical origin, no trailing slash.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in the deployment environment to override —
 * useful so preview deployments canonicalize to themselves rather than
 * pointing every preview at production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://takomoco.com"
).replace(/\/+$/, "");

export const SITE_NAME = "TakomoCo";

/**
 * The homepage title, after the brand name — and the only page title Google
 * shows for a search of the shop itself. The turnaround leads it because that
 * is what someone with a broken part searches for, and it sits early enough to
 * survive the ~60-character truncation in a result listing. Nothing was given
 * up for it: "Domestic", "3D Printing" and "Additive Manufacturing" all stay.
 *
 * The claim is the shop's standing lead time, already published on the
 * homepage spec sheet ("Lead time · 72 hours") and its counter, so the page
 * backs up its own title.
 */
export const SITE_TAGLINE = "72-Hour Domestic 3D Printing & Additive Manufacturing";

/**
 * Used as the default meta description and the Organization description.
 * Kept near 160 characters so Google shows it without truncating, with the
 * terms that matter most placed first — which now includes the turnaround,
 * since the snippet under the title is what earns the click from someone
 * whose machine is already down. "Rapid prototyping" was the one phrase
 * traded out to make room; it still leads the homepage's own copy.
 */
export const SITE_DESCRIPTION =
  "Domestic additive manufacturing in Utah on a 72-hour turnaround — high-precision FDM 3D printing, 0.02mm 3D scanning, and reverse engineering in carbon-fiber.";

export const BUSINESS = {
  telephone: "+1-385-695-4178",
  email: "info@takomoco.com",
  /** Region only — the shop does not publish a street address. */
  region: "UT",
  country: "US",
  areaServed: "Wasatch Front, Utah",
  openingHours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "17:00",
  },
  /** From the published capability statement. */
  naics: ["333248", "541330", "541420"],
} as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The social preview image. `banner.png` is the only wide marketing image in
 * the repo, so it doubles as the Open Graph card.
 */
export const OG_IMAGE = {
  url: "/banner.png",
  width: 1794,
  height: 592,
  alt: "TakomoCo — additive manufacturing and rapid prototyping studio",
};
