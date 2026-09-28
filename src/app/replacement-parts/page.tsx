import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Camera, FileBox, Phone, ScanLine } from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/ui/Reveal";
import RequestEstimateButton from "@/components/RequestEstimateButton";
import { breadcrumbSchema, replacementPartsServiceSchema } from "@/lib/structured-data";
import { BUSINESS, OG_IMAGE, SITE_NAME } from "@/lib/seo";

/**
 * The page a repair or service company lands on — from an outreach email, or
 * from a search for a part it cannot buy any more.
 *
 * The rest of the site speaks to engineers ("additive manufacturing", "rapid
 * prototyping"). Someone who fixes appliances or equipment for a living
 * searches in different words — "discontinued part", "obsolete part",
 * "replacement part" — and asks different questions: do I need a CAD file,
 * how fast, will it hold up, can I order it again. This page answers those in
 * their words, and gives the shop's outreach a destination that is about the
 * reader rather than the printer.
 *
 * It makes no claim the site does not already make elsewhere: the 72-hour
 * turnaround and the materials (homepage), the one-business-day answer and the
 * no-account estimate (/estimate), a file kept for reprints (/file-retention),
 * and the limits of a printed part and the right to reproduce one (/terms §05,
 * §07), stated here as plainly as they are there.
 *
 * A server component, so all of it is in the initial HTML; only the first
 * block skips its reveal, so the headline paints without waiting on script.
 */

const title = "Replacement Parts for Repair & Service Companies";
const description =
  "Discontinued part holding up a repair? We reproduce it — 3D scanning, reverse engineering, and carbon-fiber printing, shipped nationwide in about 72 hours.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/replacement-parts" },
  openGraph: {
    type: "website",
    url: "/replacement-parts",
    siteName: SITE_NAME,
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE.url],
  },
};

const telephone = BUSINESS.telephone.replace(/^\+1-/, "");

const sources = [
  {
    icon: Camera,
    title: "Photos and a description",
    body: "No drawing, no CAD file. Photograph the broken part, tell us what it does and roughly how big it is, and we model it from that.",
  },
  {
    icon: FileBox,
    title: "A 3D file",
    body: "Have an STL, or a ZIP with the model in it? Send it and we price and print from exactly that.",
  },
  {
    icon: ScanLine,
    title: "The part itself",
    body: "For intricate geometry we 3D-scan the original and rebuild it from the scan. Call the shop to arrange it.",
  },
];

const steps = [
  {
    n: "01",
    title: "Send it",
    body: "Through the estimate form — no account, no password. A person reads it and answers within one business day.",
  },
  {
    n: "02",
    title: "We model it",
    body: "From your file, your photos, or a scan — with the material chosen for what the part has to survive.",
  },
  {
    n: "03",
    title: "We print and check it",
    body: "Engineering-grade and fiber-reinforced materials, and every part checked against the model before it ships.",
  },
  {
    n: "04",
    title: "It ships to you",
    body: "Most jobs are back in about 72 hours. Nothing is built or invoiced until you approve the price.",
  },
];

const questions = [
  {
    q: "We're not in Utah. Can you still help?",
    a: (
      <>
        Yes. The shop is in Utah and ships anywhere in the United States. Everything else —
        the estimate, the questions, your approval — happens by email and phone, Monday to
        Friday, 9am to 5pm Mountain Time.
      </>
    ),
  },
  {
    q: "Do I need an account or a CAD file?",
    a: (
      <>
        No to both. The <Link href="/estimate">estimate form</Link> takes photos and a
        description and needs no account. An account is only what lets us turn an estimate
        into a guaranteed quote, once we have the part file to print.
      </>
    ),
  },
  {
    q: "How fast is it?",
    a: (
      <>
        Most jobs are back in about 72 hours, and the estimate comes within one business day.
        The form takes dates at least three days out; if you need it sooner, call{" "}
        <a href={`tel:${BUSINESS.telephone}`}>{telephone}</a> and we will see what we can do.
      </>
    ),
  },
  {
    q: "Will a printed part hold up?",
    a: (
      <>
        It depends on the part, which is why we pick the material for the job — including
        carbon-fiber nylons and grades with heat-deflection temperatures up to 252 °C — rather
        than printing everything in one plastic. What a printed part is not is qualified for safety-critical
        use: brakes, steering, lifting, pressure, or anything whose failure could hurt someone.
        Our <Link href="/terms#part-limits">Terms</Link> spell that out.
      </>
    ),
  },
  {
    q: "Can I order the same part again?",
    a: (
      <>
        Yes. We keep the file after the job, so the next one is a reprint rather than a fresh
        start — and it stays yours; we never print it for anyone else. The{" "}
        <Link href="/file-retention">File Retention Policy</Link> has the detail.
      </>
    ),
  },
  {
    q: "Is there anything you won't reproduce?",
    a: (
      <>
        You need the right to have the part reproduced, and we will not copy a part carrying
        someone else&apos;s trademark without their authorisation, or anything regulated, such
        as weapon components. The <Link href="/terms#your-files">Terms</Link> list it all.
      </>
    ),
  },
];

export default function ReplacementPartsPage() {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-replacement-parts"
        data={breadcrumbSchema([{ name: "Replacement parts", path: "/replacement-parts" }])}
      />
      <JsonLd id="ld-service-replacement-parts" data={replacementPartsServiceSchema()} />

      <div className="min-h-screen bg-transparent text-cream-200">
        <SiteHeader />

        <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 sm:pt-36 pb-20">
          {/* Masthead */}
          <Reveal priority>
            <span className="eyebrow">FOR REPAIR &amp; SERVICE TEAMS</span>
            <h1 className="mt-4 max-w-4xl font-display text-[2.6rem] leading-[1.05] sm:text-6xl text-cream-100">
              Part discontinued? <span className="italic text-clay-300">We&apos;ll make the replacement.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream-400">
              TakomoCo reproduces broken, obsolete, and hard-to-source parts for repair and
              service businesses — modelled from a photo, a file, or the part itself, printed in
              engineering-grade and carbon-fiber materials, and shipped anywhere in the United
              States. Most jobs are back in about 72 hours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <RequestEstimateButton />
              <a
                href={`tel:${BUSINESS.telephone}`}
                className="inline-flex items-center justify-center gap-2 border border-clay-500/40 bg-clay-500/5 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 transition-colors hover:border-clay-400 hover:bg-clay-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
              >
                <Phone className="h-4 w-4 text-clay-300" aria-hidden="true" />
                Call {telephone}
              </a>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-cream-600">
              Estimate in one business day · no account needed · made in Utah, ships nationwide
            </p>
          </Reveal>

          {/* What to send */}
          <section className="mt-20" aria-labelledby="send-heading">
            <Reveal>
              <span className="eyebrow">WHAT YOU SEND US</span>
              <h2 id="send-heading" className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">
                Start from whatever you have
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-px bg-clay-500/15 sm:grid-cols-3">
              {sources.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.06} className="bg-espresso-900">
                  <div className="h-full p-6">
                    <span className="flex h-11 w-11 items-center justify-center border border-clay-500/25 text-clay-300">
                      <s.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-display text-2xl text-cream-100">{s.title}</h3>
                    <p className="mt-2 text-cream-400 leading-relaxed">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="mt-20" aria-labelledby="how-heading">
            <Reveal>
              <span className="eyebrow">HOW IT WORKS</span>
              <h2 id="how-heading" className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">
                Broken part to working part
              </h2>
            </Reveal>
            <ol className="mt-10 grid gap-px bg-clay-500/15 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.n} className="list-none bg-espresso-900">
                  <Reveal delay={i * 0.08} className="h-full p-6">
                    <span className="font-display text-4xl text-clay-500/70">{s.n}</span>
                    <h3 className="mt-4 font-display text-xl text-cream-100">{s.title}</h3>
                    <p className="mt-2 text-sm text-cream-400 leading-relaxed">{s.body}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>

          {/* Materials */}
          <Reveal className="mt-20">
            <Panel className="p-7 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-5 lg:items-center">
                <div className="lg:col-span-3">
                  <span className="eyebrow">MATERIALS</span>
                  <h2 className="mt-4 font-display text-3xl sm:text-4xl text-cream-100">
                    Not just plastic
                  </h2>
                  <p className="mt-4 text-cream-400 leading-relaxed">
                    We specialize in the abrasive, composite, and carbon-fiber-reinforced
                    filaments most shops avoid — carbon-fiber nylons, PPA-CF, PPS-CF/GF,
                    polycarbonate, ASA, PETG, and flexible TPU — with heat-deflection
                    temperatures up to 252 °C.
                  </p>
                </div>
                <div className="lg:col-span-2">
                  <Link
                    href="/materials"
                    className="group flex items-center justify-between gap-2 border border-clay-500/30 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-300 transition-colors hover:border-clay-400 hover:text-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                  >
                    See every material and its figures
                    <ArrowUpRight className="h-4 w-4 text-clay-300" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Panel>
          </Reveal>

          {/* Questions */}
          <section className="mt-20" aria-labelledby="questions-heading">
            <Reveal>
              <span className="eyebrow">STRAIGHT ANSWERS</span>
              <h2 id="questions-heading" className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">
                What repair shops ask first
              </h2>
            </Reveal>
            <dl className="mt-10 divide-y divide-clay-500/15 border-y border-clay-500/15">
              {questions.map((item) => (
                <div key={item.q} className="grid gap-3 py-7 md:grid-cols-12 md:gap-8">
                  <dt className="md:col-span-4 font-display text-xl text-cream-100">{item.q}</dt>
                  <dd className="md:col-span-8 text-cream-400 leading-relaxed [&_a]:text-clay-300 [&_a]:underline [&_a]:decoration-clay-500/40 [&_a]:underline-offset-2 hover:[&_a]:text-clay-200">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Closing CTA */}
          <Reveal className="mt-20">
            <div className="flex flex-col items-start gap-5 border-t border-clay-500/15 pt-10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl text-cream-100">
                  Got a part you can&apos;t get?
                </h2>
                <p className="mt-3 max-w-xl text-cream-400">
                  Send a photo and a sentence. We&apos;ll tell you what it takes and what it costs.
                </p>
              </div>
              <RequestEstimateButton className="shrink-0" />
            </div>
          </Reveal>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
