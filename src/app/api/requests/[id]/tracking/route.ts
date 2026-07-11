import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const { trackingNumber } = body;

    if (trackingNumber === undefined) {
      return NextResponse.json({ error: "Tracking number provided is undefined" }, { status: 400 });
    }

    if (trackingNumber !== null && trackingNumber !== "" && typeof trackingNumber !== 'string') {
      return NextResponse.json({ error: "Invalid tracking number format" }, { status: 400 });
    }

    if (typeof trackingNumber === 'string' && trackingNumber.length > 100) {
      return NextResponse.json({ error: "Tracking number exceeds maximum length" }, { status: 400 });
    }

    const partRequest = await prisma.partRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: { trackingNumber: trackingNumber === "" ? null : trackingNumber },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update tracking number:", error);
    return NextResponse.json({ error: "Failed to update tracking number" }, { status: 500 });
  }
}
