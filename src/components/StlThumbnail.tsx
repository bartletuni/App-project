"use client";

import { useEffect, useRef, useState } from "react";
import { FileArchive, Box } from "lucide-react";
import { isStlFileName, thumbnailForFile, thumbnailForFileId } from "@/lib/stl";

interface StlThumbnailProps {
  fileId?: string | null;
  /** Locally-selected file — takes precedence over fileId. */
  file?: File | null;
  fileName: string;
  /** Rendered box size in px. */
  size?: number;
  className?: string;
}

/**
 * Small static image preview of an STL part. Renders lazily (only when
 * scrolled into view) and shares the geometry/thumbnail cache with StlViewer.
 * Non-STL files (ZIP) get an archive glyph instead.
 */
export default function StlThumbnail({
  fileId,
  file,
  fileName,
  size = 56,
  className = "",
}: StlThumbnailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const isStl = isStlFileName(fileName);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isStl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isStl]);

  useEffect(() => {
    if (!visible || !isStl) return;
    let cancelled = false;
    const renderSize = Math.min(Math.max(size * 2, 96), 256); // 2x for crispness
    const promise = file
      ? thumbnailForFile(file, renderSize)
      : fileId
        ? thumbnailForFileId(fileId, renderSize)
        : null;
    promise
      ?.then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, isStl, file, fileId, size]);

  const box = `shrink-0 flex items-center justify-center overflow-hidden rounded-md border border-clay-500/20 bg-espresso-900/70 ${className}`;
  const style = { width: size, height: size };

  if (!isStl) {
    return (
      <div className={box} style={style} title="ZIP archive — no 3D preview">
        <FileArchive className="h-1/2 w-1/2 text-clay-400/60" aria-hidden="true" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className={box} style={style} title="Preview unavailable">
        <Box className="h-1/2 w-1/2 text-cream-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div ref={ref} className={box} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`3D preview of ${fileName}`} className="h-full w-full object-contain" />
      ) : (
        <div className="h-full w-full animate-pulse bg-clay-500/10" aria-hidden="true" />
      )}
    </div>
  );
}
