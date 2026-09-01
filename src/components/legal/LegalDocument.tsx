"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";
import { LEGAL_LAST_UPDATED, LEGAL_ROUTES } from "@/lib/legal";

export interface LegalSection {
  /** Anchor target — also what the contents rail links to. */
  id: string;
  /** Two-digit index, kept in the spec-sheet numbering the site uses. */
  n: string;
  title: string;
  body: ReactNode;
}

interface LegalDocumentProps {
  /** This document's own route, so it is left out of the cross-links. */
  current: string;
  /** Monospace kicker, e.g. "LEGAL ⁄ PRIVACY". */
  eyebrow: string;
  /** Heading, split so the second half can take the italic clay accent. */
  title: string;
  accent: string;
  lede: string;
  /** The plain-language summary panel above the document proper. */
  summary: ReactNode;
  sections: LegalSection[];
}

/**
 * Shared chrome for the three legal documents.
 *
 * Legal copy is the one place on this site where a wall of text is
 * unavoidable, so the page does the two things that make one readable: a
 * plain-language summary before the formal text, and a numbered contents
 * rail that stays put while you scroll. Everything else — the eyebrow, the
 * display serif with one italic word, the ticked panels, the hairlines — is
 * the same vocabulary the marketing pages use, so a policy page reads as
 * part of the shop rather than as something bolted on.
 */
export default function LegalDocument({
  current,
  eyebrow,
  title,
  accent,
  lede,
  summary,
  sections,
}: LegalDocumentProps) {
  const others = LEGAL_ROUTES.filter((r) => r.href !== current);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 sm:py-20">
        {/* Masthead */}
        <Reveal>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl text-cream-100 text-balance">
            {title} <span className="italic text-clay-300">{accent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-cream-400 leading-relaxed">{lede}</p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-cream-600">
            Last updated · {LEGAL_LAST_UPDATED}
          </p>
        </Reveal>

        {/* Plain-language summary — the formal text below is authoritative,
            and says so. */}
        <Reveal delay={0.08} className="mt-10">
          <Panel className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="eyebrow">IN PLAIN TERMS</span>
              <span className="hairline flex-1" />
            </div>
            <div className="legal-prose legal-prose-tight">{summary}</div>
            <p className="mt-5 border-t border-clay-500/12 pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-cream-600">
              Summary only — the numbered sections below are the agreement.
            </p>
          </Panel>
        </Reveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          {/* Contents rail */}
          <nav
            aria-label="Contents"
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="eyebrow">CONTENTS</span>
              <span className="h-px flex-1 bg-clay-500/20" />
            </div>
            <ol className="space-y-2.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="group flex gap-2.5 text-sm text-cream-500 transition-colors hover:text-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                  >
                    <span className="font-mono text-[10px] leading-5 text-clay-500 transition-colors group-hover:text-clay-300">
                      {s.n}
                    </span>
                    <span className="leading-5">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* The document */}
          <article className="min-w-0">
            {sections.map((s, i) => (
              <Reveal
                key={s.id}
                delay={Math.min(i, 4) * 0.04}
                distance={20}
                className="scroll-mt-24"
              >
                <section
                  id={s.id}
                  className={`scroll-mt-24 ${
                    i === 0 ? "" : "mt-12 border-t border-clay-500/12 pt-12"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-clay-500">
                      {s.n}
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl text-cream-100">
                      {s.title}
                    </h2>
                  </div>
                  <div className="legal-prose mt-4">{s.body}</div>
                </section>
              </Reveal>
            ))}

            {/* Cross-links, so each document is one click from the others. */}
            <Reveal className="mt-14">
              <div className="mb-4 flex items-center gap-3">
                <span className="eyebrow">ALSO ON FILE</span>
                <span className="hairline flex-1" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {others.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="group flex items-start justify-between gap-3 border border-clay-500/18 bg-espresso-800/40 px-5 py-4 transition-colors hover:border-clay-500/40 hover:bg-espresso-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-clay-300">
                        {r.label}
                      </span>
                      <span className="mt-1.5 block text-sm text-cream-500">
                        {r.blurb}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="mt-0.5 h-4 w-4 shrink-0 text-clay-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </Reveal>
          </article>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
