"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Beaker, Zap } from "lucide-react";
import { motion } from "framer-motion";

import Reveal from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";
import Magnetic from "@/components/ui/Magnetic";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 90, damping: 16 },
  },
};

interface PropertyBarProps {
  label: string;
  display: string;
  value: number | null | undefined;
  max: number;
  color: string;
}

function PropertyBar({ label, display, value, max, color }: PropertyBarProps) {
  const pct = value && max ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-cream-500">{label}</span>
        <span className="text-cream-200">{display}</span>
      </div>
      <div className="h-2 w-full bg-espresso-600 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/materials?t=" + new Date().getTime(), { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMaterials(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-clay-300 font-semibold animate-pulse">
        Loading material library...
      </div>
    );
  }

  const maxTensile = Math.max(...materials.map((m) => m.tensileStrength || 0), 0);
  const maxStiffness = Math.max(...materials.map((m) => m.stiffness || 0), 0);
  const maxHdt = Math.max(...materials.map((m) => m.hdt || 0), 0);
  const maxImpact = Math.max(...materials.map((m) => m.impactResistance || 0), 0);

  return (
    <div className="min-h-screen bg-transparent font-sans">
      <nav
        className="bg-espresso-800/62 backdrop-blur-xl shadow-sm border-b border-espresso-600/50 sticky top-0 z-50"
        aria-label="Materials library navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-cream-500 hover:text-clay-300 transition-colors font-semibold text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <Image
                src="/logo.png"
                alt="TakomoCo Logo"
                width={32}
                height={32}
                className="rounded-lg shadow-sm shrink-0"
              />
              <span className="font-bold text-lg sm:text-xl text-cream-200 tracking-tight truncate">
                TakomoCo
              </span>
            </Link>
            <Magnetic strength={0.4}>
              <Link
                href="/login"
                className="inline-block text-sm font-bold bg-clay-600 text-white px-4 sm:px-5 py-2 rounded-full hover:bg-clay-700 transition-colors shadow-sm hover:shadow-glow shrink-0"
              >
                Sign In
              </Link>
            </Magnetic>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Reveal className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-clay-500/40 bg-espresso-800/72 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-clay-300 shadow-sm mb-6">
            <Beaker className="w-4 h-4" aria-hidden="true" />
            Engineering-grade thermoplastics
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-cream-200 tracking-tight mb-4">
            Material{" "}
            <span className="animate-gradient-text animate-gradient-x bg-gradient-to-r from-clay-400 via-ember-400 to-clay-300">
              Library
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-cream-400 leading-relaxed">
            We work with a wide array of high-performance thermoplastics. Explore
            our technical materials specialized for high-strength, chemically
            resistant, and impact-resistant applications.
          </p>
        </Reveal>

        {materials.length === 0 ? (
          <Reveal className="bg-espresso-800/62 backdrop-blur-xl rounded-3xl shadow-sm border border-clay-500/18 p-10 sm:p-16 text-center max-w-2xl mx-auto">
            <Beaker className="w-16 h-16 text-cream-600 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-2xl font-bold text-cream-200 mb-2">
              No materials listed yet
            </h3>
            <p className="text-cream-500">
              Check back later as we update our comprehensive material library.
            </p>
          </Reveal>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 [perspective:1200px]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {materials.map((m) => (
              <motion.div variants={itemVariants} key={m.id}>
                <TiltCard
                  intensity={6}
                  glowColor="rgba(99,102,241,0.16)"
                  className="group h-full rounded-3xl"
                >
                  <div className="h-full bg-espresso-800/62 backdrop-blur-xl rounded-3xl shadow-sm hover:shadow-xl border border-clay-500/18 overflow-hidden flex flex-col transition-all">
                    {m.imageId ? (
                      <div className="h-48 w-full bg-espresso-600/50 backdrop-blur-sm relative overflow-hidden border-b border-espresso-600/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/download/${m.imageId}`}
                          alt={m.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-full bg-gradient-to-r from-espresso-700/60 to-espresso-600/60 backdrop-blur-sm border-b border-espresso-600/50"></div>
                    )}
                    <div className="p-6 sm:p-8 flex-1 flex flex-col">
                      <h3 className="text-2xl font-extrabold text-cream-200 mb-3">
                        {m.name}
                      </h3>
                      {m.description ? (
                        <p className="text-cream-400 leading-relaxed mb-6">
                          {m.description}
                        </p>
                      ) : (
                        <p className="text-cream-500 italic text-sm mb-6">
                          High performance engineering-grade material.
                        </p>
                      )}

                      {/* Engineering properties */}
                      <div className="space-y-4 mt-auto pt-4 border-t border-espresso-700">
                        <PropertyBar
                          label="Tensile Strength"
                          display={
                            m.tensileStrength !== null && m.tensileStrength !== undefined
                              ? `${m.tensileStrength} MPa`
                              : "N/A"
                          }
                          value={m.tensileStrength}
                          max={maxTensile}
                          color="bg-clay-500"
                        />
                        <PropertyBar
                          label="Stiffness"
                          display={
                            m.stiffness !== null && m.stiffness !== undefined
                              ? `${m.stiffness * 1000} MPa`
                              : "N/A"
                          }
                          value={m.stiffness}
                          max={maxStiffness}
                          color="bg-ember-400"
                        />
                        <PropertyBar
                          label="Heat Deflection Temp (HDT)"
                          display={
                            m.hdt !== null && m.hdt !== undefined ? `${m.hdt} °C` : "N/A"
                          }
                          value={m.hdt}
                          max={maxHdt}
                          color="bg-amber-500"
                        />
                        <PropertyBar
                          label="Impact Resistance"
                          display={
                            m.impactResistance !== null && m.impactResistance !== undefined
                              ? `${m.impactResistance / 1000} KJ/m²`
                              : "N/A"
                          }
                          value={m.impactResistance}
                          max={maxImpact}
                          color="bg-emerald-500"
                        />
                      </div>

                      <div className="mt-8 pt-6 border-t border-espresso-600/50">
                        <Link
                          href={`/dashboard?material=${encodeURIComponent(m.name)}`}
                          className="w-full inline-flex justify-center items-center gap-2 bg-espresso-800/55 backdrop-blur-sm hover:bg-clay-600 text-clay-300 hover:text-white border border-espresso-600/50 hover:border-transparent px-6 py-3 rounded-xl font-bold transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Zap className="w-4 h-4" aria-hidden="true" />
                          Build With This Material
                        </Link>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
