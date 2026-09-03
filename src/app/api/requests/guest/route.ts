import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NewRequestEmailHTML, QuoteReceivedEmailHTML } from "@/lib/email-templates";
import { parsePartSourceForm, storePartSourceFiles } from "@/lib/part-source-server";
import { requestTitle } from "@/lib/part-source";
import { DEFAULT_QUOTE_STATUS, KIND_QUOTE } from "@/lib/request-status";
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
  GUEST_QUOTE_TOKEN_SCOPE,
  HONEYPOT_FIELD,
  MAX_COMPANY_CHARS,
  MAX_NOTES_CHARS,
  TURNSTILE_FIELD,
  normalizeEmail,
  quoteReference,
  resolveDateNeeded,
  validateGuestContact,
  validateGuestNotes,
} from "@/lib/guest-quote";

/**
 * POST /api/requests/guest — a quote request from someone with no account.
 *
 * The whole point of this route is that it creates nothing new. A guest quote
 * is an ordinary `PartRequest` on the QUOTE track, owned by a `User` row that
 * has been opened but never claimed (`User.isGuest`). The admin console, the
 * pricing and conversion flow, invoicing, the reports PDF — all of it already
 * handles that shape, so none of it needed changing. `PartRequest.guestSubmitted`
 * records how the request arrived; that is the only thing that distinguishes it.
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
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

/** Generous for a person, useless for a flood. */
const GUEST_QUOTE_LIMITS = {
  perIpHour: 5,
  perIpDay: 15,
  perEmailDay: 5,
};

const TOO_MANY =
  "That's a lot of quote requests from one place in a short time. Give it a little while, or call the shop and we'll take the details directly.";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
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
        `[guest-quote] honeypot tripped; dropped submission claiming email=${field(formData, "email").slice(0, 100)}`
      );
      return NextResponse.json({ ok: true, reference: null }, { status: 202 });
    }

    // --- 2. Form token ----------------------------------------------------
    const tokenResult = verifyFormToken(field(formData, FORM_TOKEN_FIELD), GUEST_QUOTE_TOKEN_SCOPE);
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
      console.warn(`[guest-quote] turnstile rejected a submission: ${turnstile.detail}`);
      return NextResponse.json(
        {
          error:
            "We couldn't confirm you're a person. Refresh the page and try again — or call the shop and we'll take the details directly.",
        },
        { status: 400 }
      );
    }

    // --- 5. Rate limits ---------------------------------------------------
    const ipHash = hashIdentifier(ip);
    const emailHash = hashIdentifier(email);
    const verdict = await consumeRateLimits([
      {
        scope: "guest-quote:ip-hour",
        subject: ipHash,
        limit: GUEST_QUOTE_LIMITS.perIpHour,
        windowMs: HOUR_MS,
        message: TOO_MANY,
      },
      {
        scope: "guest-quote:ip-day",
        subject: ipHash,
        limit: GUEST_QUOTE_LIMITS.perIpDay,
        windowMs: DAY_MS,
        message: TOO_MANY,
      },
      {
        scope: "guest-quote:email-day",
        subject: emailHash,
        limit: GUEST_QUOTE_LIMITS.perEmailDay,
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
    const parsedSource = await parsePartSourceForm(formData);
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

    // The console reads `notes`, so the company rides there rather than in a
    // column of its own — a labelled first line, and never at the cost of the
    // customer's own words.
    const notes = [contact.company ? `Company: ${contact.company}` : "", customerNotes]
      .filter(Boolean)
      .join("\n")
      .slice(0, MAX_NOTES_CHARS);

    // --- 8. Who this belongs to ------------------------------------------
    // An address we already know keeps its account, guest or not, so a
    // customer's quotes stay in one place and are waiting for them the first
    // time they sign in. An address we do not know gets an unclaimed account.
    //
    // Nothing on an existing row is ever overwritten from a public form: the
    // name and phone on a claimed account belong to the person who signed up,
    // and the submitted ones reach the shop through the notification instead.
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isGuest: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: contact.name,
          email,
          // Unguessable and held by nobody: this account cannot be signed into
          // until someone registers the address and sets a real password.
          password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
          phone: contact.phone,
          isGuest: true,
        },
        select: { id: true, name: true, email: true, isGuest: true },
      });
    }

    let phoneNumberRecord = await prisma.phoneNumber.findFirst({
      where: { userId: user.id, number: contact.phone },
    });
    if (!phoneNumberRecord) {
      phoneNumberRecord = await prisma.phoneNumber.create({
        data: { userId: user.id, number: contact.phone },
      });
    }

    // --- 9. Store the files, then the request -----------------------------
    const storedSource = await storePartSourceFiles(source);
    if ("error" in storedSource) {
      return NextResponse.json({ error: storedSource.error }, { status: 500 });
    }

    const partRequest = await prisma.partRequest.create({
      data: {
        userId: user.id,
        phoneNumberId: phoneNumberRecord.id,
        submissionType: source.submissionType,
        fileId: storedSource.stored.fileId,
        fileName: source.model ? source.model.file.name : null,
        partName: source.partName,
        partDescription: source.partDescription,
        dimensions: source.dimensions,
        quantity,
        material: material || null,
        notes: notes || null,
        // Nothing is built off this form. It is a price request, always.
        quoteRequested: true,
        guestSubmitted: true,
        kind: KIND_QUOTE,
        status: DEFAULT_QUOTE_STATUS,
        dateNeeded: resolvedDate.date,
        ...(storedSource.stored.references.length > 0
          ? { attachments: { create: storedSource.stored.references } }
          : {}),
      },
    });

    const reference = quoteReference(partRequest.id);
    const title = requestTitle({ fileName: partRequest.fileName, partName: partRequest.partName });
    const dateNeeded = format(resolvedDate.date, "PPP");

    // --- 10. Tell the shop, then the customer ----------------------------
    // Both sends are best-effort: a mail failure is logged and never costs the
    // customer the request they just made.
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || email,
        subject: `[No account] Quote request ${reference}: ${title.replace(/[\r\n]/g, "")}`,
        html: NewRequestEmailHTML({
          customerName: contact.name,
          customerEmail: email,
          customerPhone: contact.phone,
          company: contact.company || undefined,
          guestSubmitted: true,
          reference,
          fileName: title,
          submissionType: source.submissionType,
          partDescription: source.partDescription || undefined,
          dimensions: source.dimensions || undefined,
          referenceCount: storedSource.stored.references.length,
          quantity,
          material: material || "Not specified — shop to recommend",
          dateNeeded,
          notes: customerNotes || undefined,
          quoteRequested: true,
        }),
        label: "guest-quote admin notification",
      });
    } catch (emailError) {
      console.error("Failed to send guest quote admin notification:", emailError);
    }

    try {
      await sendEmail({
        to: email,
        subject: `We've got your quote request — ${reference}`,
        html: QuoteReceivedEmailHTML({
          customerName: contact.name,
          reference,
          partTitle: title,
          quantity,
          material: material || "To be recommended",
          dateNeeded,
        }),
        label: "guest-quote customer confirmation",
      });
    } catch (emailError) {
      console.error("Failed to send guest quote confirmation:", emailError);
    }

    return NextResponse.json({ ok: true, reference, email }, { status: 201 });
  } catch (error) {
    console.error("Failed to create guest quote request:", error);
    return NextResponse.json({ error: "Failed to submit this quote request" }, { status: 500 });
  }
}
