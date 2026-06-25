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
      className="bg-white/60 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50"
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
            <span className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight truncate">
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
                    ? "font-bold text-indigo-600"
                    : "font-medium text-gray-500 hover:text-indigo-600"
                }`}
              >
                {l.label}
                {isActive(l.href) && (
                  <motion.span
                    layoutId="admin-nav-active"
                    className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-indigo-600"
                  />
                )}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 -mr-2 text-gray-600 hover:text-indigo-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
            className="lg:hidden overflow-hidden border-t border-gray-200/50 bg-white/80 backdrop-blur-xl"
          >
            <div className="px-4 py-3 space-y-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                    isActive(l.href)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors active:scale-[0.98] border-t border-gray-100 mt-2 pt-3"
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
