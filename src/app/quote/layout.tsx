import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

// The turnaround figure is carried by the homepage title (SITE_TAGLINE), which
// is the one that has to catch that search. This page's title stays on what is
// distinctive about the page itself.
const title = "Request a Quote — No Account Needed";
const description =
  "Get a price from TakomoCo within one business day and your part on a 72-hour typical turnaround. Upload an STL or just photograph the broken part and describe it — no sign-up, no password, and nothing built until you approve the price.";

/**
 * The page itself is a client component, so its metadata lives here in the
 * route layout — the same pattern used for every interactive public page.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/quote" },
  openGraph: {
    type: "website",
    url: "/quote",
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

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-quote"
        data={breadcrumbSchema([{ name: "Request a quote", path: "/quote" }])}
      />
      {children}
    </>
  );
}
