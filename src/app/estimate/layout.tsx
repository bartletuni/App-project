import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

// The turnaround figure is the homepage's selling point, not this page's — a
// visitor who has reached the form is already sold on the shop and is here to
// send a part. This page stays on what is distinctive about the page itself,
// and on the one timing promise it can actually make: how fast a price comes
// back.
const title = "Request an Estimate — No Account Needed";
const description =
  "Get an estimate from TakomoCo within one business day. Upload an STL or just photograph the broken part and describe it — no sign-up, no password, and nothing built until you approve the price.";

/**
 * The page itself is a client component, so its metadata lives here in the
 * route layout — the same pattern used for every interactive public page.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/estimate" },
  openGraph: {
    type: "website",
    url: "/estimate",
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

export default function EstimateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-estimate"
        data={breadcrumbSchema([{ name: "Request an estimate", path: "/estimate" }])}
      />
      {children}
    </>
  );
}
