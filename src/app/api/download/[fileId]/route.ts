import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { s3Client } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// The libSQL client reaches Turso over HTTP with fetch(), which Next caches in
// the Data Cache unless a route opts out. Without these, this route served a
// database read cached from before a schema change — reporting a column as
// missing long after it had been added.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  // Tracks how far the request got, so a ?diag=1 failure says which step threw.
  let stage = "start";

  try {
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    if (fileId.includes('/') || fileId.includes('\\') || fileId.includes('..')) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    stage = "partRequestLookup";
    const partRequest = await prisma.partRequest.findFirst({
      where: { fileId },
    });

    // Reference photos, sketches, and drawings on a described part live in
    // their own table, but belong to the requesting customer just the same.
    stage = "attachmentLookup";
    const attachment = partRequest
      ? null
      : await prisma.requestAttachment.findFirst({
          where: { fileId },
          select: { request: { select: { userId: true } } },
        });

    const ownerId = partRequest?.userId ?? attachment?.request.userId ?? null;

    if (ownerId) {
      // For part requests and their attachments, require authentication and authorization
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (ownerId !== (session.user as any).id && !(session.user as any).isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // If it's not a part request, check if it's a public material image
      stage = "materialLookup";
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

    stage = "buildCommand";
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
    stage = "presign";
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    stage = "redirect";
    return NextResponse.redirect(presignedUrl);
  } catch (error: any) {
    console.error("Failed to generate download link:", error);

    // Temporary: ?diag=1 names the failure so it can be identified without
    // dashboard log access. Reports the shape of the R2 configuration — never
    // its values — alongside the exception. Remove once this is resolved.
    if (req.nextUrl.searchParams.get("diag") === "1") {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
      return NextResponse.json(
        {
          error: "Failed to generate download link",
          stage,
          name: error?.name ?? null,
          message: error?.message ?? null,
          r2: {
            accountIdLength: accountId.length,
            // R2 account ids are 32 hex characters; a pasted endpoint or a
            // stray scheme fails this without revealing the value.
            accountIdIsHex32: /^[0-9a-f]{32}$/i.test(accountId),
            accessKeyIdLength: (process.env.R2_ACCESS_KEY_ID || "").length,
            secretKeyLength: (process.env.R2_SECRET_ACCESS_KEY || "").length,
            bucketNameLength: (process.env.R2_BUCKET_NAME || "").length,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }
}
