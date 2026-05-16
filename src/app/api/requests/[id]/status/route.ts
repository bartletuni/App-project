import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { InvoiceSentEmailHTML, StatusUpdateEmailHTML } from "@/lib/email-templates";

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

    // Validate valid statuses
    const validStatuses = ["PENDING", "ACTIVE", "COMPLETED", "NEEDS REVIEW", "CANCELLED", "INVOICE SENT", "SHIPPED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status provided" }, { status: 400 });
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
      data: { status },
    });

    if (status === "INVOICE SENT" && partRequest.status !== "INVOICE SENT" && updatedRequest.invoiceNumber) {
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: 'TakomoCo <onboarding@resend.dev>',
            to: partRequest.user.email,
            subject: `Invoice Sent: ${updatedRequest.fileName}`,
            html: InvoiceSentEmailHTML({
              customerName: partRequest.user.name || "Customer",
              fileName: updatedRequest.fileName,
              invoiceNumber: updatedRequest.invoiceNumber,
            }),
          });
        }
      } catch (emailError) {
        console.error("Failed to send invoice email notification:", emailError);
      }
    } else if ((status === "SHIPPED" && partRequest.status !== "SHIPPED") || (status === "COMPLETED" && partRequest.status !== "COMPLETED")) {
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          let message = "";
          if (status === "SHIPPED") {
            message = "Your requested part has been shipped!";
          } else if (status === "COMPLETED") {
            message = "Your requested part has been completed and is ready!";
          }
          await resend.emails.send({
            from: 'TakomoCo <onboarding@resend.dev>',
            to: partRequest.user.email,
            subject: `Order ${status}: ${updatedRequest.fileName}`,
            html: StatusUpdateEmailHTML({
              customerName: partRequest.user.name || "Customer",
              fileName: updatedRequest.fileName,
              status: status,
              message: message,
              trackingNumber: updatedRequest.trackingNumber,
            }),
          });
        }
      } catch (emailError) {
        console.error(`Failed to send ${status} email notification:`, emailError);
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
