import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import RequestQuoteButton from "@/components/RequestQuoteButton";

/**
 * Public masthead's counterpart: the site index at the bottom of every
 * marketing page.
 *
 * Two jobs beyond navigation. It gives every public page a crawlable link to
 * every other public page — before this, /contact had no inbound internal
 * links at all. And it repeats the shop's name, phone, and hours in the same
 * form they appear everywhere else, which is the consistency local search
 * looks for.
 */

const sitemap = [
  { href: "/", label: "Index" },
  { href: "/materials", label: "Materials" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

const services = [
  "Additive manufacturing",
  "3D scanning & reverse engineering",
  "Rapid prototyping",
  "Carbon-fiber & composite printing",
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-clay-500/15 bg-espresso-900/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Identity */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-md"
            >
              <Image
                src="/logo.png"
                alt="TakomoCo"
                width={28}
                height={28}
                className="rounded-md ring-1 ring-clay-500/30"
              />
              <span className="font-mono text-[13px] font-bold tracking-[0.18em] text-cream-200">
                TAKOMO<span className="text-clay-400">⁄</span>CO
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-cream-500">
              A domestic additive manufacturing studio in Utah — high-precision
              3D printing, scanning, and reverse engineering for engineering and
              reproduction work.
            </p>
            <RequestQuoteButton size="sm" className="mt-5 w-full sm:w-auto rounded-sm" />
          </div>

          {/* Site index */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="eyebrow">INDEX</span>
              <span className="h-px flex-1 bg-clay-500/20" />
            </div>
            <ul className="space-y-2.5">
              {sitemap.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="text-sm text-cream-400 hover:text-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-1.5 text-sm text-cream-400 hover:text-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                >
                  Client sign in
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-clay-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            </ul>
          </div>

          {/* Services — plain text, not links; there are no service pages yet */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="eyebrow">SERVICES</span>
              <span className="h-px flex-1 bg-clay-500/20" />
            </div>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s} className="text-sm text-cream-400">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Direct line — same name/phone/hours used everywhere else. */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="eyebrow">DIRECT LINE</span>
              <span className="h-px flex-1 bg-clay-500/20" />
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:info@takomoco.com"
                  className="text-cream-400 hover:text-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                >
                  info@takomoco.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+13856954178"
                  className="text-cream-400 hover:text-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                >
                  385-695-4178
                </a>
              </li>
              <li className="text-cream-500">Mon–Fri · 9am – 5pm</li>
              <li className="text-cream-500">Utah, USA</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-clay-500/15 pt-6 font-mono text-[10px] uppercase tracking-[0.15em] text-cream-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-cream-300">
            TAKOMO<span className="text-clay-400">⁄</span>CO
            <span className="text-clay-500/50">|</span>
            <span className="font-normal tracking-[0.2em] text-clay-300">
              FAST, FITTED, FLAWLESS
            </span>
          </span>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
            {/* Kept site-wide: these codes are how government and prime
                contractors search for suppliers. */}
            <span>NAICS 333248 · 541330 · 541420</span>
            <span>© {year} TakomoCo</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
