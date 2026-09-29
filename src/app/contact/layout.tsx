import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

// Someone who searches for the shop's contact details is usually ready to
// get in touch now, and the ones in a hurry need to know what to do first —
// so the snippet says that before anything else.
const title = "Contact — Email the Shop for Rush Jobs";
const description =
  "Need a part fast? Email TakomoCo at info@takomoco.com — rush jobs start with an email, and we respond to inquiries within 24 business hours.";

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
