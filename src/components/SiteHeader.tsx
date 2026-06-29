"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import Magnetic from "@/components/ui/Magnetic";

const nav = [
  { href: "/", label: "Index" },
  { href: "/materials", label: "Materials" },
];

/**
 * Slim public masthead: a thin clay accent line, a monospace wordmark,
 * underlined section links, and a ghost "Enter" action.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-clay-500/60 to-transparent" />
      <div className="bg-espresso-900/70 backdrop-blur-xl border-b border-clay-500/12">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-md">
              <Image
                src="/logo.png"
                alt="TakomoCo"
                width={30}
                height={30}
                className="rounded-md ring-1 ring-clay-500/30"
              />
              <span className="leading-none">
                <span className="block font-mono text-sm font-bold tracking-[0.2em] text-cream-200">
                  TAKOMO<span className="text-clay-400">⁄</span>CO
                </span>
                <span className="mt-1 block font-mono text-[9px] tracking-[0.3em] text-cream-500">
                  ADDITIVE MFG.
                </span>
              </span>
            </Link>

            <nav className="flex items-center gap-6 sm:gap-8" aria-label="Primary">
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
    </header>
  );
}
