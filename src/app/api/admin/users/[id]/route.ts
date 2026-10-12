import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredFiles, storedFilesForUser } from "@/lib/file-deletion";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = params;

    const user = await prisma.user.findUnique({ where: { id }, select: { isGuest: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // The system row that owns every no-account estimate (User.isGuest) is not
    // a customer. Deleting it would take every one of those estimates with it.
    if (user.isGuest) {
      return NextResponse.json({ error: "This account cannot be deleted" }, { status: 400 });
    }

    // Closing an account removes the files attached to it (/file-retention).
    // Files before rows, so a storage failure leaves the account intact and a
    // second press finishes the job — see src/lib/file-deletion.ts.
    try {
      await deleteStoredFiles(await storedFilesForUser(id));
    } catch (error) {
      console.error(`Could not delete the stored files of user ${id}:`, error);
      return NextResponse.json(
        { error: "Couldn't remove this client's files from storage. Nothing was deleted — try again in a minute." },
        { status: 503 }
      );
    }

    // Use a transaction to ensure all related data is deleted atomically
    await prisma.$transaction([
      prisma.requestAttachment.deleteMany({
        where: { request: { userId: id } }
      }),
      // Then the PartRequests that owned them
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
