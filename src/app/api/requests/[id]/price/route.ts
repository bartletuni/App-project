import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_QUOTED_PRICE_CHARS } from "@/lib/request-status";

/**
 * Records the price the shop worked out, so it is on the row before anyone
 * decides whether to convert it. Free text, like the invoice and tracking
 * numbers beside it — it may carry a currency, a range, or a caveat.
 *
 * The same field holds an estimate and a quote; the row's `kind` is what says
 * whether the number is an indication or one the shop stands behind. The
 * column is still called `quotedPrice`, which predates the split.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { quotedPrice } = body;

    if (quotedPrice === undefined) {
      return NextResponse.json({ error: "Quoted price provided is undefined" }, { status: 400 });
    }

    if (quotedPrice !== null && quotedPrice !== "" && typeof quotedPrice !== "string") {
      return NextResponse.json({ error: "Invalid quoted price format" }, { status: 400 });
    }

    if (typeof quotedPrice === "string" && quotedPrice.length > MAX_QUOTED_PRICE_CHARS) {
      return NextResponse.json({ error: "Quoted price exceeds maximum length" }, { status: 400 });
    }

    const partRequest = await prisma.partRequest.findUnique({ where: { id } });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: { quotedPrice: quotedPrice === "" ? null : quotedPrice },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update the price:", error);
    return NextResponse.json({ error: "Failed to update the price" }, { status: 500 });
  }
}
