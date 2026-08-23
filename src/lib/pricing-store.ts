import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PRICING,
  SETTING_KEYS,
  type PricingContent,
  type PricingSettingsData,
} from "@/lib/pricing";

export interface PricingContentResult extends PricingContent {
  /** True when nothing has been saved yet (or the tables aren't reachable). */
  isDefault: boolean;
}

/**
 * Read the sheet from the database, falling back to the built-in catalog
 * when nothing has been saved yet — so /pricing renders before any admin
 * edit, and even before `prisma db push` has created the tables.
 */
export async function getPricingContent(): Promise<PricingContentResult> {
  try {
    const [sections, settingRows] = await Promise.all([
      prisma.pricingSection.findMany({
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.pricingSetting.findMany(),
    ]);

    if (sections.length === 0 && settingRows.length === 0) {
      return { ...DEFAULT_PRICING, isDefault: true };
    }

    const settings = { ...DEFAULT_PRICING.settings };
    for (const row of settingRows) {
      if ((SETTING_KEYS as string[]).includes(row.key)) {
        settings[row.key as keyof PricingSettingsData] = row.value;
      }
    }

    return {
      isDefault: false,
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
    return { ...DEFAULT_PRICING, isDefault: true };
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
