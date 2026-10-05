import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { sendEmail, shopInbox } from "@/lib/email";
import { EstimateReceivedEmailHTML, NewRequestEmailHTML } from "@/lib/email-templates";
import { suppressionStatus } from "@/lib/email-suppression";
import {
  GUEST_CONFIRMATIONS_PER_ADDRESS_PER_DAY,
  GuestConfirmationOutcome,
  guestEmailLinks,
  issueGuestEmailToken,
} from "@/lib/guest-email";
import { parsePartSourceForm, storePartSourceFiles } from "@/lib/part-source-server";
import { composeNotes, requestTitle } from "@/lib/part-source";
import { DEFAULT_ESTIMATE_STATUS, KIND_ESTIMATE } from "@/lib/request-status";
import { describeFormTokenFailure, verifyFormToken } from "@/lib/form-token";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  DAY_MS,
  HOUR_MS,
  clientIp,
  consumeRateLimits,
  hashIdentifier,
} from "@/lib/rate-limit";
import {
  FORM_TOKEN_FIELD,
  GUEST_OWNER_EMAIL,
  GUEST_OWNER_NAME,
  GUEST_ESTIMATE_TOKEN_SCOPE,
  HONEYPOT_FIELD,
  MAX_COMPANY_CHARS,
  TURNSTILE_FIELD,
  normalizeEmail,
  estimateReference,
  resolveDateNeeded,
  validateGuestContact,
  validateGuestNotes,
} from "@/lib/guest-estimate";

/**
 * POST /api/requests/guest — an estimate request from someone with no account.
 *
 * The whole point of this route is that it creates nothing new. A guest
 * estimate is an ordinary `PartRequest` on the ESTIMATE track, so the admin
 * console, the pricing and conversion flow, invoicing and the reports PDF all
 * handle it with no changes at all.
 *
 * It is an ESTIMATE and never a quote, and that is not a labelling choice: a
 * guaranteed price needs an account to hold the job against and the part file
 * we would be printing, and a submission through this form has neither. An
 * admin can convert one onto the build queue at any time, but promoting it to
 * a quote is refused until it qualifies — see `qualifiesForQuote` in
 * src/lib/request-status.ts.
 *
 * What it never does is attach that request to a customer's account. Anyone
 * can type anyone's email into a public form, so matching a submitted address
 * against a registered one would let a stranger drop rows onto someone else's
 * desk. Every guest estimate is filed under one system account instead
 * (`GUEST_OWNER_EMAIL` — reserved domain, random password, nobody signs into
 * it), with the contact details the sender gave stored on the request. Owning
 * them somewhere rather than nowhere is deliberate too: a request with no
 * owning customer would make its own uploads public through
 * `/api/download/[fileId]`.
 *
 * Being the one endpoint on this site that anyone on the internet may POST to,
 * it is defended in layers, cheapest first, none of which asks the customer
 * for anything:
 *
 *   1. A honeypot field, invisible to people. Filled in means a bot.
 *   2. A signed form token (src/lib/form-token.ts): proves the form was loaded
 *      and that a plausible amount of time was spent on it.
 *   3. Cloudflare Turnstile, when the deployment has configured it.
 *   4. Database-backed rate limits per address and per email address.
 *   5. The same byte-level file validation the signed-in composer runs, via
 *      the shared reader in src/lib/part-source-server.ts.
 *
 * The order matters: everything that can reject a request without touching the
 * database or R2 happens before anything that does.
 *
 * None of those can tell whose email address was typed in, so once a request
 * is filed the address is treated as a claim, not a fact. The one email sent
 * to it carries nothing the sender typed and asks the address's owner to
 * confirm or disown the estimate (src/lib/guest-email.ts); an address that has
 * disowned one before is never emailed again, and none gets more than one a
 * day. The shop's own notification goes to the shop, never to the address on
 * the form.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

/** Generous for a person, useless for a flood. */
const GUEST_ESTIMATE_LIMITS = {
  perIpHour: 5,
  perIpDay: 15,
  perEmailDay: 5,
};

const TOO_MANY =
  "That's a lot of estimate requests from one place in a short time. Give it a little while, or call the shop and we'll take the details directly.";

/**
 * The system account every no-account estimate is filed under, created the first
 * time one arrives.
 *
 * Not a customer and never one: the address is on the reserved `.invalid`
 * domain so it can never be registered or receive mail, the password is random
 * and held by nobody, and the Clients list filters the row out. It exists so a
 * guest estimate has an owner — which is what keeps its uploads behind the admin
 * check in /api/download/[fileId] — without that owner being a person.
 */
async function guestOwner(): Promise<{ id: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: GUEST_OWNER_EMAIL },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: GUEST_OWNER_NAME,
      email: GUEST_OWNER_EMAIL,
      password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      isGuest: true,
    },
    select: { id: true },
  });
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The one email this form sends to the address it was given — see
 * src/lib/guest-email.ts for why it says so little. Withheld from an address
 * on the do-not-email list, or when that list cannot be read, and from one
 * that has already had one today, so the form cannot be aimed at a stranger's
 * inbox over and over. Never throws; what happened is returned for the shop.
 */
async function sendGuestConfirmation(
  requestId: string,
  reference: string,
  email: string,
  emailHash: string
): Promise<GuestConfirmationOutcome> {
  const suppression = await suppressionStatus(email);
  if (suppression === "listed") return "suppressed";
  if (suppression === "unreadable") return "not-sent";

  // Counted before sending, so a failed send still uses up the day's email —
  // the ceiling is there to protect the recipient, so it errs on their side.
  const cap = await consumeRateLimits([
    {
      scope: "guest-email:sent-day",
      subject: emailHash,
      limit: GUEST_CONFIRMATIONS_PER_ADDRESS_PER_DAY,
      windowMs: DAY_MS,
      message: "",
    },
  ]);
  if (!cap.ok) return "capped";

  const token = issueGuestEmailToken(requestId);
  if (!token) return "not-sent";
  const links = guestEmailLinks(token);

  const sent = await sendEmail({
    to: email,
    subject: `Estimate request ${reference}: confirm it was you`,
    html: EstimateReceivedEmailHTML({ reference, confirmUrl: links.confirm, disownUrl: links.disown }),
    label: "guest-estimate confirmation",
  });
  return sent.ok ? "sent" : "not-sent";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // --- 1. Honeypot ------------------------------------------------------
    // A field no person can see or tab into. Anything in it came from a bot
    // filling every input on the page. It is answered with an ordinary success
    // so the sender learns nothing, and logged with the address it claimed, so
    // a real submission that somehow tripped it can still be recovered.
    const honeypot = field(formData, HONEYPOT_FIELD).trim();
    if (honeypot) {
      console.warn(
        `[guest-estimate] honeypot tripped; dropped submission claiming email=${field(formData, "email").slice(0, 100)}`
      );
      return NextResponse.json({ ok: true, reference: null }, { status: 202 });
    }

    // --- 2. Form token ----------------------------------------------------
    const tokenResult = verifyFormToken(field(formData, FORM_TOKEN_FIELD), GUEST_ESTIMATE_TOKEN_SCOPE);
    if (!tokenResult.ok) {
      return NextResponse.json(
        { error: describeFormTokenFailure(tokenResult.reason) },
        { status: 400 }
      );
    }

    // --- 3. Contact block -------------------------------------------------
    const contact = {
      name: field(formData, "name").trim(),
      email: field(formData, "email"),
      phone: field(formData, "phone").trim(),
      company: field(formData, "company").trim(),
    };

    const contactError = validateGuestContact(contact);
    if (contactError) {
      return NextResponse.json({ error: contactError }, { status: 400 });
    }
    const email = normalizeEmail(contact.email);

    // --- 4. Turnstile, where it is configured ----------------------------
    const ip = clientIp(req.headers);
    const turnstile = await verifyTurnstile(field(formData, TURNSTILE_FIELD) || null, ip);
    if (!turnstile.ok) {
      console.warn(`[guest-estimate] turnstile rejected a submission: ${turnstile.detail}`);
      return NextResponse.json(
        {
          error:
            "We couldn't confirm you're a person. Refresh the page and try again — or call the shop and we'll take the details directly.",
        },
        { status: 400 }
      );
    }

    // --- 5. Rate limits ---------------------------------------------------
    // The scope strings still say "guest-quote" after the estimate rename, and
    // deliberately: a scope is half of the primary key each counter is stored
    // under, so renaming one would hand every caller a fresh, empty window.
    const ipHash = hashIdentifier(ip);
    const emailHash = hashIdentifier(email);
    const verdict = await consumeRateLimits([
      {
        scope: "guest-quote:ip-hour",
        subject: ipHash,
        limit: GUEST_ESTIMATE_LIMITS.perIpHour,
        windowMs: HOUR_MS,
        message: TOO_MANY,
      },
      {
        scope: "guest-quote:ip-day",
        subject: ipHash,
        limit: GUEST_ESTIMATE_LIMITS.perIpDay,
        windowMs: DAY_MS,
        message: TOO_MANY,
      },
      {
        scope: "guest-quote:email-day",
        subject: emailHash,
        limit: GUEST_ESTIMATE_LIMITS.perEmailDay,
        windowMs: DAY_MS,
        message: TOO_MANY,
      },
    ]);

    if (!verdict.ok) {
      return NextResponse.json(
        { error: verdict.rule?.message || TOO_MANY },
        {
          status: 429,
          headers: verdict.retryAfterSeconds
            ? { "Retry-After": String(verdict.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    // --- 6. The part itself ----------------------------------------------
    // The same reader the signed-in composer uses, so a guest cannot upload
    // anything a customer could not.
    const parsedSource = await parsePartSourceForm(formData, { uploadScope: "guest" });
    if ("error" in parsedSource) {
      return NextResponse.json({ error: parsedSource.error }, { status: 400 });
    }
    const source = parsedSource.source;

    // --- 7. The optional rest --------------------------------------------
    const resolvedDate = resolveDateNeeded(field(formData, "dateNeeded"));
    if ("error" in resolvedDate) {
      return NextResponse.json({ error: resolvedDate.error }, { status: 400 });
    }

    const quantityRaw = field(formData, "quantity").trim();
    const quantity = quantityRaw ? parseInt(quantityRaw, 10) : 1;
    if (isNaN(quantity) || quantity < 1 || quantity > 10000) {
      return NextResponse.json({ error: "Invalid quantity provided" }, { status: 400 });
    }

    const material = field(formData, "material").trim();
    if (material.length > 100) {
      return NextResponse.json(
        { error: "Material name exceeds maximum allowed length" },
        { status: 400 }
      );
    }

    const customerNotes = field(formData, "notes").trim();
    const notesError = validateGuestNotes(customerNotes);
    if (notesError) {
      return NextResponse.json({ error: notesError }, { status: 400 });
    }
    if (contact.company.length > MAX_COMPANY_CHARS) {
      return NextResponse.json(
        { error: `Company must be ${MAX_COMPANY_CHARS} characters or fewer` },
        { status: 400 }
      );
    }

    // The console reads `notes`, so the company, the equipment, and the part
    // number ride there rather than in columns of their own — labelled first
    // lines, ahead of the customer's own words, which are never cut to make
    // room: they were capped above, and each labelled line has a cap of its own.
    const notes = composeNotes({
      company: contact.company,
      equipment: source.equipment,
      partNumber: source.partNumber,
      notes: customerNotes,
    });

    // --- 8. Who this belongs to ------------------------------------------
    // Nobody. The submitted address is never looked up against the accounts
    // table, so an estimate can neither land on a stranger's desk nor reveal that
    // an address is registered here. It is filed under the one system row
    // instead, and the contact block is stored on the request.
    const owner = await guestOwner();

    const phoneNumberRecord = await prisma.phoneNumber.create({
      data: { userId: owner.id, number: contact.phone },
    });

    // --- 9. Store the files, then the request -----------------------------
    const storedSource = await storePartSourceFiles(source);
    if ("error" in storedSource) {
      return NextResponse.json({ error: storedSource.error }, { status: 500 });
    }

    const partRequest = await prisma.partRequest.create({
      data: {
        userId: owner.id,
        phoneNumberId: phoneNumberRecord.id,
        // Who to answer. Stored on the request precisely because it is not an
        // account: this is the only record of who sent it.
        guestName: contact.name,
        guestEmail: email,
        guestPhone: contact.phone,
        submissionType: source.submissionType,
        fileId: storedSource.stored.fileId,
        fileName: source.model ? source.model.fileName : null,
        partName: source.partName,
        partDescription: source.partDescription,
        dimensions: source.dimensions,
        quantity,
        material: material || null,
        notes: notes || null,
        // Nothing is built off this form. It is a price request, always —
        // and, with no account and nothing verified behind it, an estimate
        // rather than a price the shop is on the hook for.
        quoteRequested: true,
        kind: KIND_ESTIMATE,
        status: DEFAULT_ESTIMATE_STATUS,
        dateNeeded: resolvedDate.date,
        ...(storedSource.stored.references.length > 0
          ? { attachments: { create: storedSource.stored.references } }
          : {}),
      },
    });

    const reference = estimateReference(partRequest.id);
    const title = requestTitle({ fileName: partRequest.fileName, partName: partRequest.partName });
    const dateNeeded = format(resolvedDate.date, "PPP");

    // --- 10. Ask the address's owner, then tell the shop -----------------
    // Both sends are best-effort: a mail failure is logged and never costs the
    // customer the request they just made. The confirmation goes first because
    // the shop's notification says what became of it.
    const guestConfirmation = await sendGuestConfirmation(partRequest.id, reference, email, emailHash);

    try {
      await sendEmail({
        to: shopInbox(),
        subject: `[No account] Estimate request ${reference}: ${title.replace(/[\r\n]/g, "")}`,
        html: NewRequestEmailHTML({
          customerName: contact.name,
          customerEmail: email,
          customerPhone: contact.phone,
          company: contact.company || undefined,
          guestSubmitted: true,
          guestConfirmation,
          reference,
          fileName: title,
          submissionType: source.submissionType,
          partDescription: source.partDescription || undefined,
          dimensions: source.dimensions || undefined,
          referenceCount: storedSource.stored.references.length,
          quantity,
          material: material || "Not specified — shop to recommend",
          dateNeeded,
          // The company has its own row in the email; the rest ride in the notes.
          notes:
            composeNotes({
              equipment: source.equipment,
              partNumber: source.partNumber,
              notes: customerNotes,
            }) || undefined,
          pricingKind: KIND_ESTIMATE,
        }),
        label: "guest-estimate admin notification",
      });
    } catch (emailError) {
      console.error("Failed to send guest estimate admin notification:", emailError);
    }

    return NextResponse.json({ ok: true, reference, email }, { status: 201 });
  } catch (error) {
    console.error("Failed to create guest estimate request:", error);
    return NextResponse.json({ error: "Failed to submit this estimate request" }, { status: 500 });
  }
}
