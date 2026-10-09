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
 * The homepage title. The shop's search and marketing focus is local — Salt
 * Lake City first, then Utah — even though it ships anywhere in the country,
 * so the title is the local search, as people type it, with the brand after
 * it (`${SITE_TAGLINE} | ${SITE_NAME}`, the same order as every other page's
 * title). A brand nobody searches for yet does not earn the first words.
 *
 * The 72-hour turnaround used to lead this title. Naming the city and both
 * services fills the ~60 characters Google shows, so the turnaround moved to
 * the description below, which is the snippet directly under the title, and
 * it still leads the homepage itself. "Utah" is left to the headline ("Utah
 * additive manufacturing") and the description; Google reads Salt Lake City as
 * Utah anyway.
 */
export const SITE_TAGLINE = "Salt Lake City 3D Printing & Additive Manufacturing";

/**
 * Used as the default meta description and the Organization description.
 * Kept near 160 characters so Google shows it without truncating, with the
 * terms that matter most placed first: the city and state, then the
 * turnaround, which is what earns the click from someone whose machine is
 * already down.
 *
 * "Shipped nationwide" stays because the shop still serves the whole country,
 * and a searcher outside Utah who reads only "Salt Lake City" assumes a local
 * shop and scrolls past.
 */
export const SITE_DESCRIPTION =
  "3D printing and additive manufacturing in Salt Lake City, Utah — 72-hour turnaround, shipped nationwide. FDM printing, 3D scanning, and carbon-fiber parts.";

export const BUSINESS = {
  telephone: "+1-385-695-4178",
  email: "info@takomoco.com",
  /**
   * City and state only — the shop does not publish a street address. These
   * must read exactly as the Google Business Profile does: Google matches a
   * business across the web by name, phone, and place, and a mismatch splits
   * it into two weaker listings.
   */
  locality: "Salt Lake City",
  region: "UT",
  regionName: "Utah",
  country: "US",
  /** The place as the site prints it, in the footer and on /contact. */
  locationLabel: "Salt Lake City, Utah",
  /** Where parts go: the shop is in Salt Lake City and ships anywhere in the country. */
  areaServed: "United States",
  /**
   * Shop hours, in Utah local time. Schema.org has no time-zone field for
   * opening hours — they are read as the business's local time — so the
   * displayed form says "Mountain Time" outright for visitors elsewhere.
   */
  openingHours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "17:00",
    label: "Mon–Fri · 9am – 5pm Mountain Time",
  },
  /** From the published capability statement. */
  naics: ["333248", "541330", "541420"],
} as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The social preview image, drawn by src/app/opengraph-image.tsx at the
 * 1200×630 every link-preview surface expects. Every page's `openGraph` and
 * `twitter` metadata points here, so a pasted link to any page previews with
 * the same card.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "TakomoCo — replacement parts and 3D printing on a 72-hour turnaround, made in Salt Lake City, Utah and shipped nationwide",
};
