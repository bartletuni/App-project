"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, Phone, Globe, Zap } from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";
import { DEFAULT_PRICING, type PricingContent } from "@/lib/pricing";

/** "A", "B", "C" … the section index used on the printed catalog. */
const sectionLetter = (index: number) => String.fromCharCode(65 + (index % 26));

export default function PricingPage() {
  const [content, setContent] = useState<PricingContent>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pricing", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.sections)) setContent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4">
        <span className="h-8 w-8 rounded-full border-2 border-clay-500/30 border-t-clay-400 animate-spin" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream-500">
          Loading rate sheet…
        </p>
      </div>
    );
  }

  const { settings, sections } = content;
  const coordinates = [
    { icon: Phone, k: "VOICE", v: settings.contactPhone, href: `tel:${settings.contactPhone.replace(/[^\d+]/g, "")}` },
    { icon: Mail, k: "EMAIL", v: settings.contactEmail, href: `mailto:${settings.contactEmail}` },
    { icon: Globe, k: "WEB", v: settings.contactWeb, href: `https://${settings.contactWeb.replace(/^https?:\/\//, "")}` },
  ].filter((c) => c.v);

  return (
    <div className="min-h-screen bg-transparent text-cream-200">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 sm:pt-36 pb-20">
        {/* Masthead */}
        <Reveal>
          <div className="border-b border-clay-500/15 pb-8">
            <span className="eyebrow">{settings.heroEyebrow}</span>
            <h1 className="mt-4 font-display text-5xl sm:text-6xl text-cream-100">
              {settings.heroTitle}{" "}
              <span className="italic text-clay-300">{settings.heroTitleAccent}</span>
            </h1>
            {settings.heroIntro && (
              <p className="mt-5 max-w-3xl text-cream-400 leading-relaxed">
                {settings.heroIntro}
              </p>
            )}
          </div>
        </Reveal>

        {/* Key advantage + direct line */}
        <div className="mt-8 grid gap-5 lg:grid-cols-5">
          {settings.advantageBody && (
            <Reveal delay={0.05} className="lg:col-span-3">
              <Panel className="h-full p-6 sm:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center border border-clay-500/30 text-clay-300">
                    <Zap className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="eyebrow">{settings.advantageLabel}</span>
                </div>
                <p className="text-lg leading-relaxed text-cream-200">
                  {settings.advantageBody}
                </p>
              </Panel>
            </Reveal>
          )}

          {coordinates.length > 0 && (
            <Reveal delay={0.1} className="lg:col-span-2">
              <Panel className="h-full p-6 sm:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="eyebrow">DIRECT LINE</span>
                  <span className="hairline flex-1" />
                </div>
                <dl className="divide-y divide-clay-500/12">
                  {coordinates.map((c) => (
                    <div key={c.k} className="flex items-center gap-3 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-clay-500/25 text-clay-300">
                        <c.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 w-12 shrink-0">
                        {c.k}
                      </dt>
                      <dd className="min-w-0 flex-1 truncate text-sm">
                        <a
                          href={c.href}
                          className="text-cream-200 hover:text-clay-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                        >
                          {c.v}
                        </a>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </Reveal>
          )}
        </div>

        {/* Service menu */}
        <div className="mt-16 space-y-6">
          {sections.map((section, i) => (
            <Reveal key={`${section.title}-${i}`} delay={0.04}>
              <Panel className="p-6 sm:p-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="font-mono text-xs tracking-[0.2em] text-clay-400">
                    {sectionLetter(i)}
                  </span>
                  <div className="flex-1">
                    <h2 className="font-display text-2xl sm:text-3xl text-cream-100">
                      {section.title}
                    </h2>
                    {section.intro && (
                      <p className="mt-2 max-w-3xl text-sm text-cream-500 leading-relaxed">
                        {section.intro}
                      </p>
                    )}
                  </div>
                </div>

                {section.items.length > 0 && (
                  <dl className="divide-y divide-clay-500/12 border-t border-clay-500/12">
                    {section.items.map((item, j) => (
                      <div
                        key={`${item.label}-${j}`}
                        className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                      >
                        <div className="min-w-0">
                          <dt className="text-cream-100 font-medium">{item.label}</dt>
                          {item.detail && (
                            <p className="mt-1 text-sm text-cream-500 leading-relaxed">
                              {item.detail}
                            </p>
                          )}
                        </div>
                        {(item.price || item.note) && (
                          <dd className="shrink-0 sm:text-right">
                            {item.price && (
                              <span className="block font-mono text-base text-clay-200">
                                {item.price}
                              </span>
                            )}
                            {item.note && (
                              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-cream-600">
                                {item.note}
                              </span>
                            )}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                )}
              </Panel>
            </Reveal>
          ))}
        </div>

        {/* Close */}
        <Reveal className="mt-16">
          <Panel className="p-7 sm:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-2xl sm:text-3xl text-cream-100">
                  Ready to <span className="italic text-clay-300">quote</span> a part?
                </h2>
                {settings.footerNote && (
                  <p className="mt-3 text-sm text-cream-500 leading-relaxed">
                    {settings.footerNote}
                  </p>
                )}
              </div>
              <Link
                href="/login"
                className="group inline-flex shrink-0 items-center justify-center gap-2 bg-clay-600 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-700 transition-colors shadow-glow"
              >
                Start a build
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Panel>
        </Reveal>
      </main>
    </div>
  );
}
