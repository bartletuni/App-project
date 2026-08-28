"use client";

import { Download, FileText, Wand2 } from "lucide-react";
import { formatBytes, isDescriptionRequest, isPreviewableImage } from "@/lib/part-source";

export interface RequestAttachmentRecord {
  id: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface DescribedRequest {
  submissionType?: string | null;
  partName?: string | null;
  partDescription?: string | null;
  dimensions?: string | null;
  attachments?: RequestAttachmentRecord[] | null;
}

/**
 * What a described part looks like once it has been submitted: the customer's
 * own account of it, its rough size, and the photos or drawings they sent.
 * Renders nothing for a normal model upload, so both review modals can drop it
 * in unconditionally.
 */
export default function PartSourceSummary({
  request,
  className = "",
}: {
  request: DescribedRequest;
  className?: string;
}) {
  if (!isDescriptionRequest(request)) return null;

  const attachments = request.attachments || [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-3 border-l-2 border-clay-500/50 bg-clay-500/10 px-4 py-3">
        <Wand2 className="h-4 w-4 text-clay-300 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-cream-300">
          Submitted without a 3D file. TakomoCo models this part from the
          description and references below, then sends a quote for approval
          before anything is built.
        </p>
      </div>

      {request.partDescription && (
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500 mb-1.5">
            Part description
          </div>
          <p className="text-sm text-cream-200 whitespace-pre-wrap">{request.partDescription}</p>
        </div>
      )}

      {request.dimensions && (
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500 mb-1.5">
            Approximate size
          </div>
          <p className="text-sm text-cream-200">{request.dimensions}</p>
        </div>
      )}

      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500 mb-2">
          References ({attachments.length})
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-cream-500">No reference files were attached.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="overflow-hidden rounded-md border border-clay-500/20 bg-espresso-900/70"
              >
                <a
                  href={`/api/download/${attachment.fileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                  title={`Open ${attachment.fileName}`}
                >
                  <div className="flex h-28 items-center justify-center bg-espresso-900">
                    {isPreviewableImage(attachment.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/download/${attachment.fileId}?inline=1`}
                        alt={attachment.fileName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-clay-400/70" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <Download className="h-3 w-3 shrink-0 text-clay-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] text-cream-300">
                        {attachment.fileName}
                      </span>
                      <span className="block font-mono text-[9px] text-cream-600">
                        {formatBytes(attachment.size)}
                      </span>
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
