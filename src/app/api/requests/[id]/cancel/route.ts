import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = params;

    const partRequest = await prisma.partRequest.findUnique({
      where: { id },
    });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (partRequest.userId !== userId && !(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (partRequest.status === "CANCELLED") {
       return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    }

    // Check if within 30 minutes
    const now = new Date();
    const createdAt = new Date(partRequest.createdAt);
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffInMinutes > 30 && !(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Cancellation period (30 minutes) has expired" }, { status: 400 });
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to cancel request:", error);
    return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
  }
}
