import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

// The turnaround figure leads the title because it is what someone with a
// broken part actually searches for, and it is the site's standing lead time
// (see the homepage spec sheet). The quote itself comes back faster than the
// part does — one business day — which the page copy says right under the H1.
const title = "Request a Quote — 72-Hour Turnaround, No Account Needed";
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
