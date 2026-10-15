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
 *
 * Each copy slides left by exactly its own width (the `marquee` keyframe in
 * tailwind.config.ts), so when the animation restarts the second copy is
 * standing where the first began. The trailing `pr-12` matches the `gap-12`
 * so the join between copies is spaced like every other gap. One copy must be
 * at least as wide as the container, or a blank stretch shows at the end.
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
