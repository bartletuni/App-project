import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

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

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_") || "unnamed_file";
  const objectKey = `${randomUUID()}-${sanitizedFileName}`;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType,
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

/**
 * Remove one object. Throws on failure so a caller can refuse to report a file
 * as deleted when it is not. Deleting a key that is already gone succeeds (S3
 * semantics), which is what makes a retried deletion safe.
 */
export async function deleteFromR2(objectKey: string): Promise<void> {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Missing Cloudflare R2 credentials in environment variables.");
  }

  await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey }));
}

/**
 * Whether an object is still in the bucket.
 *
 * A stored key is not proof the file is there: deleting a file on a customer's
 * request removes the object and leaves the order record behind, so a reorder
 * has to look before it points a new request at one. Answers false only for
 * "not found". Anything else — bad credentials, an outage — throws, so a
 * caller can never mistake a failure to look for a deletion.
 */
export async function objectExistsInR2(objectKey: string): Promise<boolean> {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Missing Cloudflare R2 credentials in environment variables.");
  }

  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }));
    return true;
  } catch (error: any) {
    if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}
