"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Layers,
  Scan,
  Zap,
  Shield,
  CheckCircle2,
  Sparkles,
  Box,
  Thermometer,
  Ruler,
  Clock,
  ScanLine,
  PencilRuler,
  Printer,
  PackageCheck,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";

import Reveal from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";
import Magnetic from "@/components/ui/Magnetic";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Marquee from "@/components/ui/Marquee";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
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

const competencies = [
  {
    icon: Layers,
    title: "Additive Manufacturing",
    body: "Expert FDM/FFF printing with a strict focus on high-performance, engineering-grade materials.",
    accent: "indigo",
    glow: "rgba(217,142,61,0.22)",
  },
  {
    icon: Scan,
    title: "3D Scanning & Reverse Eng.",
    body: "High-fidelity scanning for intricate part reproduction, exact 1:1 copies, and robust digital archiving.",
    accent: "blue",
    glow: "rgba(230,168,95,0.20)",
  },
  {
    icon: Zap,
    title: "Rapid Prototyping",
    body: "Iterative design support to dramatically accelerate your product development cycles.",
    accent: "purple",
    glow: "rgba(193,122,75,0.22)",
  },
];

const accentMap: Record<string, string> = {
  indigo: "bg-clay-500/15 text-clay-300 group-hover:border-clay-500/40",
  blue: "bg-ember-400/15 text-ember-300 group-hover:border-ember-400/40",
  purple: "bg-clay-700/20 text-clay-200 group-hover:border-clay-600/40",
};

const stats = [
  { value: 256, suffix: "mm³", label: "Max build volume", icon: Box },
  { value: 320, suffix: "°C", label: "Extrusion capacity", icon: Thermometer },
  { value: 0.05, suffix: "mm", label: "Layer precision", decimals: 2, icon: Ruler },
  { value: 72, suffix: "h", label: "Rapid turnaround", icon: Clock },
];

const marqueeItems = [
  "Carbon-Fiber Nylon",
  "PETG-CF",
  "ASA",
  "Polycarbonate",
  "TPU",
  "PA12",
  "Reverse Engineering",
  "1:1 Reproduction",
  "Engineering-Grade",
  "Impact Resistant",
];

const process = [
  {
    icon: ScanLine,
    step: "01",
    title: "Scan & Capture",
    body: "We digitize your legacy or reference part with high-fidelity 3D scanning.",
  },
  {
    icon: PencilRuler,
    step: "02",
    title: "Design & Engineer",
    body: "CAD refinement, tolerancing, and material selection tuned to the application.",
  },
  {
    icon: Printer,
    step: "03",
    title: "Print & Validate",
    body: "Production on engineering-grade printers with dimensional verification.",
  },
  {
    icon: PackageCheck,
    step: "04",
    title: "Deliver",
    body: "Finished, inspected components shipped directly to your door.",
  },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);

  // Scroll-driven parallax for hero content
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Pointer-reactive highlight inside the hero
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const glowX = useSpring(useTransform(px, [0, 1], ["0%", "100%"]), {
    stiffness: 80,
    damping: 20,
  });
  const glowY = useSpring(useTransform(py, [0, 1], ["0%", "100%"]), {
    stiffness: 80,
    damping: 20,
  });
  const heroGlow = useMotionTemplate`radial-gradient(600px circle at ${glowX} ${glowY}, rgba(217,142,61,0.12), transparent 60%)`;

  // Subtle headline tilt toward the cursor
  const tiltX = useSpring(useTransform(py, [0, 1], [6, -6]), {
    stiffness: 120,
    damping: 18,
  });
  const tiltY = useSpring(useTransform(px, [0, 1], [-6, 6]), {
    stiffness: 120,
    damping: 18,
  });

  const handleHeroPointer = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <div className="min-h-screen bg-transparent font-sans selection:bg-clay-500/30 selection:text-cream-100">
      {/* Navigation */}
      <nav
        className="fixed top-0 w-full bg-espresso-800/62 backdrop-blur-xl z-50 border-b border-espresso-700/60"
        aria-label="Landing page navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3"
            >
              <Image
                src="/logo.png"
                alt="TakomoCo Logo"
                width={32}
                height={32}
                className="rounded-lg shadow-sm"
              />
              <span className="font-bold text-xl text-cream-200 tracking-tight">
                TakomoCo
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-6"
            >
              <Link
                href="/materials"
                className="group relative text-sm font-medium text-cream-400 hover:text-clay-300 transition-colors"
              >
                Materials
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-clay-600 transition-all duration-300 group-hover:w-full" />
              </Link>
              <Magnetic strength={0.5}>
                <Link
                  href="/login"
                  className="inline-block text-sm font-bold bg-clay-600 text-white px-5 py-2 rounded-full hover:bg-clay-700 transition-colors shadow-md hover:shadow-glow"
                >
                  Sign In
                </Link>
              </Magnetic>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroPointer}
        className="relative pt-32 pb-24 lg:pt-48 lg:pb-36 overflow-hidden"
      >
        {/* Pointer-reactive highlight */}
        <motion.div
          aria-hidden="true"
          style={{ background: heroGlow }}
          className="pointer-events-none absolute inset-0 z-0"
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="flex justify-center mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-clay-500/40 bg-espresso-800/72 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-clay-300 shadow-sm">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Precision additive manufacturing studio
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 }}
              className="text-5xl md:text-7xl font-extrabold text-cream-200 tracking-tight mb-8 leading-[1.05] [transform-style:preserve-3d]"
            >
              Digital Design <br className="hidden md:block" />
              <span className="animate-gradient-text animate-gradient-x bg-gradient-to-r from-clay-400 via-ember-400 to-clay-300">
                Physical Reality
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-4 max-w-2xl text-xl text-cream-400 mx-auto mb-10 leading-relaxed"
            >
              TakomoCo is a specialized additive manufacturing and rapid
              prototyping studio. We offer high-precision 3D printing and 3D
              scanning services for engineering and reproduction applications.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Magnetic strength={0.4}>
                <Link
                  href="/login"
                  className="group inline-flex justify-center items-center gap-2 bg-clay-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-clay-700 transition-all shadow-lg hover:shadow-glow-lg hover:-translate-y-0.5"
                >
                  Start Your Project
                  <ArrowRight
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </Magnetic>
              <Magnetic strength={0.3}>
                <Link
                  href="/materials"
                  className="inline-flex justify-center items-center bg-espresso-800/62 backdrop-blur-md text-cream-200 border border-espresso-600/60 px-8 py-4 rounded-full text-lg font-bold hover:bg-espresso-800/90 transition-all shadow-sm hover:shadow-md"
                >
                  View Material Library
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-espresso-500/80 p-1.5">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="h-2 w-1 rounded-full bg-clay-500"
            />
          </div>
        </motion.div>
      </section>

      {/* Materials marquee strip */}
      <section className="py-6 border-y border-espresso-600/50 bg-espresso-800/45 backdrop-blur-sm" aria-label="Supported materials and capabilities">
        <Marquee>
          {marqueeItems.map((item) => (
            <span
              key={item}
              className="flex items-center gap-3 text-lg font-semibold text-cream-500 whitespace-nowrap"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-clay-400" />
              {item}
            </span>
          ))}
        </Marquee>
      </section>

      {/* Stats band */}
      <section className="py-20" aria-label="Capability highlights">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} direction="up" delay={i * 0.1}>
                <div className="group h-full rounded-2xl border border-clay-500/25 bg-espresso-800/62 backdrop-blur-xl p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-clay-500/40">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-clay-500/15 text-clay-300 transition-transform group-hover:scale-110">
                    <stat.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold text-cream-200">
                    <AnimatedCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      decimals={stat.decimals ?? 0}
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-cream-500">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Core Competencies */}
      <section className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-sm font-bold text-clay-300 uppercase tracking-widest mb-2">
              Capabilities
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-cream-200">
              Core Competencies
            </h3>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 [perspective:1200px]">
            {competencies.map((c, i) => (
              <Reveal key={c.title} direction="up" delay={i * 0.12}>
                <TiltCard glowColor={c.glow} className="group h-full rounded-2xl">
                  <div className="h-full bg-espresso-800/62 backdrop-blur-xl rounded-2xl p-8 border border-clay-500/20 transition-colors hover:shadow-xl">
                    <div
                      className={`w-14 h-14 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6 border border-transparent transition-transform group-hover:scale-110 ${accentMap[c.accent]}`}
                    >
                      <c.icon className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <h4 className="text-xl font-bold text-cream-200 mb-3">
                      {c.title}
                    </h4>
                    <p className="text-cream-400 leading-relaxed">{c.body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Process timeline */}
      <section className="py-20" aria-label="Our process">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-sm font-bold text-clay-300 uppercase tracking-widest mb-2">
              Workflow
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-cream-200">
              From Concept to Component
            </h3>
          </Reveal>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Connecting line */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-clay-500 to-transparent"
            />
            {process.map((p, i) => (
              <Reveal key={p.step} direction="up" delay={i * 0.12}>
                <div className="relative text-center">
                  <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-espresso-800 border border-clay-500/25 text-clay-300 shadow-md">
                    <p.icon className="h-6 w-6" aria-hidden="true" />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-clay-600 text-[10px] font-bold text-white shadow">
                      {p.step}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-cream-200 mb-2">
                    {p.title}
                  </h4>
                  <p className="text-sm text-cream-400 leading-relaxed">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specs & Differentiators */}
      <section className="py-24 bg-espresso-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-clay-500/20 blur-[120px] animate-blob"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-clay-700/20 blur-[120px] animate-blob animation-delay-2000"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Technical Specifications */}
            <Reveal direction="right">
              <h3 className="text-3xl font-extrabold mb-8 text-white">
                Technical Specifications
              </h3>
              <div className="space-y-6">
                {[
                  {
                    color: "text-ember-300",
                    title: "Maximum Build Volume",
                    body: "256mm x 256mm x 256mm space for dense, robust components.",
                  },
                  {
                    color: "text-ember-300",
                    title: "Advanced Thermal Capacity",
                    body: "Optimized for specialized materials requiring up to 320°C extrusion temperature.",
                  },
                  {
                    color: "text-clay-300",
                    title: "Scanning Precision",
                    body: "Capable of capturing highly intricate geometries for near-exact reproductions.",
                  },
                ].map((spec) => (
                  <div
                    key={spec.title}
                    className="flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-white/5"
                  >
                    <div className={`mt-1 bg-white/10 p-2 rounded-lg ${spec.color}`}>
                      <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">
                        {spec.title}
                      </h4>
                      <p className="text-cream-500 mt-1">{spec.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Differentiators */}
            <Reveal direction="left" delay={0.1}>
              <div className="bg-white/5 border border-clay-500/12 rounded-3xl p-10 backdrop-blur-sm transition-colors hover:border-clay-500/25">
                <h3 className="text-2xl font-extrabold mb-8 text-white flex items-center gap-3">
                  <Shield className="w-7 h-7 text-ember-300" aria-hidden="true" />
                  Why Choose TakomoCo?
                </h3>
                <ul className="space-y-8">
                  <li>
                    <h4 className="text-lg font-bold text-ember-300 mb-2">
                      Material Mastery
                    </h4>
                    <p className="text-cream-500 leading-relaxed">
                      Highly specialized in handling complex, abrasive, and
                      carbon-fiber-reinforced composites.
                    </p>
                  </li>
                  <li>
                    <h4 className="text-lg font-bold text-ember-300 mb-2">
                      End-to-End Workflow
                    </h4>
                    <p className="text-cream-500 leading-relaxed">
                      From scanning a broken legacy part to engineering and
                      delivering a fiber-reinforced replacement seamlessly.
                    </p>
                  </li>
                  <li>
                    <h4 className="text-lg font-bold text-clay-300 mb-2">
                      Agile Response
                    </h4>
                    <p className="text-cream-500 leading-relaxed">
                      Our small-scale focus allows for rapid pivots, personal
                      attention, and dedicated engineering support.
                    </p>
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <footer
        className="bg-transparent py-16 border-t border-espresso-600/50"
        aria-label="Site footer"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-cream-200 mb-6">
              Ready to start building?
            </h2>
            <p className="text-xl text-cream-400 mb-8 max-w-2xl mx-auto">
              Contact us today or log in to submit a request. We specialize in
              high-strength, chemically and impact resistant composites.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
              <Magnetic strength={0.4}>
                <Link
                  href="/login"
                  className="inline-block bg-clay-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-clay-700 transition-all shadow-md hover:shadow-glow"
                >
                  Submit a Request
                </Link>
              </Magnetic>
              <Magnetic strength={0.3}>
                <a
                  href="mailto:takomocompany@gmail.com"
                  className="inline-block bg-espresso-800/62 backdrop-blur-md text-cream-200 border border-espresso-600/60 px-8 py-4 rounded-full text-lg font-bold hover:bg-espresso-800/90 transition-all shadow-sm hover:shadow-md"
                >
                  takomocompany@gmail.com
                </a>
              </Magnetic>
            </div>
          </Reveal>

          <div className="pt-8 border-t border-espresso-600/50 flex flex-col md:flex-row justify-between items-center text-sm text-cream-500">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image
                src="/logo.png"
                alt="TakomoCo Logo"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="font-semibold text-cream-200">TakomoCo</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center">
              <span>📞 385-695-4178</span>
              <span>Primary NAICS: 333248, 541330, 541420</span>
              <span>© {new Date().getFullYear()} TakomoCo. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
