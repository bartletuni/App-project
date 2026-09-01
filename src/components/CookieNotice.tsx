"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cookie, X } from "lucide-react";
import Panel from "@/components/ui/Panel";
import { COOKIE_NOTICE_STORAGE_KEY } from "@/lib/legal";

/**
 * The site-wide cookie notice.
 *
 * Deliberately a notice and not a consent gate. Every cookie this site sets
 * is strictly necessary — the sign-in session and its CSRF token — and those
 * are exempt from prior consent, so a banner with "Accept" and "Reject"
 * buttons would be theatre: rejecting would have to either break sign-in or
 * do nothing at all, and a control that does nothing is worse than no control.
 * What is owed here is disclosure, and that is what this gives, with a link to
 * the full inventory.
 *
 * The moment a non-essential cookie is added, this has to become a real
 * consent control: the tracker stays off until the visitor opts in, the
 * choice is stored, and refusing has to be as easy as accepting.
 *
 * The dismissal is remembered in localStorage rather than in a cookie, so
 * closing the notice does not itself put anything new on your device that
 * would need disclosing. The key is versioned — bump it and the notice comes
 * back for everyone, which is what a materially changed policy requires.
 */
export default function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY);
    } catch {
      // Private browsing, or storage disabled entirely. Showing the notice
      // once per page is the right failure: never suppress a disclosure
      // because we could not read the flag that says it was seen.
    }
    if (stored === "dismissed") return;

    // Let the page's own entrance animations land first — the notice arriving
    // on top of them reads as an interruption rather than a footnote.
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, "dismissed");
    } catch {
      // Nothing to do — the notice will simply appear again next visit.
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          key="cookie-notice"
          aria-labelledby="cookie-notice-heading"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          /* Clears the mobile tab bar on the signed-in pages; on the
             marketing pages it simply floats. At lg and up the notice is
             narrower than the gap beside the dashboard's left rail, so it
             stays centred on the viewport without colliding with it. */
          className="fixed inset-x-0 bottom-[4.75rem] z-50 px-4 sm:px-6 lg:bottom-6"
        >
          <Panel className="mx-auto flex max-w-3xl flex-col gap-4 p-5 shadow-glow sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <span
              className="hidden h-10 w-10 shrink-0 items-center justify-center border border-clay-500/25 text-clay-300 sm:flex"
              aria-hidden="true"
            >
              <Cookie className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="cookie-notice-heading"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay-300"
              >
                Cookies · essential only
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-cream-400">
                This site uses cookies only to keep you signed in and to secure
                that session. No analytics, no advertising, no tracking — so
                there is nothing here to opt out of.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <Link
                href="/cookies"
                className="border border-clay-500/30 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-cream-300 transition-colors hover:border-clay-400/60 hover:text-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
              >
                Details
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="flex items-center gap-2 bg-clay-600 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-cream-100 transition-colors hover:bg-clay-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
              >
                Got it
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </Panel>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
