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
      // For part requests, require authentication and authorization
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (partRequest.userId !== (session.user as any).id && !(session.user as any).isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // If it's not a part request, check if it's a public material image
      const material = await prisma.material.findFirst({
        where: { imageId: fileId },
      });
      if (!material) {
        // Since material images are public but this wasn't found,
        // and we want to prevent enumerating files that might exist
        // but aren't materials/requests or user is unauthenticated,
        // we check session here as a fallback boundary for non-public assets.
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      // If material image is found, allow access (public asset)
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

    // inline=1 streams the bytes through this route (same-origin) so the
    // in-browser 3D viewer can fetch STL data without hitting CORS on the
    // presigned R2 URL. Regular downloads keep the redirect.
    if (req.nextUrl.searchParams.get("inline") === "1") {
      const object = await s3Client.send(command);
      if (!object.Body) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      return new NextResponse(object.Body.transformToWebStream() as ReadableStream, {
        headers: {
          "Content-Type": object.ContentType || "application/octet-stream",
          ...(object.ContentLength ? { "Content-Length": String(object.ContentLength) } : {}),
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Generate a presigned URL valid for 1 hour (3600 seconds)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error("Failed to generate download link:", error);
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }
}
