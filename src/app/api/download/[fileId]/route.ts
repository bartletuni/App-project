import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { s3Client } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    if (fileId.includes('/') || fileId.includes('\\') || fileId.includes('..')) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    const partRequest = await prisma.partRequest.findFirst({
      where: { fileId },
    });

    if (partRequest) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (partRequest.userId !== (session.user as any).id && !(session.user as any).isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const material = await prisma.material.findFirst({
        where: { imageId: fileId },
      });
      if (!material) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    const bucketName = process.env.R2_BUCKET_NAME || "";
    if (!bucketName) {
      console.warn("R2_BUCKET_NAME not set");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileId,
    });

    // Generate a presigned URL valid for 1 hour (3600 seconds)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error("Failed to generate download link:", error);
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }
}
