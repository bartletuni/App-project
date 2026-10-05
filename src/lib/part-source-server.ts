import {
  DIRECT_UPLOADS,
  INLINE_TOO_LARGE,
  MAX_DESCRIPTION_CHARS,
  MAX_DIMENSIONS_CHARS,
  MAX_EQUIPMENT_CHARS,
  MAX_INLINE_BYTES,
  MAX_MODEL_BYTES,
  MAX_PART_NAME_CHARS,
  MAX_PART_NUMBER_CHARS,
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_FILES,
  MAX_REFERENCE_TOTAL_BYTES,
  MIN_DESCRIPTION_CHARS,
  MODEL_FILE_REQUIRED,
  MODEL_FILE_TYPE_ERROR,
  MODEL_TOO_LARGE,
  REFERENCES_TOO_LARGE,
  SUBMISSION_DESCRIPTION,
  SubmissionType,
  isModelFileName,
  isReferenceFileName,
  parseSubmissionType,
  totalBytes,
} from "@/lib/part-source";
import { modelMimeType, referenceMimeType } from "@/lib/file-signatures";
import {
  UploadReceipt,
  inspectUpload,
  promoteUpload,
  readReceipt,
} from "@/lib/direct-upload";
import { deleteFromR2, uploadToR2 } from "@/lib/r2";

/**
 * Server-side reading of "what are we making?" off a multipart body.
 *
 * `src/lib/part-source.ts` holds the limits and the client-side check; this is
 * the half that only ever runs on the server, because it reads bytes and
 * checks them against the extension they claim. Three routes take a part
 * submission — the signed-in composer, the admin console's add-request form,
 * and the public no-account estimate form — and none of them may be more
 * trusting than the others about what a file actually contains, so they all
 * come through here.
 *
 * Error strings are the ones the composer's route has always returned, and are
 * asserted by its tests; they are customer-facing copy, so they stay put. The
 * two about which 3D formats are accepted live in part-source.ts beside the
 * list they describe, and change only when that list does.
 */

/**
 * A model that arrived one of two ways: in the form post, as bytes in `buffer`,
 * or straight to storage, as a verified `upload` whose bytes we never held.
 * Exactly one of the two is set.
 */
export interface ParsedModel {
  fileName: string;
  mimeType: string;
  buffer?: Buffer;
  upload?: UploadReceipt;
}

export interface ParsedReference {
  fileName: string;
  mimeType: string;
  buffer?: Buffer;
  upload?: UploadReceipt;
}

export interface ParsedPartSource {
  submissionType: SubmissionType;
  isDescription: boolean;
  /**
   * Present on a MODEL submission that uploaded a file; null on a DESCRIPTION
   * one, and on a reorder that reuses the file already on record.
   */
  model: ParsedModel | null;
  partName: string | null;
  partDescription: string | null;
  dimensions: string | null;
  references: ParsedReference[];
  /** Either lane; null when left blank. The caller folds them into the notes. */
  equipment: string | null;
  partNumber: string | null;
}

export type ParsePartSourceResult = { source: ParsedPartSource } | { error: string };

/**
 * A receipt for a file already sent to storage, believed only after three
 * things: it is genuine and was issued to this caller (readReceipt), it names a
 * kind of file this slot takes, and the object, read back, is the size it was
 * declared and begins with the bytes its extension promises (inspectUpload).
 */
async function verifyUpload(
  token: string,
  scope: string | undefined,
  kind: "model" | "reference"
): Promise<{ receipt: UploadReceipt; mimeType: string } | { error: string }> {
  if (!DIRECT_UPLOADS || !scope) return { error: "Direct uploads are not available here." };

  const read = readReceipt(token, scope, kind);
  if ("error" in read) return read;

  const acceptable =
    kind === "model" ? isModelFileName(read.receipt.fileName) : isReferenceFileName(read.receipt.fileName);
  if (!acceptable) return { error: "That upload could not be verified. Please send the file again." };

  const inspected = await inspectUpload(read.receipt);
  if ("error" in inspected) return inspected;
  return { receipt: read.receipt, mimeType: inspected.mimeType };
}

/**
 * Validate and read the part fields. Nothing is uploaded anywhere until this
 * has returned a source — every check, including the ones that need the file's
 * leading bytes, has passed by then.
 *
 * A file may come in the form post, or — when `uploadScope` is given — as a
 * receipt for a file already sent to storage (src/lib/direct-upload.ts), which
 * is read back and checked here before it is believed.
 *
 * `missingModelOk` is for a reorder, whose file is already on record: a MODEL
 * submission with no upload comes back with `model: null` instead of an error,
 * and the caller must then supply the file from the order being reordered — or
 * refuse. It never loosens anything about a file that *is* uploaded.
 */
export async function parsePartSourceForm(
  formData: FormData,
  options: {
    missingModelOk?: boolean;
    /**
     * Who is submitting, as the upload receipts were issued: `user:<id>` or
     * `guest`. A route that does not pass it does not accept direct uploads at
     * all, and a receipt issued to anyone else is refused.
     */
    uploadScope?: string;
  } = {}
): Promise<ParsePartSourceResult> {
  const submissionType = parseSubmissionType(formData.get("submissionType") as string | null);
  const isDescription = submissionType === SUBMISSION_DESCRIPTION;

  const partNameRaw = formData.get("partName");
  const partDescriptionRaw = formData.get("partDescription");
  const dimensionsRaw = formData.get("dimensions");
  const equipmentRaw = formData.get("equipment");
  const partNumberRaw = formData.get("partNumber");
  const modelUploadRaw = formData.get("modelUpload");
  const referenceUploadsRaw = formData.getAll("referenceUploads");

  if (
    (modelUploadRaw !== null && typeof modelUploadRaw !== "string") ||
    referenceUploadsRaw.some((v) => typeof v !== "string")
  ) {
    return { error: "Invalid input types" };
  }

  if (
    (partNameRaw !== null && typeof partNameRaw !== "string") ||
    (partDescriptionRaw !== null && typeof partDescriptionRaw !== "string") ||
    (dimensionsRaw !== null && typeof dimensionsRaw !== "string") ||
    (equipmentRaw !== null && typeof equipmentRaw !== "string") ||
    (partNumberRaw !== null && typeof partNumberRaw !== "string")
  ) {
    return { error: "Invalid input types" };
  }

  // Optional on both lanes: what the part came off, and the OEM's number for it.
  const equipment = ((equipmentRaw as string) || "").trim() || null;
  const partNumber = ((partNumberRaw as string) || "").trim() || null;
  if (equipment && equipment.length > MAX_EQUIPMENT_CHARS) {
    return { error: `Equipment make and model must be ${MAX_EQUIPMENT_CHARS} characters or fewer` };
  }
  if (partNumber && partNumber.length > MAX_PART_NUMBER_CHARS) {
    return { error: `Part number must be ${MAX_PART_NUMBER_CHARS} characters or fewer` };
  }

  if (!isDescription) {
    const file = formData.get("file") as File | null;

    if (!file && modelUploadRaw) {
      const verified = await verifyUpload(modelUploadRaw as string, options.uploadScope, "model");
      if ("error" in verified) return verified;
      return {
        source: {
          submissionType,
          isDescription,
          model: {
            fileName: verified.receipt.fileName,
            mimeType: verified.mimeType,
            upload: verified.receipt,
          },
          partName: null,
          partDescription: null,
          dimensions: null,
          references: [],
          equipment,
          partNumber,
        },
      };
    }
    if (!file && options.missingModelOk) {
      return {
        source: {
          submissionType,
          isDescription,
          model: null,
          partName: null,
          partDescription: null,
          dimensions: null,
          references: [],
          equipment,
          partNumber,
        },
      };
    }
    if (!file) return { error: MODEL_FILE_REQUIRED };
    if (typeof file === "string" || !file.name) return { error: "Invalid file uploaded" };
    if (file.name.length > 255) return { error: "File name exceeds maximum allowed length" };
    if (!isModelFileName(file.name)) return { error: MODEL_FILE_TYPE_ERROR };
    if (file.size > MAX_MODEL_BYTES) return { error: MODEL_TOO_LARGE };
    // Over the limit for a form post but within the one for a direct upload: a
    // client that should have sent it straight to storage did not.
    if (file.size > MAX_INLINE_BYTES) return { error: INLINE_TOO_LARGE };

    // The extension is only a claim; the leading bytes have to back it up.
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = modelMimeType(file.name, buffer);
    if (!mimeType) return { error: "File content does not match its extension" };

    return {
      source: {
        submissionType,
        isDescription,
        model: { fileName: file.name, buffer, mimeType },
        partName: null,
        partDescription: null,
        dimensions: null,
        references: [],
        equipment,
        partNumber,
      },
    };
  }

  const partName = ((partNameRaw as string) || "").trim();
  const partDescription = ((partDescriptionRaw as string) || "").trim();
  const dimensions = ((dimensionsRaw as string) || "").trim() || null;

  if (!partName) return { error: "Part name is required" };
  if (partName.length > MAX_PART_NAME_CHARS) {
    return { error: `Part name must be ${MAX_PART_NAME_CHARS} characters or fewer` };
  }
  if (partDescription.length < MIN_DESCRIPTION_CHARS) {
    return { error: `Part description must be at least ${MIN_DESCRIPTION_CHARS} characters` };
  }
  if (partDescription.length > MAX_DESCRIPTION_CHARS) {
    return { error: `Part description must be ${MAX_DESCRIPTION_CHARS} characters or fewer` };
  }
  if (dimensions && dimensions.length > MAX_DIMENSIONS_CHARS) {
    return { error: `Approximate size must be ${MAX_DIMENSIONS_CHARS} characters or fewer` };
  }

  // Reference photos/sketches/drawings — only meaningful without a model.
  const referenceFiles = formData.getAll("references").filter((v) => typeof v !== "string") as File[];

  if (referenceFiles.length + referenceUploadsRaw.length > MAX_REFERENCE_FILES) {
    return { error: `Attach at most ${MAX_REFERENCE_FILES} reference files` };
  }

  // Held to a size each and to a total, before any file is read into memory.
  // What rides in the form post is also held to the host's cap, whatever the
  // limit for files sent straight to storage.
  if (referenceFiles.some((f) => f.size > MAX_REFERENCE_BYTES)) {
    return { error: REFERENCES_TOO_LARGE };
  }
  if (totalBytes(referenceFiles) > MAX_INLINE_BYTES) {
    return { error: totalBytes(referenceFiles) > MAX_REFERENCE_TOTAL_BYTES ? REFERENCES_TOO_LARGE : INLINE_TOO_LARGE };
  }

  const references: ParsedReference[] = [];

  // Photos already sent to storage: verify each receipt and read the object back.
  let uploadedBytes = 0;
  for (const token of referenceUploadsRaw as string[]) {
    const verified = await verifyUpload(token, options.uploadScope, "reference");
    if ("error" in verified) return verified;
    uploadedBytes += verified.receipt.size;
    references.push({
      fileName: verified.receipt.fileName,
      mimeType: verified.mimeType,
      upload: verified.receipt,
    });
  }
  if (totalBytes(referenceFiles) + uploadedBytes > MAX_REFERENCE_TOTAL_BYTES) {
    return { error: REFERENCES_TOO_LARGE };
  }

  for (const reference of referenceFiles) {
    if (!reference.name) return { error: "Invalid reference file uploaded" };
    if (reference.name.length > 255) {
      return { error: "Reference file name exceeds maximum allowed length" };
    }
    if (!isReferenceFileName(reference.name)) {
      return { error: "Reference files must be JPG, PNG, WEBP, GIF, HEIC, or PDF" };
    }
    const buffer = Buffer.from(await reference.arrayBuffer());
    const mimeType = referenceMimeType(reference.name, buffer);
    if (!mimeType) return { error: "Reference file content does not match its extension" };
    references.push({ fileName: reference.name, mimeType, buffer });
  }

  return {
    source: {
      submissionType,
      isDescription,
      model: null,
      partName,
      partDescription,
      dimensions,
      references,
      equipment,
      partNumber,
    },
  };
}

/** What a stored submission leaves behind: object keys, ready for the row. */
export interface StoredPartSource {
  /** The model's R2 key, or null on a described part. */
  fileId: string | null;
  /** Rows for `RequestAttachment`, in the order they were submitted. */
  references: { fileId: string; fileName: string; mimeType: string; size: number }[];
}

export type StorePartSourceResult = { stored: StoredPartSource } | { error: string };

/**
 * Put a validated submission into R2. Called only after parsePartSourceForm
 * has approved it, and it is the last thing to happen before the request row
 * is written, so a rejected submission never leaves an orphaned object behind.
 *
 * Never throws: an R2 failure comes back as the message the customer sees.
 */
export async function storePartSourceFiles(source: ParsedPartSource): Promise<StorePartSourceResult> {
  const failure =
    "Error uploading to Cloudflare R2. Ensure the Admin has setup credentials properly.";

  // Everything stored so far, so a failure partway through can take it back
  // out rather than leave files no request will ever point at.
  const stored: string[] = [];

  /** Put one parsed file into permanent storage, whichever way it arrived. */
  const store = async (file: ParsedModel | ParsedReference): Promise<string | null> => {
    const key = file.upload
      ? await promoteUpload(file.upload)
      : file.buffer
        ? await uploadToR2(file.fileName, file.mimeType, file.buffer)
        : null;
    if (key) stored.push(key);
    return key || null;
  };

  try {
    let fileId: string | null = null;
    if (source.model) {
      fileId = await store(source.model);
      if (!fileId) return { error: "Error uploading to Cloudflare R2" };
    }

    const references: StoredPartSource["references"] = [];
    for (const reference of source.references) {
      const referenceId = await store(reference);
      if (!referenceId) {
        await removeStored(stored);
        return { error: "Error uploading to Cloudflare R2" };
      }
      references.push({
        fileId: referenceId,
        fileName: reference.fileName,
        mimeType: reference.mimeType,
        size: reference.upload ? reference.upload.size : (reference.buffer?.length ?? 0),
      });
    }

    return { stored: { fileId, references } };
  } catch (e) {
    console.error(e);
    await removeStored(stored);
    return { error: failure };
  }
}

/** Best-effort removal of files stored for a submission that did not complete. */
async function removeStored(keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      await deleteFromR2(key);
    } catch (error) {
      console.error("Could not remove a file stored for a failed submission:", error);
    }
  }
}
