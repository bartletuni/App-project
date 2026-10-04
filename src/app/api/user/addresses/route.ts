import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * A signed-in customer's own shipping and billing addresses.
 *
 * The Terms (§02) put a part shipped to a stale address at the customer's
 * risk, and the Privacy Policy (§08) and the welcome email both say the
 * addresses can be corrected from Account settings — so this route is what
 * makes those sentences true. Parts go out by USPS to whatever this holds
 * when they ship; a change made afterwards does not reach a parcel already
 * in the post.
 *
 * Same limits as registration: both fields are required strings of at most
 * 500 characters. Only the session's own row is ever read or written.
 */

// See the note in api/download/[fileId]: the libSQL client reaches Turso over
// HTTP with fetch(), which Next caches unless the route opts out.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const MAX_ADDRESS_LENGTH = 500;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { shippingAddress: true, billingAddress: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      shippingAddress: user.shippingAddress ?? "",
      billingAddress: user.billingAddress ?? "",
    });
  } catch (error) {
    console.error("Error reading addresses:", error);
    return NextResponse.json({ error: "Failed to load addresses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { shippingAddress, billingAddress } = body ?? {};

    if (typeof shippingAddress !== "string" || typeof billingAddress !== "string") {
      return NextResponse.json({ error: "Invalid input type" }, { status: 400 });
    }

    const shipping = shippingAddress.trim();
    const billing = billingAddress.trim();

    if (!shipping || !billing) {
      return NextResponse.json(
        { error: "Both a shipping and a billing address are required" },
        { status: 400 }
      );
    }

    if (shipping.length > MAX_ADDRESS_LENGTH || billing.length > MAX_ADDRESS_LENGTH) {
      return NextResponse.json(
        { error: `Addresses must not exceed ${MAX_ADDRESS_LENGTH} characters` },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    await prisma.user.update({
      where: { id: userId },
      data: { shippingAddress: shipping, billingAddress: billing },
    });

    return NextResponse.json({ success: true, shippingAddress: shipping, billingAddress: billing });
  } catch (error) {
    console.error("Error updating addresses:", error);
    return NextResponse.json({ error: "Failed to update addresses" }, { status: 500 });
  }
}
