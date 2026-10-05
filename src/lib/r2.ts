import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
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

// `R2_ENDPOINT` exists so the upload flow can be exercised against a local
// S3-compatible server; production leaves it unset and talks to Cloudflare.
const endpointOverride = process.env.R2_ENDPOINT || "";

export const s3Client = new S3Client({
  region: "auto",
  endpoint: endpointOverride || `https://${accountId.trim()}.r2.cloudflarestorage.com`,
  forcePathStyle: Boolean(endpointOverride),
  credentials: {
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
  },
});

/**
 * A fresh object key for a file name: a random prefix, so two files with the
 * same name never collide, and the name with anything but letters, digits,
 * dots, hyphens and underscores replaced. `prefix` is for the pending area
 * (see src/lib/direct-upload.ts); a stored file's key has none, because
 * /api/download/[fileId] refuses an id containing a slash.
 */
export function newObjectKey(fileName: string, prefix = ""): string {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_") || "unnamed_file";
  return `${prefix}${randomUUID()}-${sanitizedFileName}`;
}

export async function uploadToR2(fileName: string, mimeType: string, fileBuffer: Buffer) {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Missing Cloudflare R2 credentials in environment variables.");
  }

  const objectKey = newObjectKey(fileName);

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

function requireConfigured() {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Missing Cloudflare R2 credentials in environment variables.");
  }
}

/**
 * A URL the browser can PUT one file to, straight to the bucket, without the
 * bytes passing through our server (and so without the host's request-body
 * cap).
 *
 * The URL is signed over the content type AND the content length, so it is good
 * for one exact thing: a PUT of exactly `contentLength` bytes, labelled
 * `contentType`. A client cannot use it to store something bigger or something
 * called something else. The server still verifies what arrived before it
 * trusts it — see inspectUpload in src/lib/direct-upload.ts — because that
 * binding is only as good as the storage service's enforcement of it.
 */
export async function presignPutUrl(options: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds: number;
}): Promise<string> {
  requireConfigured();
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: options.key,
      ContentType: options.contentType,
      ContentLength: options.contentLength,
    }),
    {
      expiresIn: options.expiresInSeconds,
      signableHeaders: new Set(["content-type", "content-length"]),
    }
  );
}

/**
 * The first `bytes` bytes of an object and its total size, in one request, or
 * null when there is no such object (or it is empty). Enough to check a file's
 * signature without reading the file.
 */
export async function readObjectStart(
  key: string,
  bytes: number
): Promise<{ head: Buffer; totalSize: number } | null> {
  requireConfigured();
  try {
    const object = await s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key, Range: `bytes=0-${bytes - 1}` })
    );
    const head = Buffer.from(await object.Body!.transformToByteArray());
    // "bytes 0-1023/52428800": the figure after the slash is the whole object.
    const total = /\/(\d+)$/.exec(object.ContentRange || "")?.[1];
    return { head, totalSize: total ? Number(total) : head.length };
  } catch (error: any) {
    // A missing key, or a range past the end of an empty object.
    if (
      error?.name === "NoSuchKey" ||
      error?.name === "NotFound" ||
      error?.name === "InvalidRange" ||
      error?.$metadata?.httpStatusCode === 404 ||
      error?.$metadata?.httpStatusCode === 416
    ) {
      return null;
    }
    throw error;
  }
}

/** Copy an object inside the bucket. Throws on failure. */
export async function copyWithinR2(sourceKey: string, destinationKey: string): Promise<void> {
  requireConfigured();
  const source = sourceKey.split("/").map(encodeURIComponent).join("/");
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      Key: destinationKey,
      CopySource: `${bucketName}/${source}`,
    })
  );
}

/** Keys under a prefix, with when each was last written. One page, newest not guaranteed. */
export async function listObjectsInR2(
  prefix: string,
  maxKeys: number
): Promise<{ key: string; lastModified: Date }[]> {
  requireConfigured();
  const page = await s3Client.send(
    new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix, MaxKeys: maxKeys })
  );
  return (page.Contents || []).flatMap((o) =>
    o.Key && o.LastModified ? [{ key: o.Key, lastModified: o.LastModified }] : []
  );
}
