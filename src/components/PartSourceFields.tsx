"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UploadCloud, Wand2, X, FileText, AlertCircle } from "lucide-react";
import StlViewer from "@/components/StlViewer";
import { isStlFileName } from "@/lib/stl";
import {
  MAX_DESCRIPTION_CHARS,
  MAX_MODEL_BYTES,
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_FILES,
  MIN_DESCRIPTION_CHARS,
  MODEL_ACCEPT,
  PartSourceState,
  REFERENCE_ACCEPT,
  SUBMISSION_DESCRIPTION,
  SUBMISSION_MODEL,
  SubmissionType,
  formatBytes,
  isModelFileName,
  isPreviewableImage,
  isReferenceFileName,
} from "@/lib/part-source";

interface PartSourceFieldsProps {
  value: PartSourceState;
  onChange: (next: PartSourceState) => void;
  /** Unique per form on the page — two forms must not share input ids. */
  idPrefix: string;
  /** The host form's input styling, so this block matches its surroundings. */
  fieldClassName: string;
  labelClassName: string;
  /** Surfaced inline (e.g. a rejected file) without going through the parent. */
  onLocalError?: (message: string) => void;
}

const dropzoneBase =
  "flex cursor-pointer flex-col items-center gap-2 border border-dashed px-4 py-6 rounded-md transition-colors";
const dropzoneIdle = "border-clay-500/30 hover:border-clay-400 hover:bg-clay-500/5";
const dropzoneActive = "border-clay-400 bg-clay-500/10";

/**
 * "What are we making?" — the top of both request forms.
 *
 * A customer with a 3D file uploads it, exactly as before. A customer without
 * one switches to the second lane and tells us about the part instead: a name,
 * a description, rough dimensions, and photos or a sketch. Nothing else on
 * either form changes, so the two paths converge on the same request.
 */
export default function PartSourceFields({
  value,
  onChange,
  idPrefix,
  fieldClassName,
  labelClassName,
  onLocalError,
}: PartSourceFieldsProps) {
  const [draggingModel, setDraggingModel] = useState(false);
  const [draggingReference, setDraggingReference] = useState(false);

  const raise = useCallback(
    (message: string) => {
      onLocalError?.(message);
    },
    [onLocalError]
  );

  const setMode = (mode: SubmissionType) => {
    // Keep whatever has already been typed or picked — switching lanes to look
    // at the other one should never throw a customer's work away.
    onChange({ ...value, mode });
    onLocalError?.("");
  };

  const acceptModelFile = useCallback(
    (file: File | null) => {
      onLocalError?.("");
      if (!file) {
        onChange({ ...value, file: null });
        return;
      }
      if (!isModelFileName(file.name)) {
        raise("Only .STL and .ZIP files are accepted. No file? Switch to “No file yet”.");
        return;
      }
      if (file.size > MAX_MODEL_BYTES) {
        raise("File size exceeds the 20MB limit.");
        return;
      }
      onChange({ ...value, file });
    },
    [onChange, onLocalError, raise, value]
  );

  const addReferences = useCallback(
    (incoming: FileList | File[] | null) => {
      onLocalError?.("");
      const files = Array.from(incoming || []);
      if (files.length === 0) return;

      const next = [...value.references];
      for (const file of files) {
        if (next.length >= MAX_REFERENCE_FILES) {
          raise(`You can attach up to ${MAX_REFERENCE_FILES} reference files.`);
          break;
        }
        if (!isReferenceFileName(file.name)) {
          raise(`${file.name} is not supported. Use JPG, PNG, WEBP, GIF, HEIC, or PDF.`);
          continue;
        }
        if (file.size > MAX_REFERENCE_BYTES) {
          raise(`${file.name} is larger than the ${formatBytes(MAX_REFERENCE_BYTES)} limit.`);
          continue;
        }
        if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
        next.push(file);
      }
      onChange({ ...value, references: next });
    },
    [onChange, onLocalError, raise, value]
  );

  const removeReference = (index: number) => {
    onChange({ ...value, references: value.references.filter((_, i) => i !== index) });
  };

  const describing = value.mode === SUBMISSION_DESCRIPTION;
  const descriptionLength = value.description.trim().length;

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className={labelClassName}>What are we making?</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModeCard
            id={`${idPrefix}-mode-model`}
            name={`${idPrefix}-mode`}
            checked={!describing}
            onSelect={() => setMode(SUBMISSION_MODEL)}
            icon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
            title="I have a 3D file"
            blurb="Upload an .STL or .ZIP and we print it as drawn."
          />
          <ModeCard
            id={`${idPrefix}-mode-description`}
            name={`${idPrefix}-mode`}
            checked={describing}
            onSelect={() => setMode(SUBMISSION_DESCRIPTION)}
            icon={<Wand2 className="h-4 w-4" aria-hidden="true" />}
            title="No file yet"
            blurb="Describe the part and send photos — we model it for you."
          />
        </div>
      </fieldset>

      {!describing ? (
        <div>
          <label htmlFor={`${idPrefix}-file`} className={labelClassName}>
            STL / ZIP file <span className="text-clay-400">*</span>{" "}
            <span className="text-cream-600 normal-case tracking-normal">(max 20MB)</span>
          </label>
          <input
            id={`${idPrefix}-file`}
            type="file"
            accept={MODEL_ACCEPT}
            onChange={(e) => {
              acceptModelFile(e.target.files?.[0] || null);
              e.target.value = ""; // allow re-selecting the same file after removal
            }}
            className="sr-only peer"
          />
          <label
            htmlFor={`${idPrefix}-file`}
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingModel(true);
            }}
            onDragLeave={() => setDraggingModel(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDraggingModel(false);
              acceptModelFile(e.dataTransfer.files?.[0] || null);
            }}
            className={`${dropzoneBase} peer-focus-visible:ring-2 peer-focus-visible:ring-clay-500 ${
              draggingModel ? dropzoneActive : dropzoneIdle
            }`}
          >
            <UploadCloud className="h-6 w-6 text-clay-400 shrink-0" aria-hidden="true" />
            {value.file ? (
              <span className="flex items-center gap-2 max-w-full">
                <span className="truncate text-sm text-cream-200">{value.file.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-cream-600">
                  {formatBytes(value.file.size)}
                </span>
              </span>
            ) : (
              <span className="text-center text-sm text-cream-300">
                Drag &amp; drop your file here, or{" "}
                <span className="text-clay-300 underline underline-offset-2">browse</span>
              </span>
            )}
          </label>

          {value.file && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-cream-500">
                  {isStlFileName(value.file.name)
                    ? "3D preview — check your part before submitting"
                    : "Preview"}
                </span>
                <button
                  type="button"
                  onClick={() => acceptModelFile(null)}
                  className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cream-500 hover:text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded-sm"
                >
                  <X className="h-3 w-3" aria-hidden="true" /> Remove file
                </button>
              </div>
              <StlViewer file={value.file} fileName={value.file.name} className="h-64 w-full" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3 border-l-2 border-clay-500/50 bg-clay-500/10 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-clay-300 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-cream-300">
              Tell us about the part and we&apos;ll draw the model for you. Photos of the
              original — or a sketch with a ruler or coin next to it — get us closest.
              We price the modelling and the build together and send a{" "}
              <strong className="text-clay-200">quote for your approval</strong> before
              anything is made.
            </p>
          </div>

          <div>
            <label htmlFor={`${idPrefix}-part-name`} className={labelClassName}>
              Part name <span className="text-clay-400">*</span>
            </label>
            <input
              id={`${idPrefix}-part-name`}
              type="text"
              value={value.partName}
              onChange={(e) => onChange({ ...value, partName: e.target.value })}
              className={fieldClassName}
              placeholder="e.g. Dryer door catch, Bosch WTG86"
              maxLength={120}
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-description`} className={labelClassName}>
              Describe the part <span className="text-clay-400">*</span>
            </label>
            <textarea
              id={`${idPrefix}-description`}
              value={value.description}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
              rows={5}
              className={`${fieldClassName} resize-none`}
              maxLength={MAX_DESCRIPTION_CHARS}
              placeholder={
                "What is it and what does it do?\n" +
                "What does it attach to or fit inside?\n" +
                "How did the original fail, and does it need to be stronger?"
              }
            />
            <p className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-cream-600">
              <span>
                {descriptionLength < MIN_DESCRIPTION_CHARS
                  ? `At least ${MIN_DESCRIPTION_CHARS} characters`
                  : "The more detail, the closer the first model lands"}
              </span>
              <span>
                {descriptionLength}/{MAX_DESCRIPTION_CHARS}
              </span>
            </p>
          </div>

          <div>
            <label htmlFor={`${idPrefix}-dimensions`} className={labelClassName}>
              Approximate size{" "}
              <span className="text-cream-600 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id={`${idPrefix}-dimensions`}
              type="text"
              value={value.dimensions}
              onChange={(e) => onChange({ ...value, dimensions: e.target.value })}
              className={fieldClassName}
              placeholder="e.g. 80 × 40 × 12 mm, 6 mm bore"
              maxLength={300}
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-references`} className={labelClassName}>
              Reference photos or drawings{" "}
              <span className="text-cream-600 normal-case tracking-normal">
                (optional — up to {MAX_REFERENCE_FILES}, 10MB each)
              </span>
            </label>
            <input
              id={`${idPrefix}-references`}
              type="file"
              accept={REFERENCE_ACCEPT}
              multiple
              onChange={(e) => {
                addReferences(e.target.files);
                e.target.value = "";
              }}
              className="sr-only peer"
            />
            <label
              htmlFor={`${idPrefix}-references`}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingReference(true);
              }}
              onDragLeave={() => setDraggingReference(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingReference(false);
                addReferences(e.dataTransfer.files);
              }}
              className={`${dropzoneBase} peer-focus-visible:ring-2 peer-focus-visible:ring-clay-500 ${
                draggingReference ? dropzoneActive : dropzoneIdle
              }`}
            >
              <UploadCloud className="h-6 w-6 text-clay-400 shrink-0" aria-hidden="true" />
              <span className="text-center text-sm text-cream-300">
                Drag &amp; drop photos here, or{" "}
                <span className="text-clay-300 underline underline-offset-2">browse</span>
              </span>
              <span className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-cream-600">
                JPG · PNG · WEBP · GIF · HEIC · PDF
              </span>
            </label>

            {value.references.length > 0 && (
              <ReferenceGrid files={value.references} onRemove={removeReference} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeCard({
  id,
  name,
  checked,
  onSelect,
  icon,
  title,
  blurb,
}: {
  id: string;
  name: string;
  checked: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <div>
      <input
        id={id}
        name={name}
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="sr-only peer"
      />
      <label
        htmlFor={id}
        className={`flex h-full cursor-pointer flex-col gap-1.5 rounded-md border px-4 py-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-clay-500 ${
          checked
            ? "border-clay-400 bg-clay-500/10"
            : "border-clay-500/25 hover:border-clay-400 hover:bg-clay-500/5"
        }`}
      >
        <span
          className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] ${
            checked ? "text-clay-200" : "text-cream-400"
          }`}
        >
          {icon}
          {title}
        </span>
        <span className="text-xs leading-relaxed text-cream-500">{blurb}</span>
      </label>
    </div>
  );
}

/** Thumbnails for the reference files picked so far, each removable. */
function ReferenceGrid({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  // Only the types a browser will actually draw; HEIC and PDF fall back to a
  // glyph rather than a broken image.
  const imageFiles = useMemo(
    () => files.map((f) => (isPreviewableImage(f.type) ? f : null)),
    [files]
  );
  const [urls, setUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    const created = imageFiles.map((f) => (f ? URL.createObjectURL(f) : null));
    setUrls(created);
    return () => {
      for (const url of created) if (url) URL.revokeObjectURL(url);
    };
  }, [imageFiles]);

  return (
    <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.size}-${index}`}
          className="relative overflow-hidden rounded-md border border-clay-500/20 bg-espresso-900/70"
        >
          <div className="flex h-24 items-center justify-center">
            {urls[index] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[index] as string}
                alt={file.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <FileText className="h-8 w-8 text-clay-400/70" aria-hidden="true" />
            )}
          </div>
          <div className="px-2 py-1.5">
            <p className="truncate text-[11px] text-cream-300" title={file.name}>
              {file.name}
            </p>
            <p className="font-mono text-[9px] text-cream-600">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${file.name}`}
            className="absolute right-1 top-1 rounded-full bg-espresso-900/80 p-1 text-cream-400 hover:text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
