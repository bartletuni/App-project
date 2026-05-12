import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { s3Client } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
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
