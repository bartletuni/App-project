import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// See the note in api/download/[fileId]: the libSQL client reaches Turso over
// HTTP with fetch(), which Next caches unless the route opts out.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !(session.user as any).isAdmin) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const userId = params.id;

        const phoneNumbers = await prisma.phoneNumber.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(phoneNumbers);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 });
    }
}
