"use client";

import { Mail, Phone, Clock, Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";
import Magnetic from "@/components/ui/Magnetic";
import RequestQuoteButton from "@/components/RequestQuoteButton";

const coordinates = [
  { icon: Mail, k: "EMAIL", v: "info@takomoco.com" },
  { icon: Phone, k: "VOICE", v: "385-695-4178" },
  { icon: Clock, k: "HOURS", v: "Mon–Fri · 9am – 5pm EST" },
];

export default function ContactPage() {
  return (
    <AppShell variant="user">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-16">
        <Reveal>
          <span className="eyebrow">SUPPORT ⁄ DESK</span>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl text-cream-100">
            Get in <span className="italic text-clay-300">touch.</span>
          </h1>
          <p className="mt-5 max-w-xl text-cream-400 leading-relaxed">
            Questions about a custom additive manufacturing order? The shop is
            standing by — we respond to inquiries within 24 business hours.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <Panel className="p-7 sm:p-9">
            <div className="flex items-center gap-3 mb-7">
              <span className="eyebrow">DIRECT LINE</span>
              <span className="hairline flex-1" />
            </div>

            <Magnetic strength={0.25} className="w-full">
              <a
                href="mailto:info@takomoco.com"
                className="group flex items-center justify-between gap-3 bg-clay-600 px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-cream-100 hover:bg-clay-700 transition-colors shadow-glow active:scale-[0.99]"
              >
                <span className="flex items-center gap-3">
                  <Send className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" />
                  <span className="truncate normal-case tracking-normal text-sm">info@takomoco.com</span>
                </span>
              </a>
            </Magnetic>

            <RequestQuoteButton
              variant="outline"
              className="mt-3 w-full justify-between px-6 py-4 text-[11px] tracking-[0.18em]"
            />

            <dl className="mt-7 divide-y divide-clay-500/12">
              {coordinates.map((c) => (
                <div key={c.k} className="flex items-center gap-4 py-4">
                  <span className="flex h-9 w-9 items-center justify-center border border-clay-500/25 text-clay-300">
                    <c.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 w-16">{c.k}</dt>
                  <dd className="text-cream-200 text-sm">{c.v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </Reveal>
      </div>

      <SiteFooter />
    </AppShell>
  );
}
