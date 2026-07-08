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
    const { invoiceNumber } = body;

    if (invoiceNumber === undefined) {
      return NextResponse.json({ error: "Invoice number provided is undefined" }, { status: 400 });
    }

    if (invoiceNumber !== null && invoiceNumber !== "" && typeof invoiceNumber !== 'string') {
      return NextResponse.json({ error: "Invalid invoice number format" }, { status: 400 });
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
      data: { invoiceNumber: invoiceNumber === "" ? null : invoiceNumber },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update invoice number:", error);
    return NextResponse.json({ error: "Failed to update invoice number" }, { status: 500 });
  }
}
