import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    let page = parseInt(pageParam || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(limitParam || '20', 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100; // Enforce maximum limit

    const skip = (page - 1) * limit;

    // The system row that owns no-account quotes is not a client and must not
    // be listed as one — see User.isGuest.
    const realClients = { isGuest: false };

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: realClients,
        skip,
        take: limit,
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
      }),
      prisma.user.count({ where: realClients })
    ]);

    // Map to include the first phone number as a top-level property
    const formattedUsers = users.map((user: any) => ({
      ...user,
      phone: user.phoneNumbers.length > 0 ? user.phoneNumbers[0].number : null,
      phoneNumbers: undefined // remove the array
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      users: formattedUsers,
      totalCount,
      page,
      limit,
      totalPages
    });

  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
