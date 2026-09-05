import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { CLAY, CREAM, ESPRESSO, MARK, WORDMARK, rgb } from "@/lib/brand";
import { BUSINESS, SITE_URL } from "@/lib/seo";
import { requestTitle } from "@/lib/part-source";
import { isQuote } from "@/lib/request-status";
import { requestContact } from "@/lib/guest-quote";

/**
 * The request-history report, in the shop's own voice.
 *
 * The console is a warm dark spec sheet, but a report is a printed working
 * document — an admin puts it in front of a customer, marks it up, files it.
 * Reversing the palette rather than reproducing it is the point: the same
 * espresso, clay and cream, with cream as the paper and espresso as the ink,
 * so the sheet reads as the console's output without costing a full ink
 * cartridge or turning grey in a photocopier. The masthead band is the one
 * place the dark ground survives, because that is what makes the page
 * recognisable at arm's length.
 *
 * TYPE — the site sets a display serif for headings, a sans for body copy and
 * a letterspaced monospace for index labels. Those three map cleanly onto the
 * three PDF core fonts (times / helvetica / courier), so the sheet keeps the
 * site's typographic structure without embedding a single font file. That
 * matters more than an exact match: a real face would be several hundred
 * kilobytes shipped into the browser bundle of an admin page, to be seen only
 * after the file is already downloaded.
 *
 * Every colour comes from `brand.ts`, so this cannot drift away from the site
 * or the emails.
 */

// ---------------------------------------------------------------------------
// Role map — which shade does what on paper. The inverse of the email's.
// ---------------------------------------------------------------------------

const INK = {
  /** The sheet itself. */
  paper: CREAM[100],
  /** Alternating table rows, one step down from the paper. */
  paperAlt: CREAM[200],
  /** Hairlines and table grid. */
  rule: CREAM[300],

  /** The masthead band and the table header. */
  band: ESPRESSO[950],
  bandHead: ESPRESSO[800],
  /** Type on the band. */
  onBand: CREAM[100],
  onBandMuted: CREAM[600],
  onBandHead: CREAM[200],

  /** Body copy and headings. */
  body: ESPRESSO[900],
  /** Labels, footers, anything secondary. Checked for contrast on cream. */
  label: ESPRESSO[500],
  /** The accent, deepened so it still passes contrast on a light ground. */
  accent: CLAY[700],
  /** Decoration only — the rule under the masthead. */
  accentRule: CLAY[600],
} as const;

const DISPLAY = "times";
const SANS = "helvetica";
const MONO = "courier";

// ---------------------------------------------------------------------------
// Sheet geometry, in millimetres — jsPDF's default unit. Landscape A4.
// ---------------------------------------------------------------------------

const PAGE = { width: 297, height: 210 } as const;
const MARGIN = 14;
const BAND_HEIGHT = 20;
/** Where the table starts on the first page, below the title block. */
const TABLE_TOP = 68;
/** Where the table may start on pages after the first, clear of the band. */
const CONTINUATION_TOP = 28;
/** Reserved at the foot of every page for the rule and the footer line. */
const FOOTER_RESERVE = 18;

/**
 * The watermark: how tall the mark stands, and how strongly it prints.
 *
 * `MAX_OPACITY` applies to the darkest stratum and is the number to touch if
 * it wants to be fainter or firmer. It is deliberately low — a watermark that
 * competes with the data has stopped being stationery and started being
 * noise — and a test holds the sheet to WCAG AA *with the mark laid over the
 * text*, so this cannot be raised to the point of costing legibility.
 */
const WATERMARK = { height: 105, maxOpacity: 0.07, minOpacityFactor: 0.5 } as const;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Only the fields the report reads. The API returns a good deal more. */
export interface ReportRequest {
  createdAt: string | Date;
  dateNeeded: string | Date;
  material?: string | null;
  quantity: number;
  status: string;
  quotedPrice?: string | number | null;
  invoiceNumber?: string | null;
  [key: string]: unknown;
}

/**
 * The columns, in order. Kept as data so the header row and the cell order
 * cannot fall out of step the way two parallel literals eventually do.
 */
export const REPORT_COLUMNS = [
  "Date Submitted",
  "Customer Name",
  "User Email",
  "Phone",
  "File Name",
  "Material",
  "Quantity",
  "Type",
  "Status",
  "Quoted",
  "Invoice #",
  "Date Needed",
] as const;

/** One request as its row of cells. */
export function reportRow(req: ReportRequest): string[] {
  // A no-account quote is filed under a system row, so the report reads the
  // contact the sender actually gave rather than the account that owns it.
  const contact = requestContact(req as never);

  return [
    format(new Date(req.createdAt), "MM/dd/yyyy"),
    contact.name,
    contact.email,
    contact.phone,
    requestTitle(req as never),
    req.material || "N/A",
    String(req.quantity),
    isQuote(req as never) ? "Quote" : "Request",
    req.status,
    req.quotedPrice ? String(req.quotedPrice) : "N/A",
    req.invoiceNumber || "N/A",
    format(new Date(req.dateNeeded), "MM/dd/yyyy"),
  ];
}

/** `TakomoCo_Report_20260101_20260131.pdf` — unchanged, admins sort by it. */
export function reportFileName(start: Date, end: Date): string {
  return `TakomoCo_Report_${format(start, "yyyyMMdd")}_${format(end, "yyyyMMdd")}.pdf`;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/**
 * Width of a run of text including letterspacing.
 *
 * `getTextWidth` measures the glyphs only, so anything drawn with `charSpace`
 * and then positioned from its right edge lands short without this.
 */
function trackedWidth(doc: jsPDF, text: string, charSpace: number): number {
  return doc.getTextWidth(text) + charSpace * text.length;
}

/**
 * The dark band across the head of every page: wordmark left, descriptor
 * right, clay hairline beneath. This is the whole of the brand's presence on
 * an otherwise light sheet, which is why it repeats rather than sitting on
 * page one alone — a page that gets separated from the set still says where
 * it came from.
 */
function drawMasthead(doc: jsPDF): void {
  doc.setFillColor(...rgb(INK.band));
  doc.rect(0, 0, PAGE.width, BAND_HEIGHT, "F");

  // The clay rule the site puts under a section head.
  doc.setFillColor(...rgb(INK.accentRule));
  doc.rect(0, BAND_HEIGHT, PAGE.width, 0.5, "F");

  const track = 0.7;
  doc.setFont(MONO, "bold");
  doc.setFontSize(13);

  let x = MARGIN;
  const baseline = 13;

  doc.setTextColor(...rgb(INK.onBand));
  doc.text(WORDMARK.head, x, baseline, { charSpace: track });
  x += trackedWidth(doc, WORDMARK.head, track);

  // The clay separator, the one coloured character in the wordmark.
  doc.setTextColor(...rgb(CLAY[400]));
  doc.text("/", x, baseline, { charSpace: track });
  x += trackedWidth(doc, "/", track);

  doc.setTextColor(...rgb(INK.onBand));
  doc.text(WORDMARK.tail, x, baseline, { charSpace: track });

  // Uppercased here because a PDF has no `text-transform`.
  const descriptor = WORDMARK.descriptor.toUpperCase();
  const descriptorTrack = 0.35;
  doc.setFont(MONO, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...rgb(INK.onBandMuted));
  doc.text(
    descriptor,
    PAGE.width - MARGIN - trackedWidth(doc, descriptor, descriptorTrack),
    baseline - 0.5,
    { charSpace: descriptorTrack }
  );
}

/**
 * Where each stratum of the watermark lands on the page, and how strongly.
 *
 * Pure, and exported, so the placement can be checked without rendering:
 * the mark has to clear the masthead band above it and the footer rule below
 * it on every page, and it has to stay faint.
 */
export function watermarkStrata(): {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}[] {
  const height = WATERMARK.height;
  const width = height * MARK.aspect;

  // Centred on the table rather than on the paper. Sitting behind data is
  // what makes it read as stationery; the same mark floating in the empty
  // run above the table on page one reads as a printing artefact instead.
  const bodyBottom = PAGE.height - FOOTER_RESERVE;
  const left = (PAGE.width - width) / 2;
  const top = TABLE_TOP + (bodyBottom - TABLE_TOP - height) / 2;

  const { maxOpacity, minOpacityFactor } = WATERMARK;

  return MARK.strata.map(([x, y, w, h, tone]) => ({
    x: left + x * width,
    y: top + y * height,
    w: w * width,
    h: h * height,
    // The original's fade, carried across to a single hue as weight.
    opacity: maxOpacity * (minOpacityFactor + (1 - minOpacityFactor) * tone),
  }));
}

/**
 * The mark, laid faintly across the page.
 *
 * Drawn after the table rather than under it: the table paints opaque cream
 * and zebra fills, so anything beneath it would simply be covered. On top at
 * these weights it tints the rows without touching their readability.
 */
function drawWatermark(doc: jsPDF): void {
  doc.saveGraphicsState();
  doc.setFillColor(...rgb(CLAY[700]));

  // One graphics state per distinct weight, shared across the strata that
  // use it, rather than nineteen near-identical ones per page. Rounded to
  // the two decimals jsPDF writes `/ca` at, so the states we build and the
  // ones that reach the file are the same set.
  const states = new Map<number, GState>();

  for (const stratum of watermarkStrata()) {
    const key = Math.round(stratum.opacity * 100) / 100;
    let state = states.get(key);
    if (!state) {
      state = new GState({ opacity: key });
      states.set(key, state);
    }
    doc.setGState(state);
    doc.rect(stratum.x, stratum.y, stratum.w, stratum.h, "F");
  }

  // Without this the masthead and footer would inherit the last weight.
  doc.restoreGraphicsState();
}

/** A monospace index label — the site's `.eyebrow`. */
function drawEyebrow(doc: jsPDF, text: string, x: number, y: number): void {
  doc.setFont(MONO, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...rgb(INK.accent));
  doc.text(text.toUpperCase(), x, y, { charSpace: 0.45 });
}

/**
 * One spec-sheet field: a small mono label with its value beneath, the same
 * pairing the console uses down the side of a request.
 */
function drawField(doc: jsPDF, label: string, value: string, x: number, y: number): void {
  doc.setFont(MONO, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...rgb(INK.label));
  doc.text(label.toUpperCase(), x, y, { charSpace: 0.3 });

  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...rgb(INK.body));
  doc.text(value, x, y + 5.5);
}

/**
 * The cream ground, edge to edge.
 *
 * Without this the sheet is whatever the PDF defaults to — white — and the
 * table reads as a cream slab dropped onto a white page, with the seam
 * visible at the title block. Cream is the paper here, so it is painted as
 * the paper. The flood is a 4% tint rather than the console's near-black
 * ground, which is the whole reason the palette was inverted for print: the
 * ink argument that rules out espresso does not carry over to this.
 */
function drawGround(doc: jsPDF): void {
  doc.setFillColor(...rgb(INK.paper));
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
}

/** A hairline the width of the text column. */
function drawRule(doc: jsPDF, y: number): void {
  doc.setFillColor(...rgb(INK.rule));
  doc.rect(MARGIN, y, PAGE.width - MARGIN * 2, 0.3, "F");
}

/**
 * The title block, page one only: what this sheet is, over what period, and
 * how much of it there is. Set like a page heading on the site — a mono
 * eyebrow, then a display serif line whose second half falls into clay italic.
 */
function drawTitleBlock(
  doc: jsPDF,
  opts: { start: Date; end: Date; generatedAt: Date; recordCount: number }
): void {
  drawEyebrow(doc, "Console / Reports", MARGIN, 32);

  doc.setFontSize(24);
  doc.setFont(DISPLAY, "normal");
  doc.setTextColor(...rgb(INK.body));
  doc.text("Request ", MARGIN, 43);
  const headWidth = doc.getTextWidth("Request ");

  doc.setFont(DISPLAY, "italic");
  doc.setTextColor(...rgb(INK.accent));
  doc.text("history", MARGIN + headWidth, 43);

  const range = `${format(opts.start, "MMM d, yyyy")} — ${format(opts.end, "MMM d, yyyy")}`;
  drawField(doc, "Date range", range, MARGIN, 53);
  drawField(doc, "Generated", format(opts.generatedAt, "MMM d, yyyy h:mm a"), 150, 53);
  drawField(
    doc,
    "Records",
    `${opts.recordCount} ${opts.recordCount === 1 ? "request" : "requests"}`,
    232,
    53
  );

  drawRule(doc, 63);
}

/**
 * The footer line, on every page. Drawn in a pass after the table because the
 * page count is not known while the table is still being laid out.
 */
function drawFooter(doc: jsPDF, page: number, pageCount: number): void {
  const y = PAGE.height - 10;
  drawRule(doc, y - 5);

  const contact = [
    BUSINESS.email,
    BUSINESS.telephone.replace(/^\+1-/, ""),
    SITE_URL.replace(/^https?:\/\//, ""),
  ].join("  ·  ");

  doc.setFont(MONO, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...rgb(INK.label));
  doc.text(contact, MARGIN, y);

  const pageLabel = `PAGE ${page} / ${pageCount}`;
  doc.text(pageLabel, PAGE.width - MARGIN - doc.getTextWidth(pageLabel), y);
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/**
 * Builds the report. Returns the document rather than saving it, so the
 * caller decides what to do with it and this stays testable off a browser.
 */
export function buildReportPdf(opts: {
  requests: ReportRequest[];
  start: Date;
  end: Date;
  /** Injectable so a test does not depend on the clock. */
  generatedAt?: Date;
}): jsPDF {
  const generatedAt = opts.generatedAt ?? new Date();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setProperties({
    title: `TakomoCo Request History — ${format(opts.start, "MMM d, yyyy")} to ${format(
      opts.end,
      "MMM d, yyyy"
    )}`,
    subject: "Request history report",
    author: "TakomoCo",
    creator: "TakomoCo console",
  });

  // Page one's ground goes down before anything is drawn on it. Later pages
  // do not exist yet, so they are handled by the table's own page hook.
  drawGround(doc);

  drawTitleBlock(doc, {
    start: opts.start,
    end: opts.end,
    generatedAt,
    recordCount: opts.requests.length,
  });

  const mono = { font: MONO, fontSize: 6.5 } as const;

  autoTable(doc, {
    head: [REPORT_COLUMNS.map((c) => c.toUpperCase())],
    body: opts.requests.map(reportRow),
    startY: TABLE_TOP,
    margin: {
      top: CONTINUATION_TOP,
      bottom: FOOTER_RESERVE,
      left: MARGIN,
      right: MARGIN,
    },
    theme: "grid",
    styles: {
      font: SANS,
      fontSize: 7.5,
      textColor: rgb(INK.body),
      fillColor: rgb(INK.paper),
      lineColor: rgb(INK.rule),
      lineWidth: 0.1,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.8, right: 1.8 },
      overflow: "linebreak",
    },
    headStyles: {
      font: SANS,
      fontStyle: "bold",
      fontSize: 7,
      fillColor: rgb(INK.bandHead),
      textColor: rgb(INK.onBandHead),
      lineColor: rgb(ESPRESSO[600]),
      cellPadding: { top: 2.6, bottom: 2.6, left: 1.8, right: 1.8 },
    },
    alternateRowStyles: { fillColor: rgb(INK.paperAlt) },
    // Fires as each continuation page is created, before its rows are drawn,
    // which is the only point at which those pages can be grounded.
    willDrawPage: (data) => {
      if (data.pageNumber > 1) drawGround(doc);
    },
    columnStyles: {
      // Dates, type and status echo the site's monospace index labels.
      0: { ...mono, cellWidth: 19 },
      // Wide enough for "QUANTITY" to wrap at the word rather than mid-word.
      6: { halign: "right", cellWidth: 18 },
      7: { ...mono, cellWidth: 15 },
      8: { ...mono },
      9: { halign: "right" },
      11: { ...mono, cellWidth: 19 },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawWatermark(doc);
    drawMasthead(doc);
    drawFooter(doc, page, pageCount);
  }

  return doc;
}
