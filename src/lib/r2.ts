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

  // Sanitize filename to prevent Path Traversal and Stored XSS
  let sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
  if (!sanitizedName) {
    sanitizedName = "unnamed_file";
  }

  // Infer MIME type based on file extension
  let safeMimeType = "application/octet-stream";
  const lowerName = sanitizedName.toLowerCase();
  if (lowerName.endsWith(".stl")) {
    safeMimeType = "application/sla";
  } else if (lowerName.endsWith(".zip")) {
    safeMimeType = "application/zip";
  } else if (lowerName.endsWith(".png")) {
    safeMimeType = "image/png";
  } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    safeMimeType = "image/jpeg";
  } else if (lowerName.endsWith(".webp")) {
    safeMimeType = "image/webp";
  }

  const objectKey = `${Date.now()}-${sanitizedName}`;

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
