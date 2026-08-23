import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PRICING,
  SETTING_KEYS,
  type PricingContent,
  type PricingSettingsData,
} from "@/lib/pricing";

/**
 * Provenance for one read of the sheet.
 *
 * The page and the API call the same reader, so these fields should always
 * agree between them. When they don't, this says why: a different `source`
 * means the two are on different databases, while a matching `source` with an
 * older `newestUpdatedAt` means one of them is seeing a stale snapshot.
 */
export interface PricingDiagnostics {
  /** Database host this read used, with any credentials stripped. */
  source: string;
  /** Newest section `updatedAt` this read saw; null when nothing was read. */
  newestUpdatedAt: string | null;
  sectionCount: number;
  /** When this read ran — proves whether the render is actually re-executing. */
  readAt: string;
}

export interface PricingContentResult extends PricingContent {
  /** True when nothing has been saved yet (or the tables aren't reachable). */
  isDefault: boolean;
  diag: PricingDiagnostics;
}

/** The database being read, without exposing credentials. */
function pricingSource(): string {
  const url =
    process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.split("?")[0];
  }
}

/**
 * Read the sheet from the database, falling back to the built-in catalog
 * when nothing has been saved yet — so /pricing renders before any admin
 * edit, and even before `prisma db push` has created the tables.
 */
export async function getPricingContent(): Promise<PricingContentResult> {
  const readAt = new Date().toISOString();
  const source = pricingSource();

  try {
    const [sections, settingRows] = await Promise.all([
      prisma.pricingSection.findMany({
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.pricingSetting.findMany(),
    ]);

    if (sections.length === 0 && settingRows.length === 0) {
      return {
        ...DEFAULT_PRICING,
        isDefault: true,
        diag: { source, newestUpdatedAt: null, sectionCount: 0, readAt },
      };
    }

    const newestUpdatedAt = sections.reduce<string | null>((newest, s) => {
      const stamp = s.updatedAt?.toISOString() ?? null;
      if (!stamp) return newest;
      return !newest || stamp > newest ? stamp : newest;
    }, null);

    const settings = { ...DEFAULT_PRICING.settings };
    for (const row of settingRows) {
      if ((SETTING_KEYS as string[]).includes(row.key)) {
        settings[row.key as keyof PricingSettingsData] = row.value;
      }
    }

    return {
      isDefault: false,
      diag: { source, newestUpdatedAt, sectionCount: sections.length, readAt },
      settings,
      sections: sections.map((s) => ({
        title: s.title,
        intro: s.intro || "",
        items: s.items.map((i) => ({
          label: i.label,
          detail: i.detail || "",
          price: i.price || "",
          note: i.note || "",
        })),
      })),
    };
  } catch (error) {
    console.error("Failed to load pricing content, serving defaults:", error);
    return {
      ...DEFAULT_PRICING,
      isDefault: true,
      diag: { source, newestUpdatedAt: null, sectionCount: 0, readAt },
    };
  }
}

/** Replace the whole sheet in one transaction. */
export async function savePricingContent(content: PricingContent): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.pricingItem.deleteMany();
    await tx.pricingSection.deleteMany();
    await tx.pricingSetting.deleteMany();

    for (let index = 0; index < content.sections.length; index++) {
      const section = content.sections[index];
      await tx.pricingSection.create({
        data: {
          title: section.title,
          intro: section.intro || null,
          sortOrder: index,
          items: {
            create: section.items.map((item, itemIndex) => ({
              label: item.label,
              detail: item.detail || null,
              price: item.price || null,
              note: item.note || null,
              sortOrder: itemIndex,
            })),
          },
        },
      });
    }

    for (const key of SETTING_KEYS) {
      await tx.pricingSetting.create({
        data: { key, value: content.settings[key] },
      });
    }
  });
}
