"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  { href: "/admin", label: "Requests" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/add-request", label: "Add Request" },
  { href: "/admin/reports", label: "Reports" },
];

/**
 * Shared, responsive admin navigation. Shows inline links on desktop
 * and a slide-down menu on mobile. Highlights the active route.
 */
export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav
      className="bg-espresso-800/62 backdrop-blur-xl shadow-sm border-b border-espresso-600/50 sticky top-0 z-50"
      aria-label="Admin navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/admin" className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo.png"
              alt="TakomoCo Logo"
              width={32}
              height={32}
              className="rounded-lg shadow-sm shrink-0"
            />
            <span className="font-bold text-lg sm:text-xl text-cream-200 tracking-tight truncate">
              Admin Console
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative text-sm transition-colors ${
                  isActive(l.href)
                    ? "font-bold text-clay-300"
                    : "font-medium text-cream-500 hover:text-clay-300"
                }`}
              >
                {l.label}
                {isActive(l.href) && (
                  <motion.span
                    layoutId="admin-nav-active"
                    className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-clay-600"
                  />
                )}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="text-sm font-medium text-cream-500 hover:text-clay-300 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 -mr-2 text-cream-400 hover:text-clay-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden overflow-hidden border-t border-espresso-600/50 bg-espresso-800/85 backdrop-blur-xl"
          >
            <div className="px-4 py-3 space-y-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                    isActive(l.href)
                      ? "bg-clay-500/12 text-clay-300"
                      : "text-cream-400 hover:bg-espresso-700"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-cream-400 hover:bg-espresso-700 transition-colors active:scale-[0.98] border-t border-espresso-700 mt-2 pt-3"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
