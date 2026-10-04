import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCarrier, MAX_SERVICE_LENGTH, MAX_TRACKING_LENGTH } from "@/lib/shipping";

/**
 * Admin-only: the shipment details on a request — tracking number, carrier,
 * and service level.
 *
 * `trackingNumber` is required in every body, as it always has been; an empty
 * string or null clears it. `carrier` and `service` are optional, so a body
 * that only carries a tracking number leaves them as they were. The carrier is
 * checked against the closed set in src/lib/shipping.ts, because the customer's
 * tracking link is built from it.
 */

// See the note in api/download/[fileId]: the libSQL client reaches Turso over
// HTTP with fetch(), which Next caches unless the route opts out.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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
    const body = await req.json().catch(() => null);
    const { trackingNumber, carrier, service } = body ?? {};

    if (trackingNumber === undefined) {
      return NextResponse.json({ error: "Tracking number provided is undefined" }, { status: 400 });
    }

    if (trackingNumber !== null && typeof trackingNumber !== 'string') {
      return NextResponse.json({ error: "Invalid tracking number format" }, { status: 400 });
    }

    if (typeof trackingNumber === 'string' && trackingNumber.length > MAX_TRACKING_LENGTH) {
      return NextResponse.json({ error: "Tracking number exceeds maximum length" }, { status: 400 });
    }

    if (carrier !== undefined && !isCarrier(carrier)) {
      return NextResponse.json({ error: "Unknown carrier" }, { status: 400 });
    }

    if (service !== undefined && service !== null && typeof service !== 'string') {
      return NextResponse.json({ error: "Invalid service format" }, { status: 400 });
    }

    if (typeof service === 'string' && service.length > MAX_SERVICE_LENGTH) {
      return NextResponse.json({ error: "Service exceeds maximum length" }, { status: 400 });
    }

    const partRequest = await prisma.partRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const tracking = typeof trackingNumber === 'string' ? trackingNumber.trim() : "";

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: {
        trackingNumber: tracking === "" ? null : tracking,
        ...(carrier !== undefined && { shippingCarrier: carrier }),
        ...(service !== undefined && {
          shippingService: typeof service === 'string' && service.trim() !== "" ? service.trim() : null,
        }),
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update tracking number:", error);
    return NextResponse.json({ error: "Failed to update tracking number" }, { status: 500 });
  }
}
