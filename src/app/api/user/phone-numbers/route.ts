import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// See the note in api/download/[fileId]: the libSQL client reaches Turso over
// HTTP with fetch(), which Next caches unless the route opts out.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const limitParam = req.nextUrl.searchParams.get("limit");

        let limit = 50; // Default limit
        if (limitParam) {
            const parsedLimit = parseInt(limitParam, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                limit = Math.min(parsedLimit, 100);
            }
        }

        const phoneNumbers = await prisma.phoneNumber.findMany({
            where: { userId },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(phoneNumbers);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 });
    }
}
