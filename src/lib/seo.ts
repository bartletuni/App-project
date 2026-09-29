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
 * shows for a search of the shop itself.
 *
 * Written for the customer the shop exists to serve: someone who needs a part
 * quickly and is searching for somewhere to make it right now. They type
 * "fast 3D printing" or "replacement part", not "additive manufacturing", so
 * those words lead and the turnaround closes it, all inside the ~60-character
 * truncation of a result listing. "Domestic" and "Additive Manufacturing" were
 * traded out to make room; both still lead the homepage's own copy, which is
 * what ranks the page for them.
 *
 * The figure is the shop's standing lead time, published on the homepage
 * spec sheet ("Lead time · 72 hours") and its counter, so the page backs up
 * its own title.
 */
export const SITE_TAGLINE = "Fast 3D Printing & Replacement Parts in 72 Hours";

/**
 * Used as the default meta description and the Organization description.
 * Kept under 160 characters so Google shows it without truncating.
 *
 * It opens on the searcher's situation rather than on the shop, because the
 * snippet under the title is what earns the click from someone whose machine
 * is already down, and then answers the three things they need to know: how
 * fast (72 hours, or 24 on express), whether it reaches them (nationwide),
 * and how soon they hear back (one business day).
 *
 * The 24-hour express figure is the rate sheet's express line (/pricing). It
 * is admin-editable there but stated here in code, so if the shop stops
 * offering it, this has to change too — AGENTS.md lists every place it does.
 */
export const SITE_DESCRIPTION =
  "Need a part fast? Replacement and custom parts 3D printed in Utah, shipped nationwide — 72-hour turnaround, 24-hour express, estimates in one business day.";

export const BUSINESS = {
  telephone: "+1-385-695-4178",
  email: "info@takomoco.com",
  /** Region only — the shop does not publish a street address. */
  region: "UT",
  country: "US",
  /** Where parts go: the shop is in Utah and ships anywhere in the country. */
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
  alt: "TakomoCo — need a part fast? Replacement parts and 3D printing on a 72-hour turnaround, 24-hour express available, shipped nationwide",
};
