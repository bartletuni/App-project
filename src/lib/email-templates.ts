import { BUSINESS, absoluteUrl } from "@/lib/seo";
import { StatusTone, statusTone } from "@/lib/request-status";
import { CLAY, CREAM, DERIVED, EMBER, ESPRESSO, WORDMARK } from "@/lib/brand";

/**
 * Transactional email, in the same voice as the site.
 *
 * The site is a warm dark "spec sheet": espresso grounds, clay accents, cream
 * text, a display serif for headings and a letterspaced monospace for index
 * labels. These templates carry that across, and reuse the product's own
 * vocabulary — your desk, the composer, the build ledger — so an email reads
 * like it came from the same place as the page it links to.
 *
 * Everything is built from the small kit below rather than copy-pasted per
 * template, so the five emails cannot drift apart.
 *
 * Email HTML is not web HTML. The rules followed here:
 *   - Tables for layout; `role="presentation"` so screen readers skip them.
 *   - Styles inline. Gmail strips <style> for some account types, so nothing
 *     load-bearing lives in the one <style> block (media queries only).
 *   - `bgcolor` beside every background-color: Outlook's Word engine ignores
 *     the CSS but honours the attribute, which matters when the design is dark.
 *   - No box-shadow, no background images, no web fonts — none survive Outlook.
 *     The display face degrades through Palatino to Georgia, which is everywhere.
 *   - The design is already dark, so it declares `color-scheme: dark` and asks
 *     clients not to "helpfully" invert it.
 *
 * Links point at the canonical site origin, not NEXTAUTH_URL. That variable
 * describes wherever auth callbacks are served — on Vercel it is often pinned
 * to one immutable deployment URL, which stops resolving once that deployment
 * is superseded, so emails sent earlier lead to a Vercel 404. absoluteUrl
 * falls back to the production domain, so a link is still correct when
 * NEXT_PUBLIC_SITE_URL is unset.
 */

// ---------------------------------------------------------------------------
// Palette and type
// ---------------------------------------------------------------------------

/**
 * What each shade does in an email. The values come from `brand.ts` so the
 * email, the site and the report PDF cannot drift onto different browns; the
 * mapping is local because it only describes a dark medium — the printed
 * report reads the same scale in reverse.
 */
const C = {
  page: ESPRESSO[950],
  card: ESPRESSO[900],
  panel: ESPRESSO[800],
  raised: ESPRESSO[700],
  rule: DERIVED.rule,
  clay: CLAY[400],
  clayDeep: CLAY[600],
  eyebrow: DERIVED.eyebrow,
  ember: EMBER[400],
  cream: CREAM[100],
  creamSoft: CREAM[200],
  body: CREAM[400],
  muted: CREAM[500],
  faint: CREAM[600],
} as const;

const DISPLAY = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,Cambria,serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',SFMono,Consolas,'Liberation Mono',Menlo,monospace";

/** Prevents HTML injection from any value that reaches a template. */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Escapes, then turns newlines into <br>. `white-space: pre-wrap` is the
 * obvious alternative but several clients drop it, and a customer's part
 * description is the one place line breaks carry meaning.
 */
function escapeMultiline(unsafe: string): string {
  return escapeHtml(unsafe).replace(/\r?\n/g, "<br>");
}

// ---------------------------------------------------------------------------
// Kit
// ---------------------------------------------------------------------------

/** The site's monospace index label — "NEW BUILD ⁄ COMPOSER". */
function eyebrow(text: string): string {
  return `<div style="font-family:${MONO};font-size:11px;line-height:1.4;letter-spacing:0.24em;text-transform:uppercase;color:${C.eyebrow};padding-bottom:14px;">${escapeHtml(text)}</div>`;
}

/** The warm rule that fades at the ends on the site; flat here, since gradients are unreliable. */
function hairline(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="${C.rule}" style="background-color:${C.rule};height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr></table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:30px;line-height:1.2;font-weight:400;color:${C.cream};">${text}</h1>`;
}

function lede(html: string): string {
  return `<p style="margin:0 0 26px;font-family:${SANS};font-size:15px;line-height:1.7;color:${C.body};">${html}</p>`;
}

/** A spec-sheet block: monospace label above its value, hairline between rows. */
function specSheet(rows: { label: string; value: string }[]): string {
  const present = rows.filter((r) => r.value);
  if (present.length === 0) return ""; // never an empty bordered box

  const cells = present
    .map(
      (r, i) => `
        <tr><td style="padding:${i === 0 ? "0" : "14px"} 0 0;">
          ${i === 0 ? "" : hairline()}
          <div style="padding:${i === 0 ? "0" : "14px"} 0 0;">
            <div style="font-family:${MONO};font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${C.muted};padding-bottom:5px;">${escapeHtml(r.label)}</div>
            <div style="font-family:${SANS};font-size:15px;line-height:1.55;color:${C.creamSoft};">${r.value}</div>
          </div>
        </td></tr>`
    )
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.rule};border-radius:4px;margin:0 0 26px;">
      <tr><td style="padding:20px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${cells}</table>
      </td></tr>
    </table>`;
}

/** A flagged notice — the shop needs to see these before anything else. */
function callout(text: string, accent: string = C.ember): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.raised}" style="background-color:${C.raised};border-left:3px solid ${accent};border-radius:0 4px 4px 0;margin:0 0 20px;">
      <tr><td style="padding:14px 18px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.creamSoft};">${text}</td></tr>
    </table>`;
}

/** Free-form prose from a customer — notes, a part description. */
function proseBlock(label: string, text: string): string {
  return `
    <div style="font-family:${MONO};font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${C.muted};padding-bottom:8px;">${escapeHtml(label)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.rule};border-radius:4px;margin:0 0 26px;">
      <tr><td style="padding:16px 18px;font-family:${SANS};font-size:15px;line-height:1.7;color:${C.creamSoft};">${escapeMultiline(text)}</td></tr>
    </table>`;
}

/** Bulletproof CTA — a table so Outlook renders the fill, padding on the anchor. */
function button(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
      <tr><td bgcolor="${C.clayDeep}" style="background-color:${C.clayDeep};border-radius:4px;">
        <a href="${href}" style="display:inline-block;padding:15px 30px;font-family:${MONO};font-size:12px;line-height:1;letter-spacing:0.18em;text-transform:uppercase;color:${C.cream};text-decoration:none;font-weight:600;">${escapeHtml(label)} &rarr;</a>
      </td></tr>
    </table>`;
}

/**
 * Status pill, mirroring the colours the build ledger uses on screen. The
 * status-to-tone mapping is shared with the app (src/lib/request-status.ts) so
 * a quote status renders here without a second list to keep in step; only the
 * hex per tone lives in this file, since email cannot use the site's classes.
 */
function statusChip(status: string): string {
  const tones: Record<StatusTone, string> = {
    wait: "#f0c08a",
    review: "#e3be9a",
    sent: "#e7dccb",
    active: C.ember,
    done: "#8fbf7f",
    ship: "#7fbfb5",
    bad: "#d98a7a",
    muted: C.clay,
  };
  const tone = tones[statusTone(status)] || C.clay;
  return `<span style="display:inline-block;padding:6px 12px;border:1px solid ${tone};border-radius:2px;font-family:${MONO};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${tone};">${escapeHtml(status)}</span>`;
}

/** The site's numbered index, used to walk someone through what happens next. */
function steps(items: { title: string; detail: string }[]): string {
  const rows = items
    .map(
      (item, i) => `
      <tr>
        <td width="42" valign="top" style="padding:0 0 18px;font-family:${MONO};font-size:12px;line-height:1.5;letter-spacing:0.1em;color:${C.clay};">${String(i + 1).padStart(2, "0")}</td>
        <td valign="top" style="padding:0 0 18px;">
          <div style="font-family:${SANS};font-size:15px;line-height:1.5;font-weight:600;color:${C.creamSoft};">${escapeHtml(item.title)}</div>
          <div style="font-family:${SANS};font-size:14px;line-height:1.6;color:${C.muted};padding-top:3px;">${escapeHtml(item.detail)}</div>
        </td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px;">${rows}</table>`;
}

/**
 * The document every template is poured into: masthead, content, footer.
 *
 * `audience` decides the footer only — a customer gets the shop's contact
 * details, the console gets a plain automated-notice line, and a guest gets
 * the same contact details with the one line that differs: they have no
 * account, so nothing may claim they do.
 */
function shell(opts: {
  preheader: string;
  eyebrow: string;
  title: string;
  content: string;
  audience: "customer" | "guest" | "console";
}): string {
  const contactFooter = (why: string) => `
        <div style="font-family:${SANS};font-size:13px;line-height:1.7;color:${C.muted};">
          Questions about this? Reply to this email, or reach us at
          <a href="mailto:${BUSINESS.email}" style="color:${C.clay};text-decoration:none;">${BUSINESS.email}</a>
          &nbsp;·&nbsp;
          <a href="tel:${BUSINESS.telephone}" style="color:${C.clay};text-decoration:none;">${BUSINESS.telephone.replace(/^\+1-/, "")}</a>
        </div>
        <div style="font-family:${MONO};font-size:10px;line-height:1.6;letter-spacing:0.1em;color:${C.faint};padding-top:14px;">
          Sent by <a href="${absoluteUrl("/")}" style="color:${C.faint};text-decoration:none;">TakomoCo</a> ${why}
        </div>`;

  const footer =
    opts.audience === "guest"
      ? contactFooter("because you asked us for a quote.")
      : opts.audience === "customer"
      ? contactFooter("because you have an account with us.")
      : `
        <div style="font-family:${MONO};font-size:10px;line-height:1.6;letter-spacing:0.1em;color:${C.faint};">
          Automated notification &middot; <a href="${absoluteUrl("/admin")}" style="color:${C.faint};text-decoration:none;">TakomoCo console</a>
        </div>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(opts.title.replace(/<[^>]+>/g, ""))}</title>
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    a { text-decoration: none; }
    @media only screen and (max-width:620px) {
      .frame { width:100% !important; }
      .pad { padding-left:22px !important; padding-right:22px !important; }
      .title { font-size:25px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};" bgcolor="${C.page}">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};opacity:0;">${escapeHtml(opts.preheader)}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.page}" style="background-color:${C.page};">
    <tr><td align="center" style="padding:32px 16px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="frame" bgcolor="${C.card}" style="width:600px;max-width:600px;background-color:${C.card};border:1px solid ${C.rule};border-radius:6px;">

        <!-- Masthead -->
        <tr><td class="pad" style="padding:26px 34px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="left" style="font-family:${MONO};font-size:15px;line-height:1;letter-spacing:0.22em;color:${C.cream};font-weight:600;">${WORDMARK.head}<span style="color:${C.clay};">&#8260;</span>${WORDMARK.tail}</td>
              <td align="right" style="font-family:${MONO};font-size:9px;line-height:1;letter-spacing:0.18em;text-transform:uppercase;color:${C.faint};">${escapeHtml(WORDMARK.descriptor)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td>${hairline()}</td></tr>

        <!-- Content -->
        <tr><td class="pad" style="padding:34px;">
          ${eyebrow(opts.eyebrow)}
          ${opts.content}
        </td></tr>

        <tr><td>${hairline()}</td></tr>
        <tr><td class="pad" style="padding:22px 34px 26px;">${footer}</td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const WelcomeUserEmailHTML = (data: {
  name: string;
  email: string;
  phone: string;
  shippingAddress: string;
  billingAddress: string;
}) =>
  shell({
    audience: "customer",
    preheader: "Your TakomoCo account is open — and your first PLA 2.0 part is free.",
    eyebrow: "Welcome ⁄ Account opened",
    title: `Welcome, ${data.name}`,
    content: `
      ${heading(`Welcome, <span style="font-style:italic;color:${C.clay};">${escapeHtml(data.name)}</span>`)}
      ${lede(
        "Your account is open. Your desk is where everything happens from here — submit a part, watch it move through the shop, and keep every build on one ledger."
      )}

      ${callout(
        `<strong style="color:#8fbf7f;">First order's on us.</strong> As a new customer, you get one part printed free in PLA 2.0 — no invoice. Check "First order? Get a free sample" when you submit it.`,
        "#8fbf7f"
      )}

      <div style="font-family:${MONO};font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${C.muted};padding:0 0 16px;">How a part gets made</div>
      ${steps([
        {
          title: "Send us the part",
          detail:
            "Upload an STL or ZIP if you have one. No model? Describe the part and send photos — we draw it for you.",
        },
        {
          title: "We price it",
          detail:
            "You get an invoice, or a quote first if you asked for one. Nothing is built until it is paid in full.",
        },
        {
          title: "We build and ship it",
          detail:
            "Track status and tracking numbers from your desk the whole way through.",
        },
      ])}

      <div style="padding:6px 0 30px;">${button(absoluteUrl("/dashboard"), "Open your desk")}</div>

      ${specSheet([
        { label: "Name", value: escapeHtml(data.name) },
        { label: "Email", value: escapeHtml(data.email) },
        { label: "Phone", value: escapeHtml(data.phone) },
        { label: "Shipping address", value: escapeMultiline(data.shippingAddress) },
        { label: "Billing address", value: escapeMultiline(data.billingAddress) },
      ])}

      <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.7;color:${C.muted};">
        Anything wrong above? Correct it any time in
        <a href="${absoluteUrl("/settings")}" style="color:${C.clay};text-decoration:none;">your account settings</a>.
      </p>`,
  });

export const NewUserAdminNotificationEmailHTML = (data: {
  name: string;
  email: string;
  phone: string;
  shippingAddress: string;
  billingAddress: string;
}) =>
  shell({
    audience: "console",
    preheader: `${data.name} (${data.email}) just registered.`,
    eyebrow: "Console ⁄ New client",
    title: "New client registered",
    content: `
      ${heading("New client registered")}
      ${lede("An account was just created on the TakomoCo platform.")}

      ${specSheet([
        { label: "Name", value: escapeHtml(data.name) },
        {
          label: "Email",
          value: `<a href="mailto:${escapeHtml(data.email)}" style="color:${C.clay};text-decoration:none;">${escapeHtml(data.email)}</a>`,
        },
        {
          label: "Phone",
          value: `<a href="tel:${escapeHtml(data.phone)}" style="color:${C.clay};text-decoration:none;">${escapeHtml(data.phone)}</a>`,
        },
        { label: "Shipping address", value: escapeMultiline(data.shippingAddress) },
        { label: "Billing address", value: escapeMultiline(data.billingAddress) },
      ])}

      ${button(absoluteUrl("/admin/users"), "Open client list")}`,
  });

export const NewRequestEmailHTML = (data: {
  customerName: string;
  customerEmail: string;
  /** Present on a no-account quote, where a callback is how this gets answered. */
  customerPhone?: string;
  /** Optional, and only ever offered on the public quote form. */
  company?: string;
  /** True when this came through /quote — the customer has no desk to watch. */
  guestSubmitted?: boolean;
  /** The short code the customer was given on screen, e.g. "Q-4F2A9C". */
  reference?: string;
  /** The uploaded file's name, or the customer's name for a described part. */
  fileName: string;
  /** "MODEL" (a file was uploaded) or "DESCRIPTION" (no file — we draw it). */
  submissionType?: string;
  partDescription?: string;
  dimensions?: string;
  referenceCount?: number;
  quantity: number;
  material: string;
  dateNeeded: string;
  notes?: string;
  printSettings?: string;
  quoteRequested?: boolean;
  isFreeSample?: boolean;
}) => {
  const described = data.submissionType === "DESCRIPTION";
  const references = data.referenceCount
    ? ` and attached ${data.referenceCount} reference file${data.referenceCount === 1 ? "" : "s"}`
    : "";

  return shell({
    audience: "console",
    preheader: `${data.customerName} — ${data.fileName}, ${data.quantity} off, needed ${data.dateNeeded}.`,
    eyebrow: data.guestSubmitted ? "Console ⁄ No-account quote" : "Console ⁄ New build",
    title: "New part request",
    content: `
      ${heading("New part request")}
      ${lede(`A new request came in from <span style="color:${C.creamSoft};">${escapeHtml(data.customerName)}</span>.`)}

      ${
        data.guestSubmitted
          ? callout(
              `<strong style="color:${C.clay};">No account.</strong> Came in through the public quote form and is attached to no account — the email and phone below are the only way to reach them. They were told to expect an answer within one business day.`,
              C.clay
            )
          : ""
      }
      ${
        data.isFreeSample
          ? callout(
              `<strong style="color:#8fbf7f;">Free sample.</strong> First-time customer's free PLA 2.0 sample — no invoice.`,
              "#8fbf7f"
            )
          : ""
      }
      ${
        described
          ? callout(
              `<strong style="color:${C.clay};">No 3D file.</strong> The customer described this part${references}. Model it first, then quote.`,
              C.clay
            )
          : ""
      }
      ${
        data.quoteRequested
          ? callout(
              `<strong style="color:${C.ember};">Quote requested.</strong> Send a price for approval before invoicing.`,
              C.ember
            )
          : ""
      }

      ${specSheet([
        { label: "Reference", value: data.reference ? escapeHtml(data.reference) : "" },
        {
          label: "Customer",
          value: [
            escapeHtml(data.customerName),
            data.company ? escapeHtml(data.company) : "",
            `<a href="mailto:${escapeHtml(data.customerEmail)}" style="color:${C.clay};text-decoration:none;">${escapeHtml(data.customerEmail)}</a>`,
            data.customerPhone
              ? `<a href="tel:${escapeHtml(data.customerPhone.replace(/[^\d+]/g, ""))}" style="color:${C.clay};text-decoration:none;">${escapeHtml(data.customerPhone)}</a>`
              : "",
          ]
            .filter(Boolean)
            .join("<br>"),
        },
        { label: described ? "Part" : "File name", value: escapeHtml(data.fileName) },
        { label: "Approximate size", value: data.dimensions ? escapeHtml(data.dimensions) : "" },
        { label: "Material", value: escapeHtml(data.material) },
        { label: "Quantity", value: String(data.quantity) },
        { label: "Date needed", value: escapeHtml(data.dateNeeded) },
        { label: "Print settings", value: data.printSettings ? escapeHtml(data.printSettings) : "" },
      ])}

      ${data.partDescription ? proseBlock("Part description", data.partDescription) : ""}
      ${data.notes ? proseBlock("Customer notes", data.notes) : ""}

      ${button(absoluteUrl("/admin"), "Open in console")}`,
  });
};

/**
 * The customer's receipt for a no-account quote request.
 *
 * They have no desk to watch and no password to remember, so this email is the
 * whole of their side of the transaction: proof it arrived, the reference the
 * shop will use on the phone, what we understood them to be asking for, and
 * when to expect an answer. The account offer sits at the bottom, as an offer
 * for future work only — a no-account quote is deliberately attached to no
 * account, so opening one does not and must not inherit it.
 */
export const QuoteReceivedEmailHTML = (data: {
  customerName: string;
  /** The short code shown on screen when they submitted, e.g. "Q-4F2A9C". */
  reference: string;
  partTitle: string;
  quantity: number;
  material: string;
  dateNeeded: string;
}) =>
  shell({
    audience: "guest",
    preheader: `Quote ${data.reference} is with the shop — we'll come back within one business day.`,
    eyebrow: "Quote ⁄ Received",
    title: `Quote ${data.reference} received`,
    content: `
      ${heading(`We've got it, <span style="font-style:italic;color:${C.clay};">${escapeHtml(data.customerName.split(" ")[0] || data.customerName)}</span>`)}
      ${lede(
        `Your quote request is with the shop. Quote your reference — <strong style="color:${C.creamSoft};">${escapeHtml(data.reference)}</strong> — if you call about it.`
      )}

      ${specSheet([
        { label: "Reference", value: escapeHtml(data.reference) },
        { label: "Part", value: escapeHtml(data.partTitle) },
        { label: "Quantity", value: String(data.quantity) },
        { label: "Material", value: escapeHtml(data.material) },
        { label: "Needed by", value: escapeHtml(data.dateNeeded) },
      ])}

      ${steps([
        {
          title: "We read it",
          detail: "A person looks at your part, not a calculator. Within one business day.",
        },
        {
          title: "We come back with a price",
          detail: "By email or phone, whichever reaches you — with anything we still need to ask.",
        },
        {
          title: "You decide",
          detail: "Nothing is built and nothing is invoiced until you say yes to the price.",
        },
      ])}

      ${callout(
        `Want your <em>next</em> job on a desk you can watch? <a href="${absoluteUrl("/login?register=1")}" style="color:${C.clay};text-decoration:none;">Open an account</a>. This quote stays where it is — we keep no-account quotes off accounts on purpose, so nobody can attach anything to yours by typing your address into a form. We answer this one by email either way.`,
        C.clay
      )}

      ${button(absoluteUrl("/quote"), "Send another part")}`,
  });

export const InvoiceSentEmailHTML = (data: {
  customerName: string;
  fileName: string;
  invoiceNumber: string;
}) =>
  shell({
    audience: "customer",
    preheader: `Invoice ${data.invoiceNumber} for ${data.fileName} is ready.`,
    eyebrow: "Invoice ⁄ Sent",
    title: "Your invoice is ready",
    content: `
      ${heading("Your invoice is ready")}
      ${lede(
        `Hello ${escapeHtml(data.customerName)} — the invoice for your part has been issued through Square and will arrive from them in a separate email. Manufacturing starts once it is paid in full.`
      )}

      ${specSheet([
        { label: "Part", value: escapeHtml(data.fileName) },
        {
          label: "Invoice number",
          value: `<span style="font-family:${MONO};font-size:15px;letter-spacing:0.06em;color:${C.clay};">${escapeHtml(data.invoiceNumber)}</span>`,
        },
      ])}

      ${button(absoluteUrl("/dashboard"), "View on your desk")}`,
  });

export const StatusUpdateEmailHTML = (data: {
  customerName: string;
  fileName: string;
  status: string;
  message: string;
  trackingNumber?: string | null;
}) =>
  shell({
    audience: "customer",
    preheader: `${data.fileName} — ${data.status}. ${data.message}`,
    eyebrow: "Build ⁄ Status update",
    title: `Status update: ${data.status}`,
    content: `
      <div style="padding:0 0 16px;">${statusChip(data.status)}</div>
      ${heading(escapeHtml(data.fileName))}
      ${lede(`Hello ${escapeHtml(data.customerName)} — ${escapeHtml(data.message)}`)}

      ${specSheet([
        {
          label: "USPS tracking",
          value: data.trackingNumber
            ? `<span style="font-family:${MONO};font-size:15px;letter-spacing:0.06em;color:#7fbfb5;">${escapeHtml(data.trackingNumber)}</span>`
            : "",
        },
      ])}

      ${button(absoluteUrl("/dashboard"), "View on your desk")}`,
  });
