import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
import MaterialsView, { type MaterialSummary } from "./MaterialsView";

// Rendered per request so admin edits to the stock index appear immediately,
// matching the no-store behaviour this page had when it fetched on the client.
export const dynamic = "force-dynamic";

const title = "Materials — Engineering-Grade Filament Stock";
const description =
  "The TakomoCo stock room: high-performance thermoplastics including carbon-fiber nylons, PPA-CF, PPS-CF/GF, polycarbonate, ASA, PETG, and TPU — with tensile, stiffness, HDT, and impact figures for each.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/materials" },
  openGraph: {
    type: "website",
    url: "/materials",
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
 * Reads the stock index on the server so the material names, descriptions,
 * and property figures are all present in the initial HTML.
 *
 * A database outage degrades to the page's existing empty state rather than
 * a 500 — a broken render would be a worse signal to a crawler than a thin
 * but valid page.
 */
async function getMaterials(): Promise<MaterialSummary[]> {
  try {
    return await prisma.material.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        imageId: true,
        tensileStrength: true,
        stiffness: true,
        hdt: true,
        impactResistance: true,
      },
    });
  } catch {
    return [];
  }
}

export default async function MaterialsPage() {
  const materials = await getMaterials();

  return (
    <>
      <JsonLd
        id="ld-breadcrumb-materials"
        data={breadcrumbSchema([{ name: "Materials", path: "/materials" }])}
      />
      <MaterialsView materials={materials} />
    </>
  );
}
