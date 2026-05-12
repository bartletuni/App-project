import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToDrive } from "@/lib/drive";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const notes = formData.get("notes") as string | null;
    const dateNeededStr = formData.get("dateNeeded") as string | null;
    let phoneNumberString = formData.get("phoneNumber") as string | null;

    if (!file) {
      return NextResponse.json({ error: "STL file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".stl")) {
        return NextResponse.json({ error: "Only .STL files are allowed" }, { status: 400 });
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
    dateNeeded.setHours(0,0,0,0);
    minDate.setHours(0,0,0,0);

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

    // Convert file to Buffer and Upload to Drive
    const buffer = Buffer.from(await file.arrayBuffer());
    let fileId: string | undefined;

    try {
        const fileIdRes = await uploadToDrive(file.name, file.type || "application/sla", buffer);
        fileId = fileIdRes || undefined;
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error uploading to Google Drive. Ensure the Admin has setup credentials properly." }, { status: 500 });
    }

    if (!fileId) {
         return NextResponse.json({ error: "Error uploading to Google Drive" }, { status: 500 });
    }

    // Create Part Request
    const partRequest = await prisma.partRequest.create({
      data: {
        userId,
        phoneNumberId: phoneNumberRecord.id,
        fileId,
        fileName: file.name,
        notes,
        dateNeeded,
      },
    });

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

        let requests;

        if (isAdmin) {
             requests = await prisma.partRequest.findMany({
                include: {
                    user: true,
                    phoneNumber: true,
                },
                orderBy: { createdAt: 'desc'}
            });
        } else {
             requests = await prisma.partRequest.findMany({
                where: { userId },
                include: {
                    phoneNumber: true,
                },
                orderBy: { createdAt: 'desc'}
            });
        }

        return NextResponse.json(requests);

    } catch (error) {
         return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }
}
