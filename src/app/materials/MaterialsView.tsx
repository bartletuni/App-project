"use client";

import Link from "next/link";
import { Beaker, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";
import RequestQuoteButton from "@/components/RequestQuoteButton";

/** The subset of the Material record this view renders. */
export interface MaterialSummary {
  id: string;
  name: string;
  description: string | null;
  imageId: string | null;
  tensileStrength: number | null;
  stiffness: number | null;
  hdt: number | null;
  impactResistance: number | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 90, damping: 16 } },
};

function PropertyBar({ label, display, value, max }: { label: string; display: string; value: number | null | undefined; max: number; }) {
  const pct = value && max ? (value / max) * 100 : 0;
  return (
    <div className="py-2.5 border-b border-clay-500/10 last:border-0">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream-500">{label}</span>
        <span className="font-mono text-xs text-cream-200">{display}</span>
      </div>
      <div className="h-1 w-full bg-espresso-600 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-clay-600 to-clay-400"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/**
 * The stock index UI. Materials are fetched on the server and passed in, so
 * the full list is present in the initial HTML for crawlers; this component
 * only owns the animation and hover behaviour.
 */
export default function MaterialsView({ materials }: { materials: MaterialSummary[] }) {
  const { maxTensile, maxStiffness, maxHdt, maxImpact } = materials.reduce(
    (acc, m) => {
      if ((m.tensileStrength || 0) > acc.maxTensile) acc.maxTensile = m.tensileStrength || 0;
      if ((m.stiffness || 0) > acc.maxStiffness) acc.maxStiffness = m.stiffness || 0;
      if ((m.hdt || 0) > acc.maxHdt) acc.maxHdt = m.hdt || 0;
      if ((m.impactResistance || 0) > acc.maxImpact) acc.maxImpact = m.impactResistance || 0;
      return acc;
    },
    { maxTensile: 0, maxStiffness: 0, maxHdt: 0, maxImpact: 0 }
  );

  return (
    <div className="min-h-screen bg-transparent text-cream-200">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 sm:pt-36 pb-20">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-12 border-b border-clay-500/15 pb-8">
            <div>
              <span className="eyebrow">MATERIAL INDEX</span>
              <h1 className="mt-4 font-display text-5xl sm:text-6xl text-cream-100">
                The <span className="italic text-clay-300">stock</span> room
              </h1>
              <p className="mt-5 max-w-xl text-cream-400 leading-relaxed">
                High-performance thermoplastics for high-strength, chemically
                resistant, and impact-resistant applications.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-4">
              <span className="hidden sm:block font-mono text-xs text-cream-600 whitespace-nowrap">
                [ {String(materials.length).padStart(2, "0")} ON FILE ]
              </span>
              <RequestQuoteButton size="sm" className="whitespace-nowrap" />
            </div>
          </div>
        </Reveal>

        {materials.length === 0 ? (
          <Panel className="p-12 sm:p-16 text-center max-w-2xl mx-auto">
            <Beaker className="w-12 h-12 text-clay-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="font-display text-2xl text-cream-100 mb-2">Index is empty</h2>
            <p className="text-cream-500 mb-6">Check back as we expand the material library.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-clay-500/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-clay-200 hover:bg-clay-500/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
            >
              Return Home
            </Link>
          </Panel>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {materials.map((m, i) => (
              <motion.div variants={itemVariants} key={m.id}>
                <Panel className="group h-full flex flex-col rounded-md hover:border-clay-500/35 transition-colors">
                  {m.imageId && (
                    <div className="h-40 w-full overflow-hidden border-b border-clay-500/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/download/${m.imageId}`} alt={`${m.name} filament`} loading="lazy" className="h-full w-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-500" />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[10px] tracking-[0.18em] text-clay-400">
                        M-{String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-clay-400" />
                    </div>
                    <h2 className="font-display text-2xl text-cream-100 mb-2">{m.name}</h2>
                    <p className="text-sm text-cream-400 leading-relaxed mb-5">
                      {m.description || "High-performance engineering-grade material."}
                    </p>

                    <div className="mt-auto">
                      <PropertyBar label="Tensile" display={m.tensileStrength != null ? `${m.tensileStrength} MPa` : "N/A"} value={m.tensileStrength} max={maxTensile} />
                      <PropertyBar label="Stiffness" display={m.stiffness != null ? `${m.stiffness * 1000} MPa` : "N/A"} value={m.stiffness} max={maxStiffness} />
                      <PropertyBar label="HDT" display={m.hdt != null ? `${m.hdt} °C` : "N/A"} value={m.hdt} max={maxHdt} />
                      <PropertyBar label="Impact" display={m.impactResistance != null ? `${m.impactResistance / 1000} KJ/m²` : "N/A"} value={m.impactResistance} max={maxImpact} />
                    </div>

                    <Link
                      href={`/dashboard?material=${encodeURIComponent(m.name)}`}
                      className="group/cta mt-6 inline-flex items-center justify-between gap-2 border border-clay-500/25 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-cream-200 hover:bg-clay-500/15 hover:border-clay-400 transition-colors"
                    >
                      Build with this
                      <ArrowRight className="h-4 w-4 text-clay-300 transition-transform group-hover/cta:translate-x-1" aria-hidden="true" />
                    </Link>
                    <RequestQuoteButton
                      variant="outline"
                      size="sm"
                      label="Quote this material"
                      material={m.name}
                      className="mt-2 w-full justify-between px-4 py-3 tracking-[0.18em] text-[10px]"
                    />
                  </div>
                </Panel>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
