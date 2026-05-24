import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET_NAME || "";

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.warn("Missing Cloudflare R2 credentials in environment variables.");
}

export const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId.trim()}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
  },
});

export async function uploadToR2(fileName: string, mimeType: string, fileBuffer: Buffer) {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Missing Cloudflare R2 credentials in environment variables.");
  }

  // Sanitize filename: replace non-alphanumeric, dot, dash, underscore with underscore
  let safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  if (!safeFileName || safeFileName === "" || safeFileName.replace(/_/g, "") === "") {
    safeFileName = "unnamed_file";
  }

  // Infer safe MIME type from extension instead of trusting user input
  const parts = safeFileName.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : "";
  let safeMimeType = "application/octet-stream";

  if (ext === "zip") {
    safeMimeType = "application/zip";
  } else if (ext === "stl") {
    safeMimeType = "application/sla";
  } else if (ext === "png") {
    safeMimeType = "image/png";
  } else if (ext === "jpg" || ext === "jpeg") {
    safeMimeType = "image/jpeg";
  } else if (ext === "webp") {
    safeMimeType = "image/webp";
  } else if (ext === "gif") {
    safeMimeType = "image/gif";
  }

  const objectKey = `${Date.now()}-${safeFileName}`;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: safeMimeType,
      })
    );

    return objectKey;
  } catch (error: any) {
    console.error("=== R2 UPLOAD ERROR ===");
    console.error("Message:", error.message);
    console.error("Name:", error.name);
    console.error("Code:", error.$metadata?.httpStatusCode);
    console.error("Full Error:", error);
    throw new Error(`Failed to upload to R2: ${error.message || error.name}`);
  }
}
