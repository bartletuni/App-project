import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredFiles, storedFilesForRequest } from "@/lib/file-deletion";

// See the note in api/download/[fileId]: the libSQL client reaches Turso over
// HTTP with fetch(), which Next caches unless the route opts out.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    }
                },
                phoneNumber: true,
                attachments: true,
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
            where: { id },
            include: { attachments: { select: { fileId: true } } },
        });

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Files before the row, so a storage failure leaves the row naming them
        // and a second press finishes the job (see src/lib/file-deletion.ts).
        try {
            await deleteStoredFiles(await storedFilesForRequest(request));
        } catch (error) {
            console.error(`Could not delete the stored files of request ${id}:`, error);
            return NextResponse.json(
                { error: "Couldn't remove the request's files from storage. Nothing was deleted — try again in a minute." },
                { status: 503 }
            );
        }

        await prisma.$transaction([
            prisma.requestAttachment.deleteMany({ where: { requestId: id } }),
            prisma.partRequest.delete({ where: { id } }),
        ]);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Failed to delete request:", error);
        return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
    }
}
