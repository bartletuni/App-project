import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { LEGAL_LAST_UPDATED, LEGAL_ROUTES } from "@/lib/legal";

/**
 * Served at /sitemap.xml. Public, indexable routes only — the authenticated
 * areas and /login are excluded to match their `noindex` metadata.
 *
 * `lastModified` is given only where it is true. Stamping every URL with the
 * time of the request tells a crawler that everything changed on every fetch,
 * and Google stops trusting a sitemap's dates once they prove unreliable. The
 * legal documents carry the date they last changed; the rest carry none.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const legalUpdated = new Date(LEGAL_LAST_UPDATED);

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      // The page for the shop's main customer — someone who needs a part fast
      // and is choosing a shop today. Listed straight after the homepage so a
      // crawler meets it early.
      url: absoluteUrl("/rush-3d-printing"),
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      // The public estimate form: the one page a visitor with a broken part in
      // their hand is actually looking for.
      url: absoluteUrl("/estimate"),
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      // Where outreach to repair and service companies points, and what
      // someone searching for a discontinued part should land on.
      url: absoluteUrl("/replacement-parts"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/pricing"),
      // Admin-editable, so it turns over more often than the rest.
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/materials"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    // The legal documents. Low priority but genuinely public: people do look
    // for a shop's terms before sending it a file.
    ...LEGAL_ROUTES.map((r) => ({
      url: absoluteUrl(r.href),
      lastModified: legalUpdated,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
