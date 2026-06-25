"use client";

import { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  /** Pause the scroll on hover. */
  pauseOnHover?: boolean;
}

/**
 * Infinite horizontal marquee. Renders its children twice so the
 * loop is seamless, with soft edge fades via CSS mask.
 */
export default function Marquee({
  children,
  className = "",
  pauseOnHover = true,
}: MarqueeProps) {
  return (
    <div
      className={`group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] ${className}`}
    >
      <div
        className={`flex shrink-0 animate-marquee items-center gap-12 pr-12 ${
          pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""
        }`}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={`flex shrink-0 animate-marquee items-center gap-12 pr-12 ${
          pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
