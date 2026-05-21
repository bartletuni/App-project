import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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

      // Sanitize file name to prevent Path Traversal
      const sanitizedFileName = file.name.replace(/^.*[\\\/]/, '').replace(/[^a-zA-Z0-9.-]/g, '_');

      const buffer = Buffer.from(await file.arrayBuffer());

      // Securely infer MIME type to prevent Content-Type spoofing / Stored XSS
      let mimeType = "application/octet-stream";
      if (sanitizedFileName.toLowerCase().endsWith(".png")) {
        mimeType = "image/png";
      } else if (sanitizedFileName.toLowerCase().endsWith(".jpg") || sanitizedFileName.toLowerCase().endsWith(".jpeg")) {
        mimeType = "image/jpeg";
      } else if (sanitizedFileName.toLowerCase().endsWith(".webp")) {
        mimeType = "image/webp";
      }
      
      try {
        const fileIdRes = await uploadToR2(sanitizedFileName, mimeType, buffer);
        imageId = fileIdRes || undefined;
      } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error uploading image. Ensure credentials are setup." }, { status: 500 });
      }
    }

    const updateData: any = { 
      name,
      description: description || null,
    };

    if (imageId) {
      updateData.imageId = imageId;
    }

    const material = await prisma.material.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.material.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Material deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
