import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { LEGAL_ROUTES } from "@/lib/legal";

/**
 * Served at /sitemap.xml. Public, indexable routes only — the authenticated
 * areas and /login are excluded to match their `noindex` metadata.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      // The public quote form: the one page a visitor with a broken part in
      // their hand is actually looking for.
      url: absoluteUrl("/quote"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified,
      // Admin-editable, so it turns over more often than the rest.
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/materials"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.7,
    },
    // The legal documents. Low priority but genuinely public: people do look
    // for a shop's terms before sending it a file.
    ...LEGAL_ROUTES.map((r) => ({
      url: absoluteUrl(r.href),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
