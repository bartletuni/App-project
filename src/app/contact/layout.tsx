import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

const title = "Contact — Talk to the Shop";
const description =
  "Get in touch with TakomoCo about a custom additive manufacturing order. Call 385-695-4178 or email info@takomoco.com — we respond to inquiries within 24 business hours.";

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
