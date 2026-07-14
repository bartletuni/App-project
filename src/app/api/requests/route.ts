import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import { addDays, format } from "date-fns";
import { Resend } from "resend";
import { NewRequestEmailHTML } from "@/lib/email-templates";
import { validateCustomSettings, summarizeSettings, CustomPrintSettings } from "@/lib/print-settings";
 
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
    const requestedUserId = formData.get("userId") as string | null;
    const printSettingsRaw = formData.get("printSettings") as string | null;

    // Optional custom slicer settings; absent/empty means AUTO.
    let customSettings: CustomPrintSettings | null = null;
    if (printSettingsRaw) {
      if (printSettingsRaw.length > 5000) {
        return NextResponse.json({ error: "Print settings payload too large" }, { status: 400 });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(printSettingsRaw);
      } catch {
        return NextResponse.json({ error: "Invalid print settings" }, { status: 400 });
      }
      const result = validateCustomSettings(parsed);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      customSettings = result.settings;
    }

    const quantity = quantityStr ? parseInt(quantityStr, 10) : 1;

    if (isNaN(quantity) || quantity < 1 || quantity > 10000) {
      return NextResponse.json({ error: "Invalid quantity provided" }, { status: 400 });
    }

    if (notes && notes.length > 2000) {
       return NextResponse.json({ error: "Notes exceed maximum allowed length" }, { status: 400 });
    }

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

    // Convert file to Buffer early for magic number validation
    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic number validation for ZIP, ASCII STL, and Binary STL
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
    const isAsciiStl = buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii").toLowerCase() === "solid";
    let isBinaryStl = false;
    if (buffer.length >= 84) {
      const triangleCount = buffer.readUInt32LE(80);
      const expectedSize = 84 + (triangleCount * 50);
      isBinaryStl = buffer.length === expectedSize;
    }

    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === "zip" && !isZip) {
      return NextResponse.json({ error: "File content does not match its extension" }, { status: 400 });
    } else if (ext === "stl" && !isAsciiStl && !isBinaryStl) {
      return NextResponse.json({ error: "File content does not match its extension" }, { status: 400 });
    } else if (ext !== "zip" && ext !== "stl") {
      // Just in case it bypassed the first check (shouldn't happen)
      return NextResponse.json({ error: "Only .STL and .ZIP files are allowed" }, { status: 400 });
    }

    if (!dateNeededStr) {
      return NextResponse.json({ error: "Date needed is required" }, { status: 400 });
    }

    if (!phoneNumberString) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (phoneNumberString.length > 50) {
      return NextResponse.json({ error: "Phone number exceeds maximum length" }, { status: 400 });
    }

    const dateNeeded = new Date(dateNeededStr);
    const minDate = addDays(new Date(), 3);

    // reset time part for comparison
    dateNeeded.setHours(0, 0, 0, 0);
    minDate.setHours(0, 0, 0, 0);

    if (dateNeeded < minDate) {
      return NextResponse.json({ error: "Lead time must be at least 3 days" }, { status: 400 });
    }

    // Handle Target User
    const isAdmin = (session.user as any).isAdmin;
    let targetUserId = (session.user as any).id;
    let targetUserEmail = session.user?.email || "N/A";
    let targetUserName = session.user?.name || "Customer";

    if (isAdmin && requestedUserId) {
      const requestedUser = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true, email: true, name: true }
      });
      if (requestedUser) {
        targetUserId = requestedUser.id;
        targetUserEmail = requestedUser.email;
        targetUserName = requestedUser.name || "Customer";
      }
    }

    // Handle Phone Number
    let phoneNumberRecord = await prisma.phoneNumber.findFirst({
      where: { userId: targetUserId, number: phoneNumberString }
    });

    if (!phoneNumberRecord) {
      phoneNumberRecord = await prisma.phoneNumber.create({
        data: {
          userId: targetUserId,
          number: phoneNumberString
        }
      });
    }

    let fileId: string | undefined;

    try {
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
        userId: targetUserId,
        phoneNumberId: phoneNumberRecord.id,
        fileId,
        fileName: file.name,
        quantity,
        material,
        notes,
        printSettings: customSettings ? JSON.stringify(customSettings) : null,
        dateNeeded,
      },
    });

    // Send Email Notification
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        // Sanitize to prevent Email Header (CRLF) Injection
        const safeFileName = file.name.replace(/[\r\n]/g, '');
        await resend.emails.send({
          from: 'TakomoCo <onboarding@resend.dev>',
          to: process.env.ADMIN_EMAIL || (session.user as any).email, // Send to admin or fall back to user
          subject: `New Request: ${safeFileName}`,
          html: NewRequestEmailHTML({
            customerName: targetUserName,
            customerEmail: targetUserEmail,
            fileName: file.name,
            quantity,
            material: material || "Not specified",
            dateNeeded: format(dateNeeded, "PPP"),
            notes: notes || undefined,
            printSettings: summarizeSettings(customSettings),
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
