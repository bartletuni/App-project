import {
  REPORT_COLUMNS,
  buildReportPdf,
  reportFileName,
  reportRow,
  watermarkStrata,
  type ReportRequest,
} from "@/lib/report-pdf";
import { CLAY, CREAM, ESPRESSO, MARK, rgb } from "@/lib/brand";

const ACCOUNT_REQUEST = {
  createdAt: "2026-01-06T17:30:00.000Z",
  dateNeeded: "2026-01-26T17:30:00.000Z",
  material: "PLA Carbon Fiber",
  quantity: 12,
  status: "IN_PROGRESS",
  quotedPrice: "$450.00",
  invoiceNumber: "INV-1042",
  fileName: "bracket-rev3.stl",
  user: { name: "Morgan Reyes", email: "morgan@acmefab.example" },
  phoneNumber: { number: "385-555-0177" },
} as unknown as ReportRequest;

const GUEST_REQUEST = {
  createdAt: "2026-01-07T17:30:00.000Z",
  dateNeeded: "2026-01-27T17:30:00.000Z",
  material: null,
  quantity: 1,
  status: "QUOTE_REQUESTED",
  quotedPrice: null,
  invoiceNumber: null,
  quoteRequested: true,
  description: "Conveyor idler, discontinued",
  guestName: "Dana Whitfield",
  guestEmail: "dana@fieldservice.example",
  guestPhone: "801-555-0142",
  user: null,
  phoneNumber: null,
} as unknown as ReportRequest;

describe("reportRow", () => {
  it("produces exactly one cell per column", () => {
    expect(reportRow(ACCOUNT_REQUEST)).toHaveLength(REPORT_COLUMNS.length);
    expect(reportRow(GUEST_REQUEST)).toHaveLength(REPORT_COLUMNS.length);
  });

  it("reads an account holder's contact off their account", () => {
    const row = reportRow(ACCOUNT_REQUEST);
    expect(row[1]).toBe("Morgan Reyes");
    expect(row[2]).toBe("morgan@acmefab.example");
    expect(row[3]).toBe("385-555-0177");
  });

  it("reads a no-account quote's contact off the request itself", () => {
    // The row is filed under the system owner, so the account on it is not
    // the person who wrote in. The report has to show the sender.
    const row = reportRow(GUEST_REQUEST);
    expect(row[1]).toBe("Dana Whitfield");
    expect(row[2]).toBe("dana@fieldservice.example");
    expect(row[3]).toBe("801-555-0142");
    expect(row).not.toContain("no-account@quotes.invalid");
  });

  it("falls back to N/A rather than blank cells", () => {
    const row = reportRow(GUEST_REQUEST);
    expect(row[5]).toBe("N/A"); // material
    expect(row[9]).toBe("N/A"); // quoted
    expect(row[10]).toBe("N/A"); // invoice
  });

  it("marks the quote track separately from a build", () => {
    expect(reportRow(GUEST_REQUEST)[7]).toBe("Quote");
    expect(reportRow(ACCOUNT_REQUEST)[7]).toBe("Request");
  });

  it("renders a zero quantity rather than dropping it", () => {
    const row = reportRow({ ...ACCOUNT_REQUEST, quantity: 0 } as ReportRequest);
    expect(row[6]).toBe("0");
  });
});

describe("reportFileName", () => {
  it("keeps the sortable name admins already file by", () => {
    expect(reportFileName(new Date(2026, 0, 1), new Date(2026, 1, 28))).toBe(
      "TakomoCo_Report_20260101_20260228.pdf"
    );
  });
});

describe("buildReportPdf", () => {
  const build = (count: number) =>
    buildReportPdf({
      requests: Array.from({ length: count }, () => GUEST_REQUEST),
      start: new Date(2026, 0, 1),
      end: new Date(2026, 1, 28),
      generatedAt: new Date(2026, 1, 28, 14, 32),
    });

  /** The raw PDF, as latin-1 text. jsPDF leaves content streams uncompressed. */
  const raw = (doc: ReturnType<typeof build>) =>
    Buffer.from(doc.output("arraybuffer")).toString("latin1");

  it("names the document for the shop, not for jsPDF", () => {
    const pdf = raw(build(3));
    expect(pdf).toContain("/Author (TakomoCo)");
    expect(pdf).toContain("/Creator (TakomoCo console)");
    expect(pdf).toContain("/Subject (Request history report)");

    // The title carries an em dash, so jsPDF writes that one entry as
    // UTF-16BE rather than as a plain literal string.
    const utf16be = (s: string) => Buffer.from(s, "utf16le").swap16().toString("latin1");
    expect(pdf).toContain(utf16be("TakomoCo Request History"));
  });

  it("mastheads and foots every page, not just the first", () => {
    const doc = build(120);
    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThan(1);

    const pdf = raw(doc);
    // A page separated from the set still has to say where it came from.
    expect(pdf.match(/\(TAKOMO\) Tj/g)).toHaveLength(pageCount);
    expect(pdf.match(/\(info@takomoco\.com/g)).toHaveLength(pageCount);
    for (let page = 1; page <= pageCount; page += 1) {
      expect(pdf).toContain(`(PAGE ${page} / ${pageCount}) Tj`);
    }
  });

  it("sets the title block once, on the first page", () => {
    const pdf = raw(build(120));
    expect(pdf.match(/\(CONSOLE \/ REPORTS\) Tj/g)).toHaveLength(1);
    expect(pdf.match(/\(history\) Tj/g)).toHaveLength(1);
    expect(pdf).toContain("(120 requests) Tj");
  });

  it("counts a single record in the singular", () => {
    expect(raw(build(1))).toContain("(1 request) Tj");
  });

  it("uses the three core fonts the site's three faces map onto", () => {
    // No font is embedded: a real face would be several hundred kilobytes
    // shipped into an admin page's bundle to be seen only after download.
    const pdf = raw(build(3));
    expect(pdf).toContain("/BaseFont /Times-Roman");
    expect(pdf).toContain("/BaseFont /Helvetica");
    expect(pdf).toContain("/BaseFont /Courier");
    expect(pdf).toContain("/Encoding /WinAnsiEncoding");
  });

  it("draws the middle dot from the encoding the fonts declare", () => {
    // WinAnsi 0xB7. Anything outside the standard encoding does not fall
    // back — it prints as the wrong glyph, or as nothing.
    expect(raw(build(3))).toContain("ADDITIVE MFG \xb7 UTAH");
  });

  it("grounds every page in cream, edge to edge", () => {
    // Without this the sheet is the PDF default — white — and the table
    // reads as a cream slab dropped onto a white page.
    const doc = build(120);
    const pdf = raw(doc);

    // A4 landscape in points, as jsPDF writes the rect for a mm document.
    const fullPage = Array.from(
      pdf.matchAll(/[-\d.]+ [-\d.]+ ([\d.]+) (-[\d.]+) re/g)
    ).filter(
      (m) => Math.abs(Number(m[1]) - 841.89) < 1 && Math.abs(Number(m[2]) + 595.28) < 1
    );

    expect(fullPage).toHaveLength(doc.getNumberOfPages());
  });

  it("paints the sheet in brand colours", () => {
    const pdf = raw(build(3));

    // Fill operands are compared numerically: jsPDF rounds them differently
    // depending on which code path set the colour, so matching the emitted
    // text would pin the test to a formatting detail rather than the colour.
    const fills = Array.from(pdf.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)).map((m) =>
      m.slice(1, 4).map(Number)
    );
    const paintedWith = (hex: string) =>
      fills.some((fill) =>
        fill.every((channel, i) => Math.abs(channel - rgb(hex)[i] / 255) < 0.01)
      );

    expect(paintedWith(ESPRESSO[950])).toBe(true); // the masthead band
    expect(paintedWith(CLAY[600])).toBe(true); // the rule beneath it
    expect(paintedWith(ESPRESSO[800])).toBe(true); // the table header
    expect(paintedWith(CREAM[100])).toBe(true); // the paper
    expect(paintedWith(CREAM[200])).toBe(true); // its zebra rows

    // And nothing left of the stock template it replaced.
    expect(paintedWith("#4f46e5")).toBe(false); // indigo-600
  });
});

describe("the watermark", () => {
  const strata = watermarkStrata();

  // Landscape A4, matching the document the module builds.
  const PAGE = { width: 297, height: 210 };
  const BAND_BOTTOM = 20.5; // masthead band plus its clay rule
  const FOOTER_RULE = 195;

  it("draws every stratum of the mark", () => {
    expect(strata).toHaveLength(MARK.strata.length);
    expect(strata).toHaveLength(19);
  });

  it("clears the masthead and the footer on every page", () => {
    // The mark is laid over the table, not over the furniture that has to
    // stay legible at a glance.
    for (const s of strata) {
      expect(s.y).toBeGreaterThanOrEqual(BAND_BOTTOM);
      expect(s.y + s.h).toBeLessThanOrEqual(FOOTER_RULE);
    }
  });

  it("stays inside the sheet, centred", () => {
    const left = Math.min(...strata.map((s) => s.x));
    const right = Math.max(...strata.map((s) => s.x + s.w));
    expect(left).toBeGreaterThan(0);
    expect(right).toBeLessThan(PAGE.width);
    // Equal margins either side, to within rounding on the traced geometry.
    expect(left).toBeCloseTo(PAGE.width - right, 1);
  });

  it("keeps the mark's proportions", () => {
    const left = Math.min(...strata.map((s) => s.x));
    const right = Math.max(...strata.map((s) => s.x + s.w));
    const top = Math.min(...strata.map((s) => s.y));
    const bottom = Math.max(...strata.map((s) => s.y + s.h));
    expect((right - left) / (bottom - top)).toBeCloseTo(MARK.aspect, 2);
  });

  it("stays faint, and fades the way the mark does", () => {
    const opacities = strata.map((s) => s.opacity);
    for (const o of opacities) {
      expect(o).toBeGreaterThan(0);
      expect(o).toBeLessThanOrEqual(0.07);
    }
    // The original runs pale at the top to dark at the foot; a flat
    // silhouette of it would just be a letter T.
    expect(opacities[0]).toBeLessThan(opacities[opacities.length - 1]);
  });

  it("reaches the page as transparency, once per page", () => {
    const doc = buildReportPdf({
      requests: Array.from({ length: 120 }, () => GUEST_REQUEST),
      start: new Date(2026, 0, 1),
      end: new Date(2026, 1, 28),
    });
    const pdf = Buffer.from(doc.output("arraybuffer")).toString("latin1");

    expect(pdf).toContain("/ExtGState");

    // jsPDF writes the alpha at two decimals, so assert the property rather
    // than the exact literals: every weight in the file is faint, and more
    // than one of them exists — which is the gradient surviving.
    const alphas = Array.from(pdf.matchAll(/\/ca ([\d.]+)/g)).map((m) => Number(m[1]));
    expect(alphas.length).toBeGreaterThan(0);
    for (const alpha of alphas) {
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThanOrEqual(0.07);
    }
    expect(new Set(alphas).size).toBeGreaterThanOrEqual(3);

    // And the state is restored, or the masthead drawn next would inherit it.
    expect(pdf.match(/\bQ\b/g)?.length).toBeGreaterThanOrEqual(doc.getNumberOfPages());
  });
});

describe("legibility on paper", () => {
  // A report is printed, marked up and photocopied. Every pairing the sheet
  // actually uses is checked against WCAG AA for small text (4.5:1) so a
  // future palette tweak cannot quietly make a column unreadable.
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  const luminance = (hex: string) => {
    const [r, g, b] = rgb(hex);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each([
    ["body copy on paper", ESPRESSO[900], CREAM[100]],
    ["body copy on a zebra row", ESPRESSO[900], CREAM[200]],
    ["labels and footers on paper", ESPRESSO[500], CREAM[100]],
    ["the clay accent on paper", CLAY[700], CREAM[100]],
    ["table headers on their fill", CREAM[200], ESPRESSO[800]],
    ["the wordmark on the band", CREAM[100], ESPRESSO[950]],
    ["the descriptor on the band", CREAM[600], ESPRESSO[950]],
  ])("%s clears 4.5:1", (_label, ink, ground) => {
    expect(contrast(ink, ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("would fail if the accent were used at its lighter web value", () => {
    // clay-400 reads well on espresso and fails on cream — which is exactly
    // why the printed sheet deepens it rather than reusing the site's value.
    expect(contrast(CLAY[400], CREAM[100])).toBeLessThan(4.5);
  });

  describe("with the watermark laid over it", () => {
    // The mark is drawn on top of the table, so every pairing beneath it is
    // seen through a wash of clay. This is what stops the watermark from
    // being quietly turned up until the report is hard to read.
    const heaviest = Math.max(...watermarkStrata().map((s) => s.opacity));

    const washed = (hex: string) => {
      const [r, g, b] = rgb(hex);
      const [wr, wg, wb] = rgb(CLAY[700]);
      const mix = (base: number, over: number) =>
        Math.round(base * (1 - heaviest) + over * heaviest);
      return `#${[mix(r, wr), mix(g, wg), mix(b, wb)]
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("")}`;
    };

    it.each([
      ["body copy on paper", ESPRESSO[900], CREAM[100]],
      ["body copy on a zebra row", ESPRESSO[900], CREAM[200]],
      ["labels on paper", ESPRESSO[500], CREAM[100]],
    ])("%s still clears 4.5:1", (_label, ink, ground) => {
      expect(contrast(washed(ink), washed(ground))).toBeGreaterThanOrEqual(4.5);
    });
  });
});
