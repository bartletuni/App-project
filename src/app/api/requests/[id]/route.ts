import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const isAdmin = (session.user as any).isAdmin;
        const { id } = params;

        const request = await prisma.partRequest.findUnique({
            where: { id },
            include: {
                user: true,
                phoneNumber: true,
            }
        });

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (request.userId !== userId && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(request);

    } catch (error) {
        console.error("Failed to fetch request:", error);
        return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = (session.user as any).isAdmin;

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const { id } = params;

        const request = await prisma.partRequest.findUnique({
            where: { id }
        });

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        await prisma.partRequest.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Failed to delete request:", error);
        return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
    }
}
