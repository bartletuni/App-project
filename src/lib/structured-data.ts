import { BUSINESS, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

/**
 * Schema.org payloads describing the shop.
 *
 * Scope note: these describe only what the site itself states publicly. No
 * street address, geo coordinates, price ranges, reviews, or ratings appear
 * here — that data isn't in the repo, and fabricating it would violate
 * Google's structured-data policy and risk a manual action.
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The shop as a ProfessionalService (a LocalBusiness subtype), which is the
 * closest fit for a made-to-order manufacturing studio serving a region.
 */
export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: "Takomo Co",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo.png"),
    },
    image: absoluteUrl("/banner.png"),
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      addressRegion: BUSINESS.region,
      addressCountry: BUSINESS.country,
    },
    areaServed: [
      { "@type": "State", name: "Utah" },
      { "@type": "Place", name: BUSINESS.areaServed },
    ],
    naics: BUSINESS.naics,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: BUSINESS.openingHours.days,
        opens: BUSINESS.openingHours.opens,
        closes: BUSINESS.openingHours.closes,
      },
    ],
    knowsAbout: [
      "Additive manufacturing",
      "FDM/FFF 3D printing",
      "Carbon-fiber reinforced thermoplastics",
      "3D scanning",
      "Reverse engineering",
      "Rapid prototyping",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Additive manufacturing services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Additive Manufacturing",
            description:
              "Expert FDM/FFF printing focused on high-performance, engineering-grade, and fiber-reinforced materials.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "3D Scanning & Reverse Engineering",
            description:
              "High-fidelity 3D scanning for intricate part reproduction, exact 1:1 copies, and digital archiving of legacy components.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Rapid Prototyping",
            description:
              "Iterative design support that compresses development cycles — from first concept to validated, shippable part.",
          },
        },
      ],
    },
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en-US",
  };
}

/**
 * Breadcrumb trail for a subpage. Google renders these in place of the raw
 * URL in results, so every indexable subpage gets one.
 */
export function breadcrumbSchema(
  trail: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map(
      (crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path),
      })
    ),
  };
}
