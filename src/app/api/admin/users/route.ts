import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
          id: true,
          name: true,
          email: true,
          phoneNumbers: {
            select: {
              number: true
            },
            take: 1
          },
          isAdmin: true,
          shippingAddress: true,
          billingAddress: true,
          createdAt: true,
      }
    });

    // Map to include the first phone number as a top-level property
    const formattedUsers = users.map((user: any) => ({
      ...user,
      phone: user.phoneNumbers.length > 0 ? user.phoneNumbers[0].number : null,
      phoneNumbers: undefined // remove the array
    }));

    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
