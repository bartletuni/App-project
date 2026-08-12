"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Magnetic from "@/components/ui/Magnetic";

const nav = [
  { href: "/", n: "01", label: "Index", blurb: "Studio overview & capabilities" },
  { href: "/materials", n: "02", label: "Materials", blurb: "Filament & composite stock" },
  { href: "/pricing", n: "03", label: "Pricing", blurb: "Service rate sheet" },
];

/**
 * Slim public masthead: a thin clay accent line, a monospace wordmark,
 * underlined section links, and a ghost "Enter" action.
 *
 * The section links collapse below `sm`, so small screens get a directory
 * toggle instead — a full-width index panel of every public destination.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Navigating away closes the directory.
  useEffect(() => {
    setDirectoryOpen(false);
  }, [pathname]);

  // Escape closes it, and the page behind it stays put while it is open.
  useEffect(() => {
    if (!directoryOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDirectoryOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [directoryOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-clay-500/60 to-transparent" />
      <div className="bg-espresso-900/70 backdrop-blur-xl border-b border-clay-500/12">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 sm:gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-md">
              <Image
                src="/logo.png"
                alt="TakomoCo"
                width={30}
                height={30}
                className="rounded-md ring-1 ring-clay-500/30"
              />
              <span className="leading-none">
                <span className="block whitespace-nowrap font-mono text-[13px] sm:text-sm font-bold tracking-[0.16em] sm:tracking-[0.2em] text-cream-200">
                  TAKOMO<span className="text-clay-400">⁄</span>CO
                </span>
                <span className="mt-1 block whitespace-nowrap font-mono text-[9px] tracking-[0.24em] sm:tracking-[0.3em] text-cream-500">
                  ADDITIVE MFG.
                </span>
              </span>
            </Link>

            <nav className="flex items-center gap-2.5 sm:gap-8" aria-label="Primary">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className="group relative hidden sm:block font-mono text-[11px] uppercase tracking-[0.2em] text-cream-400 hover:text-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                >
                  {n.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px bg-clay-400 transition-all duration-300 ${
                      isActive(n.href) ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setDirectoryOpen((open) => !open)}
                aria-expanded={directoryOpen}
                aria-controls="mobile-directory"
                aria-label={directoryOpen ? "Close directory" : "Open directory"}
                className="sm:hidden inline-flex h-10 w-10 items-center justify-center rounded-sm border border-clay-500/25 text-clay-300 hover:text-cream-100 hover:border-clay-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
              >
                {directoryOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <Magnetic strength={0.5}>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-1.5 border border-clay-500/40 bg-clay-500/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-500/15 hover:border-clay-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                >
                  Enter
                  <ArrowUpRight className="h-3.5 w-3.5 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Magnetic>
            </nav>
          </div>
        </div>
      </div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="h-px origin-left bg-gradient-to-r from-clay-500/30 to-transparent"
      />

      {/* Mobile directory — the full public index, one tap from the top of any page. */}
      <AnimatePresence>
        {directoryOpen && (
          <>
            <motion.div
              key="directory-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDirectoryOpen(false)}
              className="sm:hidden fixed inset-0 -z-10 bg-espresso-950/70 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.nav
              key="directory-panel"
              id="mobile-directory"
              aria-label="Site directory"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="sm:hidden max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-clay-500/20 bg-espresso-900/95 backdrop-blur-xl"
            >
              <div className="px-5 pt-5 pb-6">
                <div className="flex items-center gap-3">
                  <span className="eyebrow">DIRECTORY</span>
                  <span className="h-px flex-1 bg-clay-500/25" />
                </div>

                <ul className="mt-4 border-t border-clay-500/15">
                  {nav.map((n) => {
                    const on = isActive(n.href);
                    return (
                      <li key={n.href}>
                        <Link
                          href={n.href}
                          aria-current={on ? "page" : undefined}
                          className="flex items-center gap-4 border-b border-clay-500/15 py-4 transition-colors active:bg-espresso-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                        >
                          <span
                            className={`font-mono text-sm ${
                              on ? "text-clay-300" : "text-clay-500"
                            }`}
                          >
                            {n.n}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block font-display text-xl ${
                                on ? "text-clay-300" : "text-cream-100"
                              }`}
                            >
                              {n.label}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-cream-500">
                              {n.blurb}
                            </span>
                          </span>
                          <ArrowUpRight
                            className="h-4 w-4 shrink-0 text-clay-400"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                  <li>
                    <Link
                      href="/login"
                      className="flex items-center gap-4 border-b border-clay-500/15 py-4 transition-colors active:bg-espresso-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                    >
                      <span className="font-mono text-sm text-clay-500">04</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl text-cream-100">
                          Client Desk
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-cream-500">
                          Sign in & submit a request
                        </span>
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-clay-400"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                </ul>

                <div className="mt-5 flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-500">
                  <a
                    href="mailto:info@takomoco.com"
                    className="normal-case tracking-[0.08em] hover:text-cream-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                  >
                    info@takomoco.com
                  </a>
                  <a
                    href="tel:+13856954178"
                    className="hover:text-cream-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                  >
                    ☎ 385-695-4178
                  </a>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
