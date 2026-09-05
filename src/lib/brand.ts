/**
 * The TakomoCo palette, resolved to plain hex — the one place a brand colour
 * is written down outside `tailwind.config.ts`.
 *
 * Tailwind's config is the source for anything rendered by the browser, but a
 * PDF and an HTML email never see a stylesheet: both need literal values, and
 * jsPDF needs them as RGB triples. Rather than let each medium keep its own
 * copy of the same eight browns, they all read the scale from here.
 *
 * What lives here is the *scale* — `espresso.900`, `clay.400` — exactly as
 * `tailwind.config.ts` defines it. What does not live here is any decision
 * about which shade plays which part: a dark email and a light printed sheet
 * use the same palette for opposite jobs, so each medium keeps its own role
 * map (`C` in `email-templates.ts`, `INK` in `report-pdf.ts`) built on top of
 * this. Adding "the background colour" here would only be right for one of
 * them.
 */

/** Warm dark grounds. */
export const ESPRESSO = {
  950: "#15100c",
  900: "#1c1611",
  800: "#241d17",
  700: "#2c241d",
  600: "#382d24",
  500: "#4a3d31",
} as const;

/** The clay accent — links, rules, the slash in the wordmark. */
export const CLAY = {
  50: "#f8efe7",
  200: "#e3be9a",
  300: "#d9a87f",
  400: "#cf8f5f",
  500: "#c17a4b",
  600: "#a9663c",
  700: "#8a5230",
} as const;

/** The brighter accent, used sparingly for emphasis. */
export const EMBER = {
  300: "#f0c08a",
  400: "#e6a85f",
  500: "#d98e3d",
} as const;

/** Paper and type. */
export const CREAM = {
  100: "#fbf6ee",
  200: "#f4ecdf",
  300: "#e7dccb",
  400: "#d2c4ab",
  500: "#b6a589",
  600: "#9a886c",
} as const;

/**
 * Two values the site produces with transparency, flattened to opaque hex.
 *
 * CSS can lay clay over espresso at 16% and let the compositor sort it out;
 * neither Outlook nor a PDF fill can, so the result is computed once here.
 * `rule` is that hairline over an espresso ground, `eyebrow` is the exact
 * colour `.eyebrow` resolves to in `globals.css`.
 */
export const DERIVED = {
  rule: "#3a2c22",
  eyebrow: "#e0a877",
} as const;

/**
 * Hex to the `[r, g, b]` triple jsPDF and jspdf-autotable take.
 *
 * Accepts `#rgb` or `#rrggbb`, with or without the hash, because a value
 * copied out of the Tailwind config and one typed by hand should not behave
 * differently. Throws on anything else rather than silently drawing black —
 * a colour that fails at build time is cheaper than one that fails on a
 * customer's printed report.
 */
export function rgb(hex: string): [number, number, number] {
  const raw = hex.replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`brand.rgb: "${hex}" is not a hex colour`);
  }

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * The wordmark, in the two pieces it is drawn in.
 *
 * Every masthead sets it as `TAKOMO⁄CO` — cream letters either side of a clay
 * separator — so splitting it here keeps that two-colour treatment identical
 * wherever it appears, without each medium spelling out the letters again.
 *
 * The separator itself is deliberately *not* here, because it is the one part
 * that legitimately differs: HTML can use the U+2044 fraction slash the site
 * uses, while a PDF drawn with the core fonts is limited to their standard
 * encoding and must fall back to an ASCII solidus. A character outside that
 * encoding does not degrade — it prints as the wrong glyph, or as nothing.
 *
 * `descriptor` is stored in title case and uppercased by whichever medium
 * displays it, since CSS does that with `text-transform` and a PDF cannot.
 */
export const WORDMARK = {
  head: "TAKOMO",
  tail: "CO",
  /** The line that sits opposite the wordmark on a masthead. */
  descriptor: "Additive Mfg · Utah",
} as const;
