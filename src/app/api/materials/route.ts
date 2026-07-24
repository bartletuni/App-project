import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    let limit = 50;
    if (limitParam && !isNaN(parseInt(limitParam, 10))) {
      limit = Math.min(parseInt(limitParam, 10), 100);
    }

    let offset = 0;
    if (offsetParam && !isNaN(parseInt(offsetParam, 10))) {
      offset = parseInt(offsetParam, 10);
    }

    const materials = await prisma.material.findMany({
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    });
    return NextResponse.json(materials, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
  }
}
