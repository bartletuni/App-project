import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = params;

    // Use a transaction to ensure all related data is deleted atomically
    await prisma.$transaction([
      // First delete dependent PartRequests
      prisma.partRequest.deleteMany({
        where: { userId: id }
      }),
      // Delete dependent PhoneNumbers
      prisma.phoneNumber.deleteMany({
        where: { userId: id }
      }),
      // Finally delete User
      prisma.user.delete({
        where: { id }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
