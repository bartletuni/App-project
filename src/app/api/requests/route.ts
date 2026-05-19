import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import { addDays, format } from "date-fns";
import { Resend } from "resend";
import { NewRequestEmailHTML } from "@/lib/email-templates";
 
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const quantityStr = formData.get("quantity") as string | null;
    const notes = formData.get("notes") as string | null;
    const material = formData.get("material") as string | null;
    const dateNeededStr = formData.get("dateNeeded") as string | null;
    let phoneNumberString = formData.get("phoneNumber") as string | null;

    const quantity = quantityStr ? parseInt(quantityStr, 10) : 1;

    if (!file) {
      return NextResponse.json({ error: "STL or ZIP file is required" }, { status: 400 });
    }

    if (typeof file === "string" || !file.name) {
      return NextResponse.json({ error: "Invalid file uploaded" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".stl") && !file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only .STL and .ZIP files are allowed" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds the 20MB limit" }, { status: 400 });
    }

    if (!dateNeededStr) {
      return NextResponse.json({ error: "Date needed is required" }, { status: 400 });
    }

    if (!phoneNumberString) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const dateNeeded = new Date(dateNeededStr);
    const minDate = addDays(new Date(), 5);

    // reset time part for comparison
    dateNeeded.setHours(0, 0, 0, 0);
    minDate.setHours(0, 0, 0, 0);

    if (dateNeeded < minDate) {
      return NextResponse.json({ error: "Lead time must be at least 5 days" }, { status: 400 });
    }

    // Handle Phone Number
    const userId = (session.user as any).id;
    let phoneNumberRecord = await prisma.phoneNumber.findFirst({
      where: { userId: userId, number: phoneNumberString }
    });

    if (!phoneNumberRecord) {
      phoneNumberRecord = await prisma.phoneNumber.create({
        data: {
          userId,
          number: phoneNumberString
        }
      });
    }

    // Convert file to Buffer and Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    let fileId: string | undefined;

    try {
      // Security: Infer MIME type strictly from file extension, do NOT trust user-provided file.type
      let mimeType = "application/octet-stream";
      if (file.name.toLowerCase().endsWith(".zip")) {
        mimeType = "application/zip";
      } else if (file.name.toLowerCase().endsWith(".stl")) {
        mimeType = "application/sla";
      }

      const fileIdRes = await uploadToR2(file.name, mimeType, buffer);
      fileId = fileIdRes || undefined;
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Error uploading to Cloudflare R2. Ensure the Admin has setup credentials properly." }, { status: 500 });
    }

    if (!fileId) {
      return NextResponse.json({ error: "Error uploading to Cloudflare R2" }, { status: 500 });
    }

    // Create Part Request
    const partRequest = await prisma.partRequest.create({
      data: {
        userId,
        phoneNumberId: phoneNumberRecord.id,
        fileId,
        fileName: file.name,
        quantity,
        material,
        notes,
        dateNeeded,
      },
    });

    // Send Email Notification
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: 'TakomoCo <onboarding@resend.dev>',
          to: process.env.ADMIN_EMAIL || (session.user as any).email, // Send to admin or fall back to user
          subject: `New Request: ${file.name}`,
          html: NewRequestEmailHTML({
            customerName: session.user?.name || "Customer",
            customerEmail: session.user?.email || "N/A",
            fileName: file.name,
            quantity,
            material: material || "Not specified",
            dateNeeded: format(dateNeeded, "PPP"),
            notes: notes || undefined,
          }),
        });
      }
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // We don't return an error here because the request was successfully created in the DB
    }

    return NextResponse.json(partRequest, { status: 201 });
  } catch (error) {
    console.error("Failed to create request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).isAdmin;

    const startDateParam = req.nextUrl.searchParams.get("startDate");
    const endDateParam = req.nextUrl.searchParams.get("endDate");

    let dateFilter: any = {};
    if (startDateParam && endDateParam) {
      dateFilter = {
        createdAt: {
          gte: new Date(`${startDateParam}T00:00:00.000Z`),
          lte: new Date(`${endDateParam}T23:59:59.999Z`),
        }
      };
    }

    let requests;

    if (isAdmin) {
      // Admin can see all requests
      requests = await prisma.partRequest.findMany({
        where: {
          ...dateFilter,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          phoneNumber: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Ensure normal users can ONLY see their own requests
      requests = await prisma.partRequest.findMany({
        where: {
          userId,
          ...dateFilter,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          phoneNumber: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json(requests);

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
