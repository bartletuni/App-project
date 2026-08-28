/**
 * How a part reaches the shop.
 *
 * A request arrives one of two ways:
 *
 *   MODEL       — the customer uploaded an .stl or .zip. This is the original
 *                 path and is unchanged.
 *   DESCRIPTION — the customer has no 3D file. They name the part, describe it,
 *                 and (usually) attach photos or a sketch, and we draw the model
 *                 for them. These are always quoted before anything is built,
 *                 because there is nothing to price until we have modelled it.
 *
 * Everything here is shared by the customer composer, the admin console's
 * "add request" form, and the API route that stores the submission, so the two
 * forms and the server agree on limits and error wording.
 */

export type SubmissionType = "MODEL" | "DESCRIPTION";

export const SUBMISSION_MODEL: SubmissionType = "MODEL";
export const SUBMISSION_DESCRIPTION: SubmissionType = "DESCRIPTION";

/** Upload ceilings. The model limit is the pre-existing one. */
export const MAX_MODEL_BYTES = 20 * 1024 * 1024;
export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCE_FILES = 5;

/** Photos off a phone, a scanned sketch, or a dimensioned PDF drawing. */
export const REFERENCE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".pdf",
] as const;

/** `accept` attribute for the reference-file input. */
export const REFERENCE_ACCEPT = REFERENCE_EXTENSIONS.join(",");

export const MODEL_EXTENSIONS = [".stl", ".zip"] as const;
export const MODEL_ACCEPT = MODEL_EXTENSIONS.join(",");

export const MAX_PART_NAME_CHARS = 120;
export const MIN_DESCRIPTION_CHARS = 20;
export const MAX_DESCRIPTION_CHARS = 4000;
export const MAX_DIMENSIONS_CHARS = 300;

export function isModelFileName(name: string | null | undefined): boolean {
  const lower = (name || "").toLowerCase();
  return MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isReferenceFileName(name: string | null | undefined): boolean {
  const lower = (name || "").toLowerCase();
  return REFERENCE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Anything other than the literal "DESCRIPTION" is treated as a model upload. */
export function parseSubmissionType(raw: string | null | undefined): SubmissionType {
  return raw === SUBMISSION_DESCRIPTION ? SUBMISSION_DESCRIPTION : SUBMISSION_MODEL;
}

export function isDescriptionRequest(
  request: { submissionType?: string | null } | null | undefined
): boolean {
  return request?.submissionType === SUBMISSION_DESCRIPTION;
}

/**
 * What to call a request in a list, a modal heading, or a report. A model
 * upload is known by its file name; a described part by the name the customer
 * gave it.
 */
export function requestTitle(
  request: { fileName?: string | null; partName?: string | null } | null | undefined
): string {
  return request?.fileName || request?.partName || "Untitled part";
}

/**
 * Whether a browser will actually render this reference inline. HEIC/HEIF are
 * accepted uploads — they are what an iPhone hands over — but no mainstream
 * browser draws them, and a PDF is not an <img> either, so both get a glyph.
 */
export function isPreviewableImage(mimeType: string | null | undefined): boolean {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType || "");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Everything the two forms collect about *what* is being made. */
export interface PartSourceState {
  mode: SubmissionType;
  /** MODEL mode: the .stl/.zip being uploaded. */
  file: File | null;
  /** DESCRIPTION mode. */
  partName: string;
  description: string;
  dimensions: string;
  references: File[];
}

export function emptyPartSource(): PartSourceState {
  return {
    mode: SUBMISSION_MODEL,
    file: null,
    partName: "",
    description: "",
    dimensions: "",
    references: [],
  };
}

/**
 * Shared client-side check. Returns an error message, or null when the
 * submission is complete enough to send. The API re-validates all of this.
 */
export function validatePartSource(state: PartSourceState): string | null {
  if (state.mode === SUBMISSION_MODEL) {
    if (!state.file) return "Add an STL or ZIP file, or switch to “No file yet” and describe the part.";
    if (!isModelFileName(state.file.name)) return "Only .STL and .ZIP files are accepted.";
    if (state.file.size > MAX_MODEL_BYTES) return "File size exceeds the 20MB limit.";
    return null;
  }

  if (!state.partName.trim()) return "Give the part a name so we can refer to it.";
  if (state.partName.trim().length > MAX_PART_NAME_CHARS) {
    return `Part name must be ${MAX_PART_NAME_CHARS} characters or fewer.`;
  }

  const description = state.description.trim();
  if (description.length < MIN_DESCRIPTION_CHARS) {
    return `Describe the part in at least ${MIN_DESCRIPTION_CHARS} characters — what it is, what it fits, and what it has to do.`;
  }
  if (description.length > MAX_DESCRIPTION_CHARS) {
    return `Description must be ${MAX_DESCRIPTION_CHARS} characters or fewer.`;
  }

  if (state.dimensions.trim().length > MAX_DIMENSIONS_CHARS) {
    return `Approximate size must be ${MAX_DIMENSIONS_CHARS} characters or fewer.`;
  }

  if (state.references.length > MAX_REFERENCE_FILES) {
    return `Attach at most ${MAX_REFERENCE_FILES} reference files.`;
  }
  for (const reference of state.references) {
    if (!isReferenceFileName(reference.name)) {
      return `${reference.name} is not a supported reference file. Use JPG, PNG, WEBP, GIF, HEIC, or PDF.`;
    }
    if (reference.size > MAX_REFERENCE_BYTES) {
      return `${reference.name} is larger than the 10MB limit for reference files.`;
    }
  }

  return null;
}

/**
 * A described part cannot be priced until we have drawn it, so those requests
 * are always quoted first — the composer ticks and locks the quote box, and the
 * API forces the same flag.
 */
export function quoteIsForced(mode: SubmissionType): boolean {
  return mode === SUBMISSION_DESCRIPTION;
}

/** Write the source fields onto the multipart body both forms POST. */
export function appendPartSource(formData: FormData, state: PartSourceState): void {
  formData.append("submissionType", state.mode);

  if (state.mode === SUBMISSION_MODEL) {
    if (state.file) formData.append("file", state.file);
    return;
  }

  formData.append("partName", state.partName.trim());
  formData.append("partDescription", state.description.trim());
  formData.append("dimensions", state.dimensions.trim());
  for (const reference of state.references) {
    formData.append("references", reference);
  }
}
