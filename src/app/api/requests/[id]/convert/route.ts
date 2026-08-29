import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CONVERTED_STATUS,
  KIND_REQUEST,
  MAX_QUOTED_PRICE_CHARS,
  convertability,
} from "@/lib/request-status";

/**
 * Turns a quote into a build request.
 *
 * This is the one way a row crosses from the quote track to the build track:
 * `kind` flips to REQUEST, the status restarts at the front of the build queue
 * ("PENDING"), and `convertedAt` records when it happened. `quoteRequested`
 * deliberately stays true — it is the record that this job was priced first,
 * and the console keeps showing it as such.
 *
 * The quoted price can be set or corrected in the same call, so an admin
 * accepting a price and starting the build is one action rather than two.
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
    try {
      const body = await req.json();
      quotedPrice = body?.quotedPrice;
    } catch {
      quotedPrice = undefined;
    }

    if (quotedPrice !== undefined && quotedPrice !== null && typeof quotedPrice !== "string") {
      return NextResponse.json({ error: "Invalid quoted price format" }, { status: 400 });
    }

    if (typeof quotedPrice === "string" && quotedPrice.length > MAX_QUOTED_PRICE_CHARS) {
      return NextResponse.json({ error: "Quoted price exceeds maximum length" }, { status: 400 });
    }

    const partRequest = await prisma.partRequest.findUnique({ where: { id } });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const allowed = convertability(partRequest);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.reason }, { status: 400 });
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: {
        kind: KIND_REQUEST,
        status: CONVERTED_STATUS,
        convertedAt: new Date(),
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
    console.error("Failed to convert quote:", error);
    return NextResponse.json({ error: "Failed to convert quote" }, { status: 500 });
  }
}
