"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only when the device has a fine pointer (mouse/trackpad)
 * AND hover capability. On touchscreens this is false, so pointer-driven
 * effects (3D tilt, magnetic pull, cursor spotlights) can be disabled to
 * avoid broken-looking static transforms and to keep touch scrolling smooth.
 *
 * Starts as `false` so server render + first paint match the most common
 * (mobile) case and we never apply a desktop-only transform before hydration.
 */
export default function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(query.matches);

    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return fine;
}
