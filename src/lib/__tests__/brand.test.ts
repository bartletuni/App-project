import { CLAY, CREAM, DERIVED, EMBER, ESPRESSO, WORDMARK, rgb } from "@/lib/brand";
import tailwindConfig from "../../../tailwind.config";

describe("rgb", () => {
  it("parses a six-digit hex colour", () => {
    expect(rgb("#1c1611")).toEqual([28, 22, 17]);
  });

  it("accepts the shorthand and the bare forms", () => {
    expect(rgb("#abc")).toEqual([170, 187, 204]);
    expect(rgb("1c1611")).toEqual([28, 22, 17]);
  });

  it("is case-insensitive", () => {
    expect(rgb("#FBF6EE")).toEqual(rgb("#fbf6ee"));
  });

  it("covers the ends of the range", () => {
    expect(rgb("#000000")).toEqual([0, 0, 0]);
    expect(rgb("#ffffff")).toEqual([255, 255, 255]);
  });

  it("throws rather than quietly drawing black", () => {
    // A colour that fails here fails at build time. One that defaults to
    // black fails on a customer's printed report.
    expect(() => rgb("clay-400")).toThrow(/not a hex colour/);
    expect(() => rgb("#12345")).toThrow(/not a hex colour/);
    expect(() => rgb("#gggggg")).toThrow(/not a hex colour/);
    expect(() => rgb("")).toThrow(/not a hex colour/);
  });
});

describe("the palette", () => {
  // The whole point of brand.ts is that the PDF, the emails and the site
  // cannot end up on different browns. Tailwind is what the browser reads,
  // so it is the side that decides — if a shade is retuned there and not
  // here, this fails rather than letting the printed sheet drift.
  const tailwindColors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<
    string,
    Record<string, string>
  >;

  it.each([
    ["espresso", ESPRESSO],
    ["clay", CLAY],
    ["ember", EMBER],
    ["cream", CREAM],
  ])("matches tailwind.config.ts for %s", (name, scale) => {
    expect(tailwindColors[name]).toEqual(scale);
  });

  it("keeps the derived values as opaque hex", () => {
    // These two are produced with transparency in CSS. Neither a PDF fill nor
    // Outlook can composite, so they are pre-flattened — and must stay hex.
    expect(DERIVED.rule).toMatch(/^#[0-9a-f]{6}$/);
    expect(DERIVED.eyebrow).toMatch(/^#[0-9a-f]{6}$/);
    expect(() => rgb(DERIVED.rule)).not.toThrow();
  });

  it("exposes every shade as a parseable colour", () => {
    for (const scale of [ESPRESSO, CLAY, EMBER, CREAM]) {
      for (const value of Object.values(scale)) {
        expect(() => rgb(value)).not.toThrow();
      }
    }
  });
});

describe("the wordmark", () => {
  it("splits so each medium supplies its own separator", () => {
    // HTML uses U+2044; the PDF core fonts cannot, so the separator is
    // deliberately not shared. Neither half may carry one.
    expect(WORDMARK.head).toBe("TAKOMO");
    expect(WORDMARK.tail).toBe("CO");
    expect(WORDMARK.head + WORDMARK.tail).not.toMatch(/[/⁄]/);
  });

  it("stores the descriptor in title case for text-transform to handle", () => {
    expect(WORDMARK.descriptor).toBe("Additive Mfg · Utah");
  });
});
