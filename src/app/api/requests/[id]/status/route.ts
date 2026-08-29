import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidStatus, requestKind, statusesFor } from "@/lib/request-status";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    // Validate session and admin status
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { status } = body;

    if (typeof status !== 'string') {
      return NextResponse.json({ error: "Invalid status format" }, { status: 400 });
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

    // A quote and a build request speak different status vocabularies, so what
    // counts as valid depends on which track this row is on. Moving between the
    // two is a conversion, not a status change — see ./convert.
    const kind = requestKind(partRequest);
    if (!isValidStatus(kind, status)) {
      return NextResponse.json(
        {
          error:
            kind === "QUOTE"
              ? `Invalid status for a quote. Expected one of: ${statusesFor(kind).join(", ")}`
              : `Invalid status for a request. Expected one of: ${statusesFor(kind).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
