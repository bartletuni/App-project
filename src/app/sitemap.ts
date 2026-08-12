import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

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
  ];
}
