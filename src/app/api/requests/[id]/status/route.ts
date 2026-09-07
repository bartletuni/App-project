import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kindLabel, requestKind, statusOptionsFor } from "@/lib/request-status";

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

    // An estimate, a quote and a build request speak three different status
    // vocabularies, so what counts as valid depends on which track this row is
    // on. Moving between them is a conversion, not a status change — see
    // ./convert.
    //
    // `statusOptionsFor` rather than the bare track list, so a row still
    // carrying a status from before the estimate track existed can be re-saved
    // as-is rather than being stuck behind a menu that has no room for it.
    const kind = requestKind(partRequest);
    const allowed = statusOptionsFor(partRequest);
    if (!allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status for ${
            kind === "ESTIMATE" ? "an" : "a"
          } ${kindLabel(kind).toLowerCase()}. Expected one of: ${allowed.join(", ")}`,
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
