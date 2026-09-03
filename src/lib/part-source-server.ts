import {
  MAX_DESCRIPTION_CHARS,
  MAX_DIMENSIONS_CHARS,
  MAX_MODEL_BYTES,
  MAX_PART_NAME_CHARS,
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_FILES,
  MIN_DESCRIPTION_CHARS,
  SUBMISSION_DESCRIPTION,
  SubmissionType,
  isReferenceFileName,
  parseSubmissionType,
} from "@/lib/part-source";
import { modelMimeType, referenceMimeType } from "@/lib/file-signatures";
import { uploadToR2 } from "@/lib/r2";

/**
 * Server-side reading of "what are we making?" off a multipart body.
 *
 * `src/lib/part-source.ts` holds the limits and the client-side check; this is
 * the half that only ever runs on the server, because it reads bytes and
 * checks them against the extension they claim. Three routes take a part
 * submission — the signed-in composer, the admin console's add-request form,
 * and the public no-account quote form — and none of them may be more
 * trusting than the others about what a file actually contains, so they all
 * come through here.
 *
 * Error strings are the ones the composer's route has always returned, and are
 * asserted by its tests; they are customer-facing copy, so they stay put.
 */

export interface ParsedModel {
  file: File;
  buffer: Buffer;
  mimeType: string;
}

export interface ParsedReference {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface ParsedPartSource {
  submissionType: SubmissionType;
  isDescription: boolean;
  /** Present on a MODEL submission, null on a DESCRIPTION one. */
  model: ParsedModel | null;
  partName: string | null;
  partDescription: string | null;
  dimensions: string | null;
  references: ParsedReference[];
}

export type ParsePartSourceResult = { source: ParsedPartSource } | { error: string };

/**
 * Validate and read the part fields. Nothing is uploaded anywhere until this
 * has returned a source — every check, including the ones that need the file's
 * leading bytes, has passed by then.
 */
export async function parsePartSourceForm(formData: FormData): Promise<ParsePartSourceResult> {
  const submissionType = parseSubmissionType(formData.get("submissionType") as string | null);
  const isDescription = submissionType === SUBMISSION_DESCRIPTION;

  const partNameRaw = formData.get("partName");
  const partDescriptionRaw = formData.get("partDescription");
  const dimensionsRaw = formData.get("dimensions");

  if (
    (partNameRaw !== null && typeof partNameRaw !== "string") ||
    (partDescriptionRaw !== null && typeof partDescriptionRaw !== "string") ||
    (dimensionsRaw !== null && typeof dimensionsRaw !== "string")
  ) {
    return { error: "Invalid input types" };
  }

  if (!isDescription) {
    const file = formData.get("file") as File | null;

    if (!file) return { error: "STL or ZIP file is required" };
    if (typeof file === "string" || !file.name) return { error: "Invalid file uploaded" };
    if (file.name.length > 255) return { error: "File name exceeds maximum allowed length" };
    if (!file.name.toLowerCase().endsWith(".stl") && !file.name.toLowerCase().endsWith(".zip")) {
      return { error: "Only .STL and .ZIP files are allowed" };
    }
    if (file.size > MAX_MODEL_BYTES) return { error: "File size exceeds the 20MB limit" };

    // The extension is only a claim; the leading bytes have to back it up.
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = modelMimeType(file.name, buffer);
    if (!mimeType) return { error: "File content does not match its extension" };

    return {
      source: {
        submissionType,
        isDescription,
        model: { file, buffer, mimeType },
        partName: null,
        partDescription: null,
        dimensions: null,
        references: [],
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

  if (referenceFiles.length > MAX_REFERENCE_FILES) {
    return { error: `Attach at most ${MAX_REFERENCE_FILES} reference files` };
  }

  const references: ParsedReference[] = [];
  for (const reference of referenceFiles) {
    if (!reference.name) return { error: "Invalid reference file uploaded" };
    if (reference.name.length > 255) {
      return { error: "Reference file name exceeds maximum allowed length" };
    }
    if (!isReferenceFileName(reference.name)) {
      return { error: "Reference files must be JPG, PNG, WEBP, GIF, HEIC, or PDF" };
    }
    if (reference.size > MAX_REFERENCE_BYTES) {
      return { error: "Reference file size exceeds the 10MB limit" };
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

  try {
    let fileId: string | null = null;
    if (source.model) {
      fileId = (await uploadToR2(source.model.file.name, source.model.mimeType, source.model.buffer)) || null;
      if (!fileId) return { error: "Error uploading to Cloudflare R2" };
    }

    const references: StoredPartSource["references"] = [];
    for (const reference of source.references) {
      const referenceId = await uploadToR2(reference.fileName, reference.mimeType, reference.buffer);
      if (!referenceId) return { error: "Error uploading to Cloudflare R2" };
      references.push({
        fileId: referenceId,
        fileName: reference.fileName,
        mimeType: reference.mimeType,
        size: reference.buffer.length,
      });
    }

    return { stored: { fileId, references } };
  } catch (e) {
    console.error(e);
    return { error: failure };
  }
}
