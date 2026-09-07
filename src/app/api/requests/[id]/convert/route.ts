import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CONVERTED_STATUS,
  KIND_QUOTE,
  KIND_REQUEST,
  MAX_QUOTED_PRICE_CHARS,
  PROMOTED_QUOTE_STATUS,
  RequestKind,
  convertability,
} from "@/lib/request-status";

/**
 * Moves a row forward: an estimate onto the quote track, or either pricing
 * track onto the build queue.
 *
 * `target` says which:
 *
 *   REQUEST (the default) — `kind` flips to REQUEST, the status restarts at the
 *       front of the build queue ("PENDING"), and `convertedAt` records when it
 *       happened. Open to an estimate and to a quote alike: plenty of jobs are
 *       agreed off a ballpark and never need a firm number.
 *   QUOTE — an estimate becomes a price the shop will stand behind. Refused
 *       unless the row qualifies for one: an account to hold the job against,
 *       and the part file we would be printing. That check lives in
 *       `convertability`, so this route cannot be the place it is forgotten.
 *
 * `quoteRequested` deliberately stays true throughout — it is the record that
 * this job was priced first, and the console keeps showing it as such.
 *
 * The price can be set or corrected in the same call, so an admin accepting a
 * price and starting the build is one action rather than two.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = params;

    // The price is optional, and a body is optional with it — an admin who
    // already saved the price just converts.
    let quotedPrice: string | null | undefined;
    let targetRaw: unknown;
    try {
      const body = await req.json();
      quotedPrice = body?.quotedPrice;
      targetRaw = body?.target;
    } catch {
      quotedPrice = undefined;
      targetRaw = undefined;
    }

    if (quotedPrice !== undefined && quotedPrice !== null && typeof quotedPrice !== "string") {
      return NextResponse.json({ error: "Invalid quoted price format" }, { status: 400 });
    }

    if (typeof quotedPrice === "string" && quotedPrice.length > MAX_QUOTED_PRICE_CHARS) {
      return NextResponse.json({ error: "Quoted price exceeds maximum length" }, { status: 400 });
    }

    // Absent means the build queue, which is what this route has always done.
    if (targetRaw !== undefined && targetRaw !== KIND_REQUEST && targetRaw !== KIND_QUOTE) {
      return NextResponse.json(
        { error: `Invalid conversion target. Expected "${KIND_REQUEST}" or "${KIND_QUOTE}".` },
        { status: 400 }
      );
    }
    const target: RequestKind = (targetRaw as RequestKind) || KIND_REQUEST;

    const partRequest = await prisma.partRequest.findUnique({ where: { id } });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const allowed = convertability(partRequest, target);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.reason }, { status: 400 });
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: {
        kind: target,
        status: target === KIND_QUOTE ? PROMOTED_QUOTE_STATUS : CONVERTED_STATUS,
        // Only a move onto the build queue is a conversion in the sense this
        // column records. Promoting an estimate to a quote is still pricing.
        ...(target === KIND_REQUEST ? { convertedAt: new Date() } : {}),
        // Absent means "leave whatever price is already recorded alone"; an
        // empty string clears it.
        ...(quotedPrice === undefined
          ? {}
          : { quotedPrice: quotedPrice === "" ? null : quotedPrice }),
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        phoneNumber: true,
        attachments: true,
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to convert request:", error);
    return NextResponse.json({ error: "Failed to convert request" }, { status: 500 });
  }
}
