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

    const tensileStrengthStr = formData.get("tensileStrength") as string | null;
    const stiffnessStr = formData.get("stiffness") as string | null;
    const hdtStr = formData.get("hdt") as string | null;
    const impactResistanceStr = formData.get("impactResistance") as string | null;

    const tensileStrength = (tensileStrengthStr && !isNaN(parseFloat(tensileStrengthStr))) ? parseFloat(tensileStrengthStr) : null;
    const stiffness = (stiffnessStr && !isNaN(parseFloat(stiffnessStr))) ? parseFloat(stiffnessStr) : null;
    const hdt = (hdtStr && !isNaN(parseFloat(hdtStr))) ? parseFloat(hdtStr) : null;
    const impactResistance = (impactResistanceStr && !isNaN(parseFloat(impactResistanceStr))) ? parseFloat(impactResistanceStr) : null;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Name must not exceed 100 characters" }, { status: 400 });
    }

    if (description && description.length > 1000) {
      return NextResponse.json({ error: "Description must not exceed 1000 characters" }, { status: 400 });
    }

    let imageId: string | undefined;

    if (file && typeof file !== "string" && file.name) {
      if (file.name.length > 255) {
        return NextResponse.json({ error: "File name exceeds maximum allowed length" }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Image size exceeds the 5MB limit" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      let mimeType = "application/octet-stream";
      const fileNameLower = file.name.toLowerCase();

      const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      const isWebp = buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
      const isGif = buffer.length > 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;

      if (fileNameLower.endsWith(".png") && isPng) {
        mimeType = "image/png";
      } else if ((fileNameLower.endsWith(".jpg") || fileNameLower.endsWith(".jpeg")) && isJpeg) {
        mimeType = "image/jpeg";
      } else if (fileNameLower.endsWith(".webp") && isWebp) {
        mimeType = "image/webp";
      } else if (fileNameLower.endsWith(".gif") && isGif) {
        mimeType = "image/gif";
      } else {
        return NextResponse.json({ error: "Invalid image format. Only PNG, JPEG, WEBP, and GIF are allowed." }, { status: 400 });
      }
      
      try {
        const fileIdRes = await uploadToR2(file.name, mimeType, buffer);
        imageId = fileIdRes || undefined;
      } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error uploading image. Ensure credentials are setup." }, { status: 500 });
      }
    }

    const updateData: any = { 
      name,
      description: description || null,
      tensileStrength,
      stiffness,
      hdt,
      impactResistance,
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
