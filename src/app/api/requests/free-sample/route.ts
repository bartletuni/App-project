import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * Whether the signed-in customer may still claim their free PLA 2.0 sample.
 * The composer reads this to decide whether to show the offer at all;
 * `POST /api/requests` re-checks it server-side before honouring the flag, so
 * this endpoint only ever controls what the customer sees, never what is
 * allowed.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const claimed = await prisma.partRequest.count({
    where: { userId, isFreeSample: true },
  });

  return NextResponse.json({ eligible: claimed === 0 });
}
