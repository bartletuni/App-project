import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

// Someone who searches for the shop's contact details is usually ready to
// talk now, and the ones in a hurry are the ones a call serves best — so the
// snippet says what to do in that case before anything else.
const title = "Contact — Call the Shop for Rush Jobs";
const description =
  "Need a part fast? Call TakomoCo at 385-695-4178 — rush jobs start with a call. Or email info@takomoco.com; we respond to inquiries within 24 business hours.";

/**
 * The page itself is a client component, so its metadata lives here in the
 * route layout — the same pattern used for every interactive public page.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: "/contact",
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

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-contact"
        data={breadcrumbSchema([{ name: "Contact", path: "/contact" }])}
      />
      {children}
    </>
  );
}
