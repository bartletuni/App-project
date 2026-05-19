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

import { uploadToR2 } from "@/lib/r2";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;
    const file = formData.get("image") as File | null;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let imageId: string | undefined;

    if (file && typeof file !== "string" && file.name) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Image size exceeds the 5MB limit" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      let mimeType = "application/octet-stream";
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'png') mimeType = "image/png";
      else if (ext === 'jpg' || ext === 'jpeg') mimeType = "image/jpeg";
      else if (ext === 'gif') mimeType = "image/gif";
      else if (ext === 'webp') mimeType = "image/webp";
      
      try {
        const fileIdRes = await uploadToR2(file.name, mimeType, buffer);
        imageId = fileIdRes || undefined;
      } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error uploading image. Ensure credentials are setup." }, { status: 500 });
      }
    }

    const material = await prisma.material.create({
      data: { 
        name,
        description: description || null,
        imageId: imageId || null,
      },
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
