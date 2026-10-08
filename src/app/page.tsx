"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Layers,
  Lock,
  PencilRuler,
  Scan,
  Wrench,
  Zap,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BuildPlate from "@/components/BuildPlate";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";
import Magnetic from "@/components/ui/Magnetic";
import Marquee from "@/components/ui/Marquee";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import RequestEstimateButton from "@/components/RequestEstimateButton";
import { MATERIAL_LEGEND, MATERIAL_NAMES } from "@/lib/material-names";

const capabilities = [
  {
    n: "01",
    icon: Layers,
    title: "Additive Manufacturing",
    body: "Expert FDM/FFF printing focused on high-performance, engineering-grade, and fiber-reinforced materials.",
    tags: ["FDM / FFF", "Carbon-Fiber", "Engineering-Grade"],
  },
  {
    n: "02",
    icon: Scan,
    title: "Scanning & Reverse Engineering",
    body: "High-fidelity 3D scanning for intricate part reproduction, exact 1:1 copies, and durable digital archiving of legacy components.",
    tags: ["1:1 Reproduction", "Digital Archive", "CAD Rebuild"],
  },
  {
    n: "03",
    icon: Zap,
    title: "Rapid Prototyping",
    body: "Iterative design support that compresses your development cycles — from first concept to validated, shippable part.",
    tags: ["Iteration", "Validation", "Short Run"],
  },
];

const process = [
  { n: "01", title: "Scan & Capture", body: "Digitize legacy or reference parts with high-fidelity scanning." },
  { n: "02", title: "Design & Engineer", body: "CAD refinement, tolerancing, and material selection for the job." },
  { n: "03", title: "Print & Validate", body: "Production on engineering printers with dimensional verification." },
  { n: "04", title: "Deliver", body: "Inspected, finished components shipped by USPS direct to your door, anywhere in the United States." },
];

// The tolerance is the figure a buyer asks for first. It is a typical value,
// not a promise — /terms §07 says the same, and says a tolerance is only
// guaranteed when it has been agreed in writing.
//
// The lead time is when the shop's clock starts as well as how long it runs:
// from payment, because that is when manufacturing begins (/terms §04), and
// make-and-post only, because transit is USPS's and always extra.
const specSheet: [string, string | readonly string[]][] = [
  ["Maximum build volume", "256 × 256 × 256 mm"],
  ["Max heat deflection temperature", "Up to 485 °F / 252 °C"],
  ["Max print temperature", "Up to 608 °F / 320 °C"],
  ["Minimum layer height", "0.05 mm"],
  ["Typical FDM tolerance", "±0.2 mm"],
  ["Materials", [...MATERIAL_NAMES, "and more"]],
  ["Scanning", "Intricate geometry · near-exact reproduction"],
  ["Typical lead time", "72 hours from payment · USPS transit extra"],
];

/**
 * Who the site is for, said once, near the top. The homepage speaks to two
 * different buyers — the repair shop with a machine down and the engineer with
 * a drawing — and each should see their own situation before they scroll. The
 * engineer's door goes through `RequestEstimateButton` like every other pricing
 * call to action on the site, so it follows the visitor's session the same way.
 */
const audiences = [
  {
    icon: Wrench,
    eyebrow: "REPAIR & SERVICE TEAMS",
    title: "Part discontinued or out of stock?",
    body: "Send a photo, a file, or the part itself. We model it, print it in a material chosen for the job, and ship it to you. No account and no CAD file needed to get an estimate.",
    href: "/replacement-parts",
    cta: "How replacement parts work",
  },
  {
    icon: PencilRuler,
    eyebrow: "ENGINEERS & PRODUCT TEAMS",
    title: "Prototypes, tooling, and short runs",
    body: "Functional prototypes, custom tooling, and low-volume end-use parts in carbon-fiber and other engineering-grade composites, from your STEP, IGES, or STL file.",
    href: null,
    cta: null,
  },
];

const differentiators: {
  title: string;
  body: string;
}[] = [
  { title: "Rigorous quality control", body: "Documented, tightly controlled processes at every stage — from material handling to final inspection — for consistent, traceable, repeatable parts." },
  { title: "Material mastery", body: "Specialized in abrasive, composite, and carbon-fiber-reinforced filaments most shops avoid." },
  { title: "End-to-end workflow", body: "From scanning a broken legacy part to delivering a reinforced replacement — one shop." },
  { title: "Agile response", body: "Small-scale focus means rapid pivots, personal attention, and direct engineering support." },
  { title: "Dimensional verification", body: "Every part checked against the model before it ships — no surprises on arrival." },
];

// The materials come from the same list as the spec sheet, so the two cannot
// drift; the rest are the kinds of work and the properties people ask about.
const marqueeItems = [
  "Fast · Fitted · Flawless", ...MATERIAL_NAMES,
  "Carbon-Fiber Nylons", "Flexible Materials", "Flame Retardant Materials", "Impact Resistant Materials", "Fiber Reinforced Materials",
  "Reverse Engineering", "3D Scanning", "1:1 Reproduction",
];

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 90]);

  return (
    <div className="min-h-screen bg-transparent font-sans text-cream-200 selection:bg-clay-500/30 selection:text-cream-100">
      <SiteHeader />

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative overflow-hidden px-5 sm:px-8 pt-28 sm:pt-36 pb-16"
      >
        <motion.div style={{ y: heroY }} className="relative z-10 mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-end">
            {/* Headline column */}
            <div className="lg:col-span-12">
              <Reveal direction="up">
                <div className="flex items-center gap-3 mb-7">
                  <span className="eyebrow">SALT LAKE CITY, UT</span>
                  <span className="h-px w-10 bg-clay-500/40" />
                  <span className="eyebrow">ADDITIVE MANUFACTURING</span>
                </div>
              </Reveal>

              {/* The headline and lede are the page's largest paint, so they
                  are in the server HTML fully visible rather than waiting on
                  hydration to fade in — see `priority` on Reveal. The first
                  line is the search a Utah buyer types, word for word; the
                  title in src/lib/seo.ts takes the city's. */}
              <h1 className="font-display font-semibold tracking-tight text-cream-100 text-[2.7rem] leading-[1.02] sm:text-6xl lg:text-7xl">
                <span className="block">Utah additive manufacturing&nbsp;—</span>
                <span className="block">forging digital geometry</span>
                <span className="block italic text-clay-300">into physical parts.</span>
              </h1>

              {/* The lead promise, for the visitor whose machine is down right
                  now: the number at a size that survives a glance, directly
                  under the headline. The brand line that used to sit beside it
                  came out — it promised nothing a buyer could check, and it
                  still has the footer and the ticker. */}
              <Reveal direction="up" delay={0.25}>
                <div className="mt-6 inline-flex flex-wrap items-center gap-x-4 gap-y-2 border border-clay-500/40 bg-clay-500/10 px-5 py-3 shadow-glow">
                  <span className="flex items-center gap-2.5">
                    <Zap className="h-5 w-5 shrink-0 text-clay-300" aria-hidden="true" />
                    <span className="font-display text-2xl leading-none text-cream-100">
                      72<span className="text-clay-300">h</span>
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-cream-200">
                      Typical turnaround
                    </span>
                  </span>
                </div>
              </Reveal>

              {/* A step lighter than body copy elsewhere: the particle field
                  drifts through this paragraph, and it is the pitch. */}
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream-300">
                Machine down, part discontinued, deadline this week? A US-based
                additive manufacturing and rapid prototyping studio in Salt
                Lake City, Utah, shipping nationwide — high-precision 3D printing and scanning
                for engineering and reproduction work, made domestically and,
                for most jobs, in the post about 72 hours after payment.
              </p>

              <Reveal direction="up" delay={0.36}>
                <div className="mt-10 flex flex-col items-stretch sm:items-start gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Magnetic strength={0.4}>
                      <RequestEstimateButton />
                    </Magnetic>
                    <Magnetic strength={0.4}>
                      <Link
                        href="/login"
                        className="group inline-flex items-center justify-center gap-2 border border-clay-500/40 bg-clay-500/5 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-500/15 hover:border-clay-400 transition-colors"
                      >
                        Client sign in
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </Link>
                    </Magnetic>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Magnetic strength={0.3}>
                      <Link
                        href="/materials"
                        className="group inline-flex items-center justify-center gap-2 border border-clay-500/30 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-300 hover:border-clay-400 hover:text-cream-100 transition-colors"
                      >
                        Material index
                        <ArrowUpRight className="h-4 w-4 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                      </Link>
                    </Magnetic>
                    <Magnetic strength={0.3}>
                      <Link
                        href="/pricing"
                        className="group inline-flex items-center justify-center gap-2 border border-clay-500/30 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-300 hover:border-clay-400 hover:text-cream-100 transition-colors"
                      >
                        View pricing
                        <ArrowUpRight className="h-4 w-4 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                      </Link>
                    </Magnetic>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream-500">
                    On a deadline?{" "}
                    <a
                      href="tel:+13856954178"
                      className="text-clay-300 underline decoration-clay-500/40 underline-offset-2 transition-colors hover:text-clay-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                    >
                      Call the shop · 385-695-4178
                    </a>
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Who it's for — each buyer's own situation, before the spec sheet. */}
      <section
        className="mx-auto max-w-6xl px-5 sm:px-8 pb-16 sm:pb-20"
        aria-label="Who we work with"
      >
        <Reveal>
          <div className="mb-5 flex items-center gap-3">
            <span className="eyebrow">WHO WE WORK WITH</span>
            <span className="h-px flex-1 bg-clay-500/20" />
          </div>
          <div className="grid gap-px bg-clay-500/15 md:grid-cols-2">
            {audiences.map((a) => (
              <div key={a.eyebrow} className="flex flex-col bg-espresso-900 p-6 sm:p-8">
                <span className="flex h-11 w-11 items-center justify-center border border-clay-500/25 text-clay-300">
                  <a.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-clay-300">
                  {a.eyebrow}
                </span>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl text-cream-100">{a.title}</h2>
                <p className="mt-3 flex-1 leading-relaxed text-cream-400">{a.body}</p>
                <div className="mt-6">
                  {a.href ? (
                    <Link
                      href={a.href}
                      className="group inline-flex items-center justify-center gap-2 border border-clay-500/40 bg-clay-500/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cream-100 transition-colors hover:border-clay-400 hover:bg-clay-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                    >
                      {a.cta}
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  ) : (
                    <RequestEstimateButton variant="ghost" size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* A part file is often the customer's own design, and keeping it
              private is a promise /file-retention already makes in these
              words. Said here because it is what a professional wonders
              before sending one. */}
          <p className="mt-5 flex items-start gap-2.5 text-sm leading-relaxed text-cream-400">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-clay-300" aria-hidden="true" />
            <span>
              <strong className="font-medium text-cream-200">Your files stay yours.</strong>{" "}
              Uploads are held in access-controlled storage, seen only by you and the
              shop, and never published, sold, or printed for anyone else.{" "}
              <Link
                href="/file-retention"
                className="text-clay-300 underline decoration-clay-500/40 underline-offset-2 transition-colors hover:text-clay-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
              >
                How we handle files
              </Link>
            </span>
          </p>
        </Reveal>
      </section>

      {/* Shop floor — live voxel build preview + specification */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20 sm:pb-24" aria-label="Shop floor">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <Reveal direction="right" className="lg:col-span-5">
            <span className="eyebrow">SPECIFICATION</span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100 mb-8">The fine print</h2>
            <Panel className="p-0 overflow-hidden">
              <table className="w-full">
                <tbody>
                  {specSheet.map(([k, v], i) => (
                    <tr key={k} className={i % 2 ? "bg-espresso-800/30" : ""}>
                      <th scope="row" className="text-left align-top px-5 py-4 font-mono text-[10px] uppercase tracking-[0.15em] text-cream-500 w-2/5">{k}</th>
                      <td className="px-5 py-4 text-cream-200 font-medium">
                        {typeof v === "string"
                          ? v
                          : // A list wraps between items, never inside one — "PA6-" over "CF" reads as two materials.
                            v.map((item, n) => (
                              <span key={item}>
                                {n > 0 && " · "}
                                <span className="whitespace-nowrap">{item}</span>
                              </span>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-cream-500">
              {MATERIAL_LEGEND}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <RequestEstimateButton size="sm" />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream-500">
                Priced per part · no obligation
              </span>
            </div>
          </Reveal>
          <Reveal direction="left" delay={0.15} className="lg:col-span-7">
            <Panel className="p-3 sm:p-4">
              <BuildPlate />
            </Panel>
          </Reveal>
        </div>
      </section>

      {/* Materials ticker */}
      <section className="border-y border-clay-500/12 bg-espresso-900/40" aria-label="Materials">
        <div className="flex items-center">
          <span className="hidden sm:block shrink-0 border-r border-clay-500/12 px-6 py-4 eyebrow">STOCK ⁄ FILAMENT</span>
          <Marquee className="py-4">
            {marqueeItems.map((m) => (
              <span key={m} className="flex items-center gap-3 font-mono text-sm uppercase tracking-[0.15em] text-cream-500 whitespace-nowrap">
                <span className="h-1 w-1 bg-clay-400" />
                {m}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* Capabilities — numbered editorial rows */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-12">
            <div>
              <span className="eyebrow">CAPABILITIES</span>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">What we do</h2>
            </div>
            <span className="hidden sm:block font-mono text-xs text-cream-500">[ 03 DISCIPLINES ]</span>
          </div>
        </Reveal>

        <div className="border-t border-clay-500/15">
          {capabilities.map((c, i) => (
            <Reveal key={c.n} delay={i * 0.08}>
              <div className="group grid md:grid-cols-12 gap-4 md:gap-8 items-start border-b border-clay-500/15 py-8 transition-colors hover:bg-espresso-800/30">
                <div className="md:col-span-1 flex md:block items-center gap-3">
                  <span className="font-mono text-sm text-clay-300">{c.n}</span>
                </div>
                <div className="md:col-span-1">
                  <span className="flex h-11 w-11 items-center justify-center border border-clay-500/25 text-clay-300 transition-colors group-hover:bg-clay-500/15">
                    <c.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="md:col-span-4 font-display text-2xl text-cream-100">{c.title}</h3>
                <p className="md:col-span-4 text-cream-400 leading-relaxed">{c.body}</p>
                <div className="md:col-span-2 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span key={t} className="border border-clay-500/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cream-500">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <Link
            href="/replacement-parts"
            className="group mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-300 transition-colors hover:text-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
          >
            Repair or service company? How we reproduce discontinued parts
            <ArrowUpRight className="h-4 w-4 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </Link>
        </Reveal>
      </section>

      {/* Process */}
      <section className="border-y border-clay-500/12 bg-espresso-900/40">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
          <Reveal>
            <span className="eyebrow">WORKFLOW</span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100 mb-12">Concept to component</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-clay-500/15">
            {process.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.1} className="bg-espresso-900">
                <div className="h-full p-6 hover:bg-espresso-800/50 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display text-4xl text-clay-400">{p.n}</span>
                    <span className="h-2 w-2 rounded-full bg-clay-400" />
                  </div>
                  <h3 className="font-display text-xl text-cream-100 mb-2">{p.title}</h3>
                  <p className="text-sm text-cream-400 leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15}>
            <div className="mt-10 flex flex-col items-start gap-4 border-t border-clay-500/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-cream-400">
                Have a part in mind? Send us the file and we will come back with
                a price and a lead time.
              </p>
              <RequestEstimateButton className="shrink-0" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Differentiators */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <span className="eyebrow">WHY TAKOMO</span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100 mb-8">The difference</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-clay-500/15">
            {differentiators.map((d) => (
              <div key={d.title} className="bg-espresso-900 p-6">
                <h3 className="font-display text-xl text-clay-300 mb-2">{d.title}</h3>
                <p className="text-cream-400 leading-relaxed text-sm">{d.body}</p>
              </div>
            ))}
            <div className="bg-espresso-900 p-6 flex items-end gap-6">
              <div>
                <div className="font-display text-5xl text-cream-100">
                  <AnimatedCounter value={1} suffix=":1" />
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-cream-500">Reproduction fidelity</p>
              </div>
              <div>
                <div className="font-display text-5xl text-cream-100">
                  <AnimatedCounter value={72} suffix="h" />
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-cream-500">Typical turnaround</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Closing CTA. The site-wide colophon lives in <SiteFooter /> below. */}
      <section className="border-t border-clay-500/15">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
          <Reveal>
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-8">
                <h2 className="font-display text-4xl sm:text-6xl text-cream-100 leading-[1.05]">
                  Ready to start <span className="italic text-clay-300">building?</span>
                </h2>
                <p className="mt-5 max-w-lg text-cream-400">
                  Submit a request or reach out directly — most jobs are in the
                  post about 72 hours after payment. We specialize in
                  high-strength, chemically and impact-resistant composites.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3">
                <Magnetic strength={0.3}>
                  <Link href="/login" className="group flex items-center justify-between gap-2 bg-clay-700 px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-800 transition-colors">
                    Submit a request
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </Magnetic>
                <Magnetic strength={0.3}>
                  <RequestEstimateButton
                    variant="ghost"
                    className="w-full justify-between px-6 py-4 text-[11px] tracking-[0.15em]"
                  />
                </Magnetic>
                <Link href="/pricing" className="group flex items-center justify-between gap-2 border border-clay-500/30 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-300 hover:border-clay-400 hover:text-cream-100 transition-colors">
                  View rate sheet
                  <ArrowUpRight className="h-4 w-4 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </Link>
                <a href="mailto:info@takomoco.com" className="group flex items-center justify-between gap-2 border border-clay-500/30 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-300 hover:border-clay-400 hover:text-cream-100 transition-colors">
                  info@takomoco.com
                  <ArrowUpRight className="h-4 w-4 text-clay-300" aria-hidden="true" />
                </a>
              </div>
            </div>
          </Reveal>

          <p className="mt-16 max-w-3xl border-t border-clay-500/12 pt-8 font-mono text-[10px] normal-case tracking-[0.08em] leading-relaxed text-cream-500">
            Every TakomoCo part is produced under strict internal quality
            control standards — controlled material handling and drying,
            calibrated and regularly maintained equipment, documented print
            parameters, and in-process checks with a final inspection before
            anything leaves the shop.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
