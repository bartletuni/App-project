import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: { name },
    });

    return NextResponse.json(material);
  } catch (error: any) {
    console.error("Failed to create material:", error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Material already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create material: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
