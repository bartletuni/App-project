"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Layers,
  Scan,
  Zap,
  Plus,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";

import SiteHeader from "@/components/SiteHeader";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";
import Magnetic from "@/components/ui/Magnetic";
import Marquee from "@/components/ui/Marquee";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

const heroSpecs = [
  { k: "BUILD VOLUME", v: "256³", u: "mm" },
  { k: "EXTRUSION", v: "320", u: "°C max" },
  { k: "LAYER", v: "0.05", u: "mm" },
  { k: "LEAD TIME", v: "72", u: "hours" },
];

const capabilities = [
  {
    n: "01",
    icon: Layers,
    title: "Additive Manufacturing",
    body: "Expert FDM/FFF printing with a strict focus on high-performance, engineering-grade and fiber-reinforced materials.",
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
  { n: "04", title: "Deliver", body: "Inspected, finished components shipped direct to your door." },
];

const specSheet = [
  ["Maximum build volume", "256 × 256 × 256 mm"],
  ["Max heat deflection temperature", "Up to 485 °F / 252 °C"],
  ["Minimum layer height", "0.05 mm"],
  ["Materials", "PPA-CF · PPS-CF · PPS-GF · PETG-CF · PA12-CF · PC · PC-CF/FR · ASA-CF/GF · ABS · PETG · PLA · TPU · PA6-CF · PA12-CF · PA612-CF · and more"],
  ["Scanning", "Intricate geometry · near-exact reproduction"],
];

const differentiators: {
  title: string;
  body: string;
  note?: boolean;
  feature?: boolean;
}[] = [
  { title: "ISO 9001:2015-aligned", body: "Our workflow follows ISO 9001:2015 quality-management standards for consistent, traceable, repeatable parts.", note: true, feature: true },
  { title: "Material mastery", body: "Specialized in abrasive, composite, and carbon-fiber-reinforced filaments most shops avoid." },
  { title: "End-to-end workflow", body: "From scanning a broken legacy part to delivering a reinforced replacement — one shop." },
  { title: "Agile response", body: "Small-scale focus means rapid pivots, personal attention, and direct engineering support." },
];

const marqueeItems = [
  "Carbon-Fiber Nylons", "PET-CF/GF", "ASA-CF/GF", "Polycarbonate", "TPU", "PPA-CF",
  "PPS-CF/GF", "PEBA", "Reverse Engineering", "3D Scanning", "1:1 Reproduction",
  "Flexible Materials", "Flame Retardant Materials", "Impact Resistant Materials", "Fiber Reinforced Materials",
];

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 90]);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const glowX = useSpring(useTransform(px, [0, 1], ["0%", "100%"]), { stiffness: 80, damping: 20 });
  const glowY = useSpring(useTransform(py, [0, 1], ["0%", "100%"]), { stiffness: 80, damping: 20 });
  const heroGlow = useMotionTemplate`radial-gradient(620px circle at ${glowX} ${glowY}, rgba(217,142,61,0.13), transparent 60%)`;

  const handleHeroPointer = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-cream-200 selection:bg-clay-500/30 selection:text-cream-100">
      <SiteHeader />

      {/* Hero */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroPointer}
        className="relative overflow-hidden px-5 sm:px-8 pt-28 sm:pt-36 pb-16"
      >
        <motion.div aria-hidden="true" style={{ background: heroGlow }} className="pointer-events-none absolute inset-0 z-0" />

        <motion.div style={{ y: heroY }} className="relative z-10 mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-end">
            {/* Headline column */}
            <div className="lg:col-span-8">
              <Reveal direction="up">
                <div className="flex items-center gap-3 mb-7">
                  <span className="eyebrow">EST. UTAH</span>
                  <span className="h-px w-10 bg-clay-500/40" />
                  <span className="eyebrow">ADDITIVE MANUFACTURING</span>
                </div>
              </Reveal>

              <h1 className="font-display font-semibold tracking-tight text-cream-100 text-[2.7rem] leading-[1.02] sm:text-6xl lg:text-7xl">
                <Reveal direction="up" delay={0.05}>
                  <span className="block">Forging digital</span>
                </Reveal>
                <Reveal direction="up" delay={0.12}>
                  <span className="block">geometry into</span>
                </Reveal>
                <Reveal direction="up" delay={0.19}>
                  <span className="block italic text-clay-300">physical parts.</span>
                </Reveal>
              </h1>

              <Reveal direction="up" delay={0.28}>
                <p className="mt-8 max-w-xl text-lg leading-relaxed text-cream-400">
                  A specialized additive manufacturing and rapid prototyping
                  studio — high-precision 3D printing and scanning for
                  engineering and reproduction work.
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.36}>
                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Magnetic strength={0.4}>
                    <Link
                      href="/login"
                      className="group inline-flex items-center justify-center gap-2 bg-clay-600 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-700 transition-colors shadow-glow"
                    >
                      Start a build
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Magnetic>
                  <Magnetic strength={0.3}>
                    <Link
                      href="/materials"
                      className="group inline-flex items-center justify-center gap-2 border border-clay-500/30 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-300 hover:border-clay-400 hover:text-cream-100 transition-colors"
                    >
                      Material index
                      <ArrowUpRight className="h-4 w-4 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </Link>
                  </Magnetic>
                </div>
              </Reveal>
            </div>

            {/* Spec stamp */}
            <Reveal direction="left" delay={0.3} className="lg:col-span-4">
              <Panel className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <span className="eyebrow">SHOP SPEC</span>
                  <Plus className="h-3.5 w-3.5 text-clay-400" aria-hidden="true" />
                </div>
                <dl className="divide-y divide-clay-500/12">
                  {heroSpecs.map((s) => (
                    <div key={s.k} className="flex items-baseline justify-between py-3">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500">{s.k}</dt>
                      <dd className="font-display text-2xl text-cream-100">
                        {s.v}
                        <span className="ml-1 font-mono text-[10px] tracking-normal text-clay-400">{s.u}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </Reveal>
          </div>
        </motion.div>
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
              <h2 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">What we make</h2>
            </div>
            <span className="hidden sm:block font-mono text-xs text-cream-600">[ 03 DISCIPLINES ]</span>
          </div>
        </Reveal>

        <div className="border-t border-clay-500/15">
          {capabilities.map((c, i) => (
            <Reveal key={c.n} delay={i * 0.08}>
              <div className="group grid md:grid-cols-12 gap-4 md:gap-8 items-start border-b border-clay-500/15 py-8 transition-colors hover:bg-espresso-800/30">
                <div className="md:col-span-1 flex md:block items-center gap-3">
                  <span className="font-mono text-sm text-clay-400">{c.n}</span>
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
                    <span className="font-display text-4xl text-clay-500/70">{p.n}</span>
                    <span className="h-2 w-2 rounded-full bg-clay-400" />
                  </div>
                  <h3 className="font-display text-xl text-cream-100 mb-2">{p.title}</h3>
                  <p className="text-sm text-cream-400 leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Spec sheet + differentiators */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-12 gap-12">
        <Reveal direction="right" className="lg:col-span-7">
          <span className="eyebrow">SPECIFICATION</span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100 mb-8">The fine print</h2>
          <Panel className="p-0 overflow-hidden">
            <table className="w-full">
              <tbody>
                {specSheet.map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? "bg-espresso-800/30" : ""}>
                    <th scope="row" className="text-left align-top px-5 py-4 font-mono text-[10px] uppercase tracking-[0.15em] text-cream-500 w-2/5">{k}</th>
                    <td className="px-5 py-4 text-cream-200 font-medium">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Reveal>

        <Reveal direction="left" delay={0.1} className="lg:col-span-5">
          <span className="eyebrow">WHY TAKOMO</span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100 mb-8">The difference</h2>
          <div className="space-y-px bg-clay-500/15">
            {differentiators.map((d) => (
              <div
                key={d.title}
                className={`p-6 ${d.feature ? "bg-clay-500/10 border-l-2 border-clay-500" : "bg-espresso-900"}`}
              >
                <h3 className="font-display text-xl text-clay-300 mb-2">
                  {d.title}
                  {d.note && <sup className="ml-0.5 align-super font-mono text-[10px] text-clay-400">1</sup>}
                </h3>
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

      {/* CTA + footer */}
      <footer className="border-t border-clay-500/15">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
          <Reveal>
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-8">
                <h2 className="font-display text-4xl sm:text-6xl text-cream-100 leading-[1.05]">
                  Ready to start <span className="italic text-clay-300">building?</span>
                </h2>
                <p className="mt-5 max-w-lg text-cream-400">
                  Submit a request or reach out directly. We specialize in
                  high-strength, chemically and impact-resistant composites.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3">
                <Magnetic strength={0.3}>
                  <Link href="/login" className="group flex items-center justify-between gap-2 bg-clay-600 px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-700 transition-colors">
                    Submit a request
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </Magnetic>
                <a href="mailto:takomocompany@gmail.com" className="group flex items-center justify-between gap-2 border border-clay-500/30 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-300 hover:border-clay-400 hover:text-cream-100 transition-colors">
                  takomocompany@gmail.com
                  <ArrowUpRight className="h-4 w-4 text-clay-300" aria-hidden="true" />
                </a>
              </div>
            </div>
          </Reveal>

          <div className="mt-16 pt-8 border-t border-clay-500/12 flex flex-col sm:flex-row justify-between gap-6 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-600">
            <span className="text-cream-300">TAKOMO<span className="text-clay-400">⁄</span>CO</span>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-8">
              <span>☎ 385-695-4178</span>
              <span>NAICS 333248 · 541330 · 541420</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>

          <p className="mt-6 max-w-3xl font-mono text-[10px] normal-case tracking-[0.08em] leading-relaxed text-cream-600">
            ¹ TakomoCo operates in accordance with ISO 9001:2015
            quality-management standards but is not ISO-certified, nor endorsed
            by or affiliated with the International Organization for
            Standardization.
          </p>
        </div>
      </footer>
    </div>
  );
}
