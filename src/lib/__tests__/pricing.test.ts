import {
  DEFAULT_PRICING,
  PRICING_LIMITS,
  sanitizePricingContent,
} from "@/lib/pricing";

describe("sanitizePricingContent", () => {
  it("accepts the built-in catalog unchanged", () => {
    expect(sanitizePricingContent(DEFAULT_PRICING)).toEqual(DEFAULT_PRICING);
  });

  it("rejects payloads that are not shaped like a pricing sheet", () => {
    expect(sanitizePricingContent(null)).toBeNull();
    expect(sanitizePricingContent("nope")).toBeNull();
    expect(sanitizePricingContent({ settings: {} })).toBeNull();
    expect(sanitizePricingContent({ settings: {}, sections: {} })).toBeNull();
    expect(sanitizePricingContent({ settings: {}, sections: [null] })).toBeNull();
    expect(
      sanitizePricingContent({ settings: { heroTitle: 42 }, sections: [] })
    ).toBeNull();
  });

  it("rejects oversized collections", () => {
    const section = { title: "Section", intro: "", items: [] };
    expect(
      sanitizePricingContent({
        settings: {},
        sections: new Array(PRICING_LIMITS.maxSections + 1).fill(section),
      })
    ).toBeNull();

    expect(
      sanitizePricingContent({
        settings: {},
        sections: [
          {
            title: "Section",
            items: new Array(PRICING_LIMITS.maxItemsPerSection + 1).fill({
              label: "Line",
            }),
          },
        ],
      })
    ).toBeNull();
  });

  it("trims and clamps strings, and fills missing settings from the defaults", () => {
    const result = sanitizePricingContent({
      settings: { heroTitle: `  ${"x".repeat(PRICING_LIMITS.setting + 50)}  ` },
      sections: [
        {
          title: "  Scanning  ",
          items: [{ label: "  Small scan  ", price: "  $75.00  " }],
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.settings.heroTitle).toHaveLength(PRICING_LIMITS.setting);
    // Untouched keys keep their default copy.
    expect(result!.settings.contactEmail).toBe(
      DEFAULT_PRICING.settings.contactEmail
    );
    expect(result!.sections[0].title).toBe("Scanning");
    expect(result!.sections[0].items[0]).toEqual({
      label: "Small scan",
      detail: "",
      price: "$75.00",
      note: "",
    });
  });

  it("drops untitled sections and unlabelled lines", () => {
    const result = sanitizePricingContent({
      settings: {},
      sections: [
        { title: "   ", items: [{ label: "orphan" }] },
        { title: "Printing", items: [{ label: "" }, { label: "Setup fee" }] },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.sections).toHaveLength(1);
    expect(result!.sections[0].items.map((i) => i.label)).toEqual(["Setup fee"]);
  });
});
