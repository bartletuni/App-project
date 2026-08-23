import type { Metadata } from "next";

import { getPricingContent } from "@/lib/pricing-store";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
import PricingView from "./PricingView";

// Rendered per request so admin edits to the rate sheet appear immediately,
// matching the no-store behaviour this page had when it fetched on the client.
export const dynamic = "force-dynamic";

const title = "Pricing — 3D Printing & Scanning Rate Sheet";
const description =
  "Transparent, standardized rates for TakomoCo's high-precision 3D printing, 0.02mm 3D scanning, and reverse engineering — with 24-hour express turnaround available for urgent Wasatch Front engineering deadlines.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    siteName: SITE_NAME,
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE.url],
  },
};

/**
 * Reads the rate sheet on the server so section titles, line items, and
 * prices are all in the initial HTML.
 *
 * `getPricingContent` already falls back to the built-in catalog when the
 * database is unreachable, so this page renders real content either way.
 */
export default async function PricingPage() {
  const content = await getPricingContent();

  const { diag } = content;

  return (
    <>
      {/*
        Provenance of this render, for diagnosing the customer page and the API
        disagreeing about the sheet. Hidden from readers and from assistive
        tech; readable with:
          curl -s https://<host>/pricing | grep -o 'data-pricing-diag="[^"]*"'
        Compare against the `diag` block in /api/pricing. Remove once the
        discrepancy is understood.
      */}
      <div
        hidden
        aria-hidden="true"
        data-pricing-diag={`source=${diag.source} newest=${diag.newestUpdatedAt} sections=${diag.sectionCount} readAt=${diag.readAt} isDefault=${content.isDefault}`}
      />
      <JsonLd
        id="ld-breadcrumb-pricing"
        data={breadcrumbSchema([{ name: "Pricing", path: "/pricing" }])}
      />
      <PricingView content={content} />
    </>
  );
}
