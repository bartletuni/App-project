import { BUSINESS, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { type FaqItem, faqAnswerText } from "@/lib/faq";

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
const REPLACEMENT_PARTS_ID = `${SITE_URL}/replacement-parts#service`;
const RUSH_PRINTING_ID = `${SITE_URL}/rush-3d-printing#service`;

/** The shop's published hours, shared by the business and the rush service. */
function openingHoursSpecification(): Record<string, unknown>[] {
  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: BUSINESS.openingHours.days,
      opens: BUSINESS.openingHours.opens,
      closes: BUSINESS.openingHours.closes,
    },
  ];
}

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
    // The brand line set in every footer and on the homepage hero.
    slogan: "Fast, Fitted, Flawless",
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    // The same line and inbox every page publishes, marked as the one to use
    // for a new job — what a search engine offers as "contact" for the shop.
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: BUSINESS.telephone,
        email: BUSINESS.email,
        availableLanguage: "English",
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressRegion: BUSINESS.region,
      addressCountry: BUSINESS.country,
    },
    // Based in Utah (the address above), shipping anywhere in the country.
    areaServed: { "@type": "Country", name: BUSINESS.areaServed },
    naics: BUSINESS.naics,
    openingHoursSpecification: openingHoursSpecification(),
    knowsAbout: [
      "Rush 3D printing",
      "Replacement part reproduction",
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
        {
          "@type": "Offer",
          itemOffered: { "@id": REPLACEMENT_PARTS_ID },
        },
        {
          "@type": "Offer",
          itemOffered: { "@id": RUSH_PRINTING_ID },
        },
      ],
    },
  };
}

/**
 * The part-reproduction service, described on its own page. Referenced from
 * the Organization's offer catalog by `@id`, so the two stay one entity rather
 * than two copies that could drift. Only what /replacement-parts itself says.
 */
export function replacementPartsServiceSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": REPLACEMENT_PARTS_ID,
    name: "Replacement part reproduction",
    serviceType: "Replacement part reproduction",
    description:
      "Reproduction of broken, discontinued, and hard-to-source parts for repair and service businesses — modelled from photos, a 3D file, or a 3D scan of the original, and printed in engineering-grade and carbon-fiber-reinforced materials.",
    url: absoluteUrl("/replacement-parts"),
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: BUSINESS.areaServed },
    audience: { "@type": "BusinessAudience", name: "Repair and service companies" },
  };
}

/**
 * Rush and express printing, described on its own page and referenced from
 * the offer catalog by `@id`, as the replacement-parts service is. The two
 * turnarounds are the rate sheet's; no price is given because the express
 * surcharge is admin-editable on /pricing and would drift if copied here.
 */
export function rushPrintingServiceSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": RUSH_PRINTING_ID,
    name: "Rush 3D printing",
    serviceType: "Expedited 3D printing and replacement parts",
    description:
      "Replacement and custom parts 3D printed in engineering-grade and carbon-fiber-reinforced materials on a 72-hour standard or 24-hour express turnaround, and shipped anywhere in the United States.",
    url: absoluteUrl("/rush-3d-printing"),
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: BUSINESS.areaServed },
    hoursAvailable: openingHoursSpecification(),
  };
}

/**
 * A page's questions as FAQPage markup, from the same items `<FaqList>`
 * renders — see src/lib/faq.ts for why they must be one source.
 */
export function faqPageSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: faqAnswerText(item.a) },
    })),
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
