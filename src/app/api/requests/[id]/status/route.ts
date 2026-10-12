import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerStatusMessage, kindLabel, requestKind, statusOptionsFor } from "@/lib/request-status";
import { requestTitle } from "@/lib/part-source";
import { isGuestRequest } from "@/lib/guest-estimate";
import { sendEmail } from "@/lib/email";
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
            isGuest: true,
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

    // Tell the customer, when this is a status they would want to hear about
    // (customerStatusMessage) and it actually changed. Best-effort like every
    // send here: a mail failure is logged and never undoes the status change.
    if (partRequest.status !== status) {
      await notifyCustomer({ ...partRequest, status, kind });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Failed to update status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

/**
 * Account holders only. A no-account estimate is owned by the system guest
 * row, and the address on it is only what somebody typed into a public form —
 * that address hears from the estimate form once and never from here.
 */
async function notifyCustomer(request: {
  id: string;
  status: string;
  kind: string;
  fileName: string | null;
  partName: string | null;
  invoiceNumber: string | null;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  shippingService: string | null;
  guestEmail: string | null;
  user: { email: string; name: string; isGuest: boolean } | null;
}): Promise<void> {
  const message = customerStatusMessage(request.status);
  if (!message || !request.user || request.user.isGuest || isGuestRequest(request)) return;

  const fileName = requestTitle(request);
  const customerName = request.user.name;
  // Strip line breaks from anything that reaches a header.
  const safeTitle = fileName.replace(/[\r\n]/g, "");

  try {
    if (request.status === "INVOICE SENT" && request.invoiceNumber) {
      await sendEmail({
        to: request.user.email,
        subject: `Invoice ${request.invoiceNumber.replace(/[\r\n]/g, "")} for ${safeTitle}`,
        html: InvoiceSentEmailHTML({ customerName, fileName, invoiceNumber: request.invoiceNumber }),
        label: `invoice-sent notice for ${request.id}`,
      });
      return;
    }

    await sendEmail({
      to: request.user.email,
      subject: `Status update: ${request.status} — ${safeTitle}`,
      html: StatusUpdateEmailHTML({
        customerName,
        fileName,
        status: request.status,
        message,
        trackingNumber: request.status === "SHIPPED" ? request.trackingNumber : null,
        shippingCarrier: request.shippingCarrier,
        shippingService: request.shippingService,
        kind: request.kind,
      }),
      label: `status notice (${request.status}) for ${request.id}`,
    });
  } catch (error) {
    console.error(`[email] status notice for ${request.id} failed:`, error);
  }
}
