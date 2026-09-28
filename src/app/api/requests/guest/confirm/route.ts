import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";
import { sendEmail, shopInbox } from "@/lib/email";
import { EstimateDisownedEmailHTML } from "@/lib/email-templates";
import { suppressEmail } from "@/lib/email-suppression";
import { estimateReference } from "@/lib/guest-estimate";
import { isDisownable, isGuestEmailAction, verifyGuestEmailToken } from "@/lib/guest-email";
import { DAY_MS, consumeRateLimits } from "@/lib/rate-limit";

/**
 * POST /api/requests/guest/confirm — the two buttons on /estimate/confirm.
 *
 *   { token, action: "confirm" } — the person at the estimate's email address
 *     says it was them. Stamps `guestEmailConfirmedAt`; the console stops
 *     flagging the row.
 *   { token, action: "disown" }  — they say it was not. The address goes on
 *     the do-not-email list, and the estimate is deleted with every file
 *     uploaded with it — unless the shop has already moved it onto the build
 *     queue, in which case it is left for a person and the shop is told.
 *
 * The token is the only credential, and it is only ever sent to the address on
 * the row: holding it is proof of reading that inbox. It is signed and scoped
 * to one request (src/lib/guest-email.ts), so it is checked before anything
 * touches the database, and a link for one estimate cannot act on another.
 *
 * POST only. The link in the email opens a page that does nothing until a
 * button is pressed, because mail scanners follow every link they see.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LINK_PROBLEM =
  "This link isn't valid or has expired. If you need to reach us about an estimate, call or email the shop.";

const GONE = "There's nothing left to act on — this estimate request has already been removed.";

/**
 * Tell the shop an address disowned an estimate. Once per estimate per day:
 * the token can be replayed for as long as it lives, and replaying it must not
 * become a way to fill the shop's inbox.
 */
async function notifyShop(requestId: string, reference: string, email: string, removed: boolean) {
  const verdict = await consumeRateLimits([
    { scope: "guest-email:disown-notice", subject: requestId, limit: 1, windowMs: DAY_MS, message: "" },
  ]);
  if (!verdict.ok) return;

  await sendEmail({
    to: shopInbox(),
    subject: `[No account] Estimate ${reference} disowned by its email address`,
    html: EstimateDisownedEmailHTML({ reference, email, removed }),
    label: "guest-estimate disowned notice",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = body?.token;
    const action = body?.action;
    if (typeof token !== "string" || !isGuestEmailAction(action)) {
      return NextResponse.json({ error: LINK_PROBLEM }, { status: 400 });
    }

    const verified = verifyGuestEmailToken(token);
    if (!verified.ok) {
      return NextResponse.json({ error: LINK_PROBLEM }, { status: 400 });
    }

    const request = await prisma.partRequest.findUnique({
      where: { id: verified.requestId },
      select: {
        id: true,
        guestEmail: true,
        guestEmailConfirmedAt: true,
        kind: true,
        quoteRequested: true,
        fileId: true,
        convertedAt: true,
        phoneNumberId: true,
        attachments: { select: { fileId: true } },
      },
    });

    // Only a no-account estimate is ever sent one of these links.
    if (!request || !request.guestEmail) {
      return NextResponse.json({ error: GONE }, { status: 404 });
    }
    const reference = estimateReference(request.id);

    if (action === "confirm") {
      if (!request.guestEmailConfirmedAt) {
        await prisma.partRequest.update({
          where: { id: request.id },
          data: { guestEmailConfirmedAt: new Date() },
        });
      }
      return NextResponse.json({ ok: true, action, reference });
    }

    // --- disown ------------------------------------------------------------
    // The address first: whatever else happens, the promise not to email it
    // again is kept from this moment.
    await suppressEmail(request.guestEmail);

    const removed = isDisownable(request);
    if (removed) {
      // Files before the row. If storage refuses, stop while the row still
      // names them, so pressing the button again finishes the job — never a
      // "deleted" message over files that are still there.
      const keys = [request.fileId, ...request.attachments.map((a) => a.fileId)].filter(
        (key): key is string => Boolean(key)
      );
      try {
        for (const key of keys) await deleteFromR2(key);
      } catch (error) {
        console.error(`[guest-email] could not delete files for ${reference}:`, error);
        return NextResponse.json(
          {
            error:
              "We couldn't remove the files just now. Press the button again in a minute — this address won't hear from our estimate form again either way.",
          },
          { status: 503 }
        );
      }

      await prisma.$transaction([
        prisma.requestAttachment.deleteMany({ where: { requestId: request.id } }),
        prisma.partRequest.delete({ where: { id: request.id } }),
        // Created for this estimate alone, under the system guest owner.
        prisma.phoneNumber.deleteMany({
          where: { id: request.phoneNumberId, requests: { none: {} } },
        }),
      ]);
    } else if (request.guestEmailConfirmedAt) {
      // Kept for a person to look at — but no longer vouched for.
      await prisma.partRequest.update({
        where: { id: request.id },
        data: { guestEmailConfirmedAt: null },
      });
    }

    try {
      await notifyShop(request.id, reference, request.guestEmail, removed);
    } catch (error) {
      console.error("[guest-email] disowned notice failed:", error);
    }

    return NextResponse.json({ ok: true, action, reference, removed });
  } catch (error) {
    console.error("Failed to act on a guest estimate confirmation link:", error);
    return NextResponse.json(
      { error: "We couldn't do that just now. Try again in a minute, or call the shop." },
      { status: 500 }
    );
  }
}
