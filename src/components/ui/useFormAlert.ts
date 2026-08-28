"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A form banner that cannot be missed.
 *
 * Both request forms are long enough that their status banner sits well above
 * the submit button — so a failure raised on submit rendered off-screen and
 * looked like nothing had happened at all. This keeps the message, and scrolls
 * it into view and moves focus to it every time one is raised, including the
 * same message twice in a row.
 *
 * Attach `ref` to the banner element and give it `tabIndex={-1}` so it can take
 * focus; screen readers then announce it, and sighted users are carried to it.
 */
export function useFormAlert<T extends HTMLElement = HTMLDivElement>() {
  const [message, setMessage] = useState("");
  // Bumped on every raise, so re-submitting into the identical error still
  // scrolls — the message alone would compare equal and skip the effect.
  const [revision, setRevision] = useState(0);
  const ref = useRef<T>(null);

  const show = useCallback((next: string) => {
    setMessage(next);
    setRevision((n) => n + 1);
  }, []);

  const clear = useCallback(() => setMessage(""), []);

  useEffect(() => {
    if (!message) return;
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [message, revision]);

  return { message, show, clear, ref };
}
