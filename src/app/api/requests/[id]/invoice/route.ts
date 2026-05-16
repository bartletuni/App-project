import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { InvoiceSentEmailHTML } from "@/lib/email-templates";

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

    const partRequest = await prisma.partRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!partRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await prisma.partRequest.update({
      where: { id },
      data: { invoiceNumber: invoiceNumber === "" ? null : invoiceNumber },
    });

    if (updatedRequest.invoiceNumber && !partRequest.invoiceNumber && updatedRequest.status === "INVOICE SENT") {
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
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update invoice number:", error);
    return NextResponse.json({ error: "Failed to update invoice number" }, { status: 500 });
  }
}
