/**
 * How a part reaches the shop.
 *
 * A request arrives one of two ways:
 *
 *   MODEL       — the customer uploaded a 3D file: an .stl, a STEP or IGES
 *                 export, or a .zip holding the model. This is the original
 *                 path.
 *   DESCRIPTION — the customer has no 3D file. They name the part, describe it,
 *                 and (usually) attach photos or a sketch, and we draw the model
 *                 for them. These are always estimated before anything is built,
 *                 because there is nothing to price until we have modelled it —
 *                 and an estimate is all we can honestly give without the file.
 *
 * Everything here is shared by the customer composer, the admin console's
 * "add request" form, and the API route that stores the submission, so the two
 * forms and the server agree on limits and error wording.
 */

import { BUSINESS } from "@/lib/seo";

export type SubmissionType = "MODEL" | "DESCRIPTION";

export const SUBMISSION_MODEL: SubmissionType = "MODEL";
export const SUBMISSION_DESCRIPTION: SubmissionType = "DESCRIPTION";

/**
 * How much a submission may carry, and by which road.
 *
 * There are two roads, and the limits differ because the roads do.
 *
 * INLINE: the file rides in the form post. The forms post through a serverless
 * function, and Vercel rejects a request body over about 4.5MB before our code
 * runs — a bare 413 with no message. So an inline submission is held to 4MB in
 * total (a model on its own, or a described part's photos added up), under the
 * host's cap with room for the form's own fields.
 *
 * DIRECT: the browser sends the file straight to Cloudflare R2 on a signed URL
 * and the form post carries only a receipt for it (src/lib/direct-upload.ts).
 * Nothing large passes through the function, so the host's cap does not apply
 * and the limits are ours to choose. It needs the R2 bucket's CORS rule in
 * place, so it is off until `NEXT_PUBLIC_DIRECT_UPLOADS=1` is set — and while
 * it is off the forms advertise the inline limit, because they must not
 * promise what the deployment cannot do. A small submission still goes inline
 * either way; only one over DIRECT_UPLOAD_THRESHOLD_BYTES takes the direct road.
 *
 * Anything over the limit goes by email, which every message here says.
 */
export const DIRECT_UPLOADS = process.env.NEXT_PUBLIC_DIRECT_UPLOADS === "1";

export const MAX_INLINE_BYTES = 4 * 1024 * 1024;
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 3 * 1024 * 1024;

export const MAX_MODEL_BYTES = DIRECT_UPLOADS ? 50 * 1024 * 1024 : MAX_INLINE_BYTES;
/** One photo or drawing. */
export const MAX_REFERENCE_BYTES = DIRECT_UPLOADS ? 10 * 1024 * 1024 : MAX_INLINE_BYTES;
/** All of a described part's photos together. */
export const MAX_REFERENCE_TOTAL_BYTES = DIRECT_UPLOADS ? 50 * 1024 * 1024 : MAX_INLINE_BYTES;
export const MAX_REFERENCE_FILES = 5;

/** How the limits read in a sentence. */
export const MODEL_LIMIT_LABEL = DIRECT_UPLOADS ? "50MB" : "4MB";
export const REFERENCE_LIMIT_LABEL = DIRECT_UPLOADS ? "10MB each" : "4MB in total";
export const INLINE_LIMIT_LABEL = "4MB";
export const LARGE_FILE_ADVICE = `For anything larger, email it to ${BUSINESS.email}.`;
export const MODEL_TOO_LARGE = `File size exceeds the ${MODEL_LIMIT_LABEL} limit. ${LARGE_FILE_ADVICE}`;
export const REFERENCES_TOO_LARGE = DIRECT_UPLOADS
  ? `Each photo or drawing can be up to 10MB, and a request takes up to ${MAX_REFERENCE_FILES}. ${LARGE_FILE_ADVICE}`
  : `Photos and drawings can total 4MB per request. Send fewer or smaller ones. ${LARGE_FILE_ADVICE}`;
/** A file too big to ride in the form post, from a client that did not send it directly. */
export const INLINE_TOO_LARGE = `That file is too large to send this way. Refresh the page and try again, or email it to ${BUSINESS.email}.`;

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

/**
 * The 3D formats we take. STL is the original, and the only one a browser can
 * draw for a preview. STEP and IGES are the neutral CAD exchange formats an
 * engineering or tooling customer actually has on hand — every CAD package
 * exports them, and `.stp` / `.igs` are the same formats under the short
 * names older software still writes. ZIP carries a model plus whatever goes
 * with it.
 *
 * An extension is only a claim: each one needs a matching signature in
 * src/lib/file-signatures.ts. The customer-facing lists of accepted formats —
 * /privacy §02, /file-retention §01, the pricing sheet — have to move with
 * this array; nothing checks them.
 */
export const MODEL_EXTENSIONS = [".stl", ".step", ".stp", ".iges", ".igs", ".zip"] as const;
export const MODEL_ACCEPT = MODEL_EXTENSIONS.join(",");

/** How the accepted formats read in a sentence, e.g. "Add an … file". */
export const MODEL_FORMATS_LABEL = "STL, STEP, IGES, or ZIP";

/**
 * The messages for the model upload, in one place so the client check and the
 * server's agree word for word. The server's copies are asserted by the route
 * tests; both change only when the accepted set above does.
 */
export const MODEL_FILE_REQUIRED = `${MODEL_FORMATS_LABEL} file is required`;
export const MODEL_FILE_TYPE_ERROR = "Only .STL, .STEP/.STP, .IGES/.IGS, and .ZIP files are accepted";

export const MAX_PART_NAME_CHARS = 120;
export const MIN_DESCRIPTION_CHARS = 20;
export const MAX_DESCRIPTION_CHARS = 4000;
export const MAX_DIMENSIONS_CHARS = 300;
/** What a repair shop knows about the original: the machine, and its part number. */
export const MAX_EQUIPMENT_CHARS = 120;
export const MAX_PART_NUMBER_CHARS = 80;

/**
 * Lives here rather than beside the STL loader so that asking "is this an STL?"
 * — a string comparison — does not drag three.js into a bundle that has no
 * geometry to draw. The public estimate form is the reason: most of its visitors
 * are photographing a part on a phone and never pick a model at all.
 */
export function isStlFileName(name: string | null | undefined): boolean {
  return !!name && name.toLowerCase().endsWith(".stl");
}

export function isModelFileName(name: string | null | undefined): boolean {
  const lower = (name || "").toLowerCase();
  return MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * What a model file is, for the places that say so next to a missing preview.
 * Only STL has one: the browser cannot draw a STEP, an IGES, or the inside of
 * a ZIP, so those are reviewed by the shop instead.
 */
export function modelFormatName(name: string | null | undefined): "STEP" | "IGES" | "ZIP" | null {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".step") || lower.endsWith(".stp")) return "STEP";
  if (lower.endsWith(".iges") || lower.endsWith(".igs")) return "IGES";
  if (lower.endsWith(".zip")) return "ZIP";
  return null;
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

/** The combined size of a set of files, which is what the host actually limits. */
export function totalBytes(files: { size: number }[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Everything the two forms collect about *what* is being made. */
export interface PartSourceState {
  mode: SubmissionType;
  /** MODEL mode: the 3D file being uploaded. */
  file: File | null;
  /** DESCRIPTION mode. */
  partName: string;
  description: string;
  dimensions: string;
  references: File[];
  /** Both lanes, both optional: the machine the part came off, and its OEM number. */
  equipment: string;
  partNumber: string;
  /**
   * MODEL mode, on a reorder: the file already on record from the earlier
   * order, standing in for an upload. Nothing is re-sent — the server finds it
   * from the order being reordered — and picking a new file replaces it.
   */
  carried: { fileId: string; fileName: string } | null;
}

export function emptyPartSource(): PartSourceState {
  return {
    mode: SUBMISSION_MODEL,
    file: null,
    partName: "",
    description: "",
    dimensions: "",
    references: [],
    equipment: "",
    partNumber: "",
    carried: null,
  };
}

/**
 * Equipment and part number are stored as labelled lines at the top of a
 * request's notes, ahead of whatever the customer typed. That is the same
 * place a guest's company already rides, for the same reasons: every surface
 * that shows a request — the console, its search box, the emails, the report
 * PDF — already shows notes, and it needs no schema change. The labels are what
 * make the lines findable by eye.
 *
 * `splitNotes` is the inverse, for a form that is being refilled from a stored
 * request (a reorder): the labelled lines go back into their own inputs and
 * only the customer's own words are left for the notes box, so nothing is
 * written into the notes twice.
 */
const EQUIPMENT_LABEL = "Equipment: ";
const PART_NUMBER_LABEL = "Part number: ";
const COMPANY_LABEL = "Company: ";
/** Written by the server on a reorder, so the shop can see what it repeats. */
const REORDER_LABEL = "Reorder of: ";

export function composeNotes(parts: {
  reorderOf?: string | null;
  company?: string | null;
  equipment?: string | null;
  partNumber?: string | null;
  notes?: string | null;
}): string {
  return [
    parts.reorderOf?.trim() ? `${REORDER_LABEL}${parts.reorderOf.trim()}` : "",
    parts.company?.trim() ? `${COMPANY_LABEL}${parts.company.trim()}` : "",
    parts.equipment?.trim() ? `${EQUIPMENT_LABEL}${parts.equipment.trim()}` : "",
    parts.partNumber?.trim() ? `${PART_NUMBER_LABEL}${parts.partNumber.trim()}` : "",
    (parts.notes || "").trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export function splitNotes(stored: string | null | undefined): {
  equipment: string;
  partNumber: string;
  notes: string;
} {
  const lines = (stored || "").split(/\r?\n/);
  let equipment = "";
  let partNumber = "";

  // Only the lines we wrote, and only at the top. A customer who happened to
  // type "Part number: …" further down is quoting themselves, not us.
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    // Labels the server writes — a guest's company, the reorder pointer — are
    // not the customer's to refill, and a new reorder writes its own.
    if (line.startsWith(COMPANY_LABEL) || line.startsWith(REORDER_LABEL)) continue;
    if (!equipment && line.startsWith(EQUIPMENT_LABEL)) {
      equipment = line.slice(EQUIPMENT_LABEL.length).trim();
    } else if (!partNumber && line.startsWith(PART_NUMBER_LABEL)) {
      partNumber = line.slice(PART_NUMBER_LABEL.length).trim();
    } else {
      break;
    }
  }

  return { equipment, partNumber, notes: lines.slice(i).join("\n").trim() };
}

/**
 * Shared client-side check. Returns an error message, or null when the
 * submission is complete enough to send. The API re-validates all of this.
 */
export function validatePartSource(state: PartSourceState): string | null {
  if (state.equipment.trim().length > MAX_EQUIPMENT_CHARS) {
    return `Equipment make and model must be ${MAX_EQUIPMENT_CHARS} characters or fewer.`;
  }
  if (state.partNumber.trim().length > MAX_PART_NUMBER_CHARS) {
    return `Part number must be ${MAX_PART_NUMBER_CHARS} characters or fewer.`;
  }

  if (state.mode === SUBMISSION_MODEL) {
    // A reorder's file is already on record and was checked when it arrived.
    if (!state.file && state.carried) return null;
    if (!state.file) {
      return `Add an ${MODEL_FORMATS_LABEL} file, or switch to “No file yet” and describe the part.`;
    }
    if (!isModelFileName(state.file.name)) return `${MODEL_FILE_TYPE_ERROR}.`;
    if (state.file.size > MAX_MODEL_BYTES) return MODEL_TOO_LARGE;
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
    if (reference.size > MAX_REFERENCE_BYTES) return REFERENCES_TOO_LARGE;
  }
  if (totalBytes(state.references) > MAX_REFERENCE_TOTAL_BYTES) return REFERENCES_TOO_LARGE;

  return null;
}

/**
 * A described part cannot be priced until we have drawn it, so those requests
 * are always priced first — the composer ticks and locks the pricing box, and
 * the API forces the same flag.
 *
 * What comes back is an *estimate*, never a quote: we are pricing a written
 * description and some photographs, so there is no model to guarantee a number
 * against. See `qualifiesForQuote` in src/lib/request-status.ts.
 */
export function pricingIsForced(mode: SubmissionType): boolean {
  return mode === SUBMISSION_DESCRIPTION;
}

/**
 * Receipts for files already sent straight to storage (see
 * src/lib/direct-upload.ts), standing in for the files themselves in the form
 * post. Present only for a submission too big to ride in the post.
 */
export interface PreparedUploads {
  modelUpload: string | null;
  referenceUploads: string[];
}

/**
 * Write the source fields onto the multipart body the forms POST. With
 * `prepared`, a file that was sent to storage goes in as its receipt and the
 * bytes stay out of the post — which is the point: the post is what the host
 * caps.
 */
export function appendPartSource(
  formData: FormData,
  state: PartSourceState,
  prepared?: PreparedUploads | null
): void {
  formData.append("submissionType", state.mode);
  formData.append("equipment", state.equipment.trim());
  formData.append("partNumber", state.partNumber.trim());

  if (state.mode === SUBMISSION_MODEL) {
    if (prepared?.modelUpload) formData.append("modelUpload", prepared.modelUpload);
    else if (state.file) formData.append("file", state.file);
    return;
  }

  formData.append("partName", state.partName.trim());
  formData.append("partDescription", state.description.trim());
  formData.append("dimensions", state.dimensions.trim());
  if (prepared && prepared.referenceUploads.length > 0) {
    for (const receipt of prepared.referenceUploads) formData.append("referenceUploads", receipt);
    return;
  }
  for (const reference of state.references) {
    formData.append("references", reference);
  }
}
