import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { StatusUpdateEmailHTML } from "@/lib/email-templates";
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

    const partRequest = await prisma.partRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: { trackingNumber: trackingNumber === "" ? null : trackingNumber },
    });

    if (updatedRequest.trackingNumber && !partRequest.trackingNumber && updatedRequest.status === "SHIPPED") {
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: 'TakomoCo <onboarding@resend.dev>',
            to: partRequest.user.email,
            subject: `Order SHIPPED: ${updatedRequest.fileName}`,
            html: StatusUpdateEmailHTML({
              customerName: partRequest.user.name || "Customer",
              fileName: updatedRequest.fileName,
              status: "SHIPPED",
              message: "Your requested part has been shipped!",
              trackingNumber: updatedRequest.trackingNumber,
            }),
          });
        }
      } catch (emailError) {
        console.error("Failed to send tracking email notification:", emailError);
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update tracking number:", error);
    return NextResponse.json({ error: "Failed to update tracking number" }, { status: 500 });
  }
}
