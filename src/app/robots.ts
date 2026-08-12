import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

/**
 * Served at /robots.txt.
 *
 * The private areas are already `noindex` in their route metadata; blocking
 * them here too keeps crawl budget on the pages that matter. Note the two
 * mechanisms are complementary, not redundant — a page disallowed here can
 * still be indexed from external links precisely because the crawler never
 * fetches it and so never sees the noindex tag. Both stay.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/admin/", "/dashboard", "/settings"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
