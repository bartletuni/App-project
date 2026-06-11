"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Layers, Scan, Zap, Shield, CheckCircle2 } from "lucide-react";
import { GlowCard, TiltCard } from "@/components/InteractiveGlow";

export default function LandingPage() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setCoords({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      onMouseMove={handleMouseMove} 
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden"
    >
      {/* Global client cursor-spotlight background glow */}
      <div
        className="fixed pointer-events-none inset-0 z-0 transition-opacity duration-1000 opacity-20"
        style={{
          background: `radial-gradient(600px circle at ${coords.x}px ${coords.y}px, rgba(99, 102, 241, 0.15), transparent 80%)`,
        }}
        aria-hidden="true"
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full backdrop-blur-md bg-slate-950/70 border-b border-slate-900 z-50" aria-label="Landing page navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-indigo-500/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">TakomoCo</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/materials" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">
                Materials
              </Link>
              <Link 
                href="/login" 
                className="text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden z-10">
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
          <div className="absolute top-48 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-6 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Next-Gen Additive Prototyping
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight font-sans">
            Digital Design <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-300">
              Physical Reality
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-slate-400 mx-auto mb-10 leading-relaxed">
            TakomoCo is a specialized additive manufacturing and rapid prototyping studio. We offer high-precision 3D printing and 3D scanning services for engineering and reproduction applications.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/login" 
              className="inline-flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Start Your Project
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>
            <Link 
              href="/materials" 
              className="inline-flex justify-center items-center bg-slate-900/50 hover:bg-slate-900 text-slate-200 border border-slate-800 px-8 py-4 rounded-full text-lg font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              View Material Library
            </Link>
          </div>
        </div>
      </section>

      {/* Core Competencies */}
      <section className="py-24 relative z-10 border-t border-slate-900 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 font-mono">Capabilities</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">Core Competencies</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TiltCard>
              <GlowCard className="p-8 h-full flex flex-col items-start" glowColor="rgba(6, 182, 212, 0.15)">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/20">
                  <Layers className="w-6 h-6" aria-hidden="true" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Additive Manufacturing</h4>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Expert FDM/FFF printing with a strict focus on high-performance, engineering-grade materials.
                </p>
              </GlowCard>
            </TiltCard>
            
            <TiltCard>
              <GlowCard className="p-8 h-full flex flex-col items-start" glowColor="rgba(6, 182, 212, 0.15)">
                <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center mb-6 border border-cyan-500/20">
                  <Scan className="w-6 h-6" aria-hidden="true" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">3D Scanning & Reverse Eng.</h4>
                <p className="text-slate-400 leading-relaxed text-sm">
                  High-fidelity scanning for intricate part reproduction, exact 1:1 copies, and robust digital archiving.
                </p>
              </GlowCard>
            </TiltCard>
            
            <TiltCard>
              <GlowCard className="p-8 h-full flex flex-col items-start" glowColor="rgba(6, 182, 212, 0.15)">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mb-6 border border-purple-500/20">
                  <Zap className="w-6 h-6" aria-hidden="true" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Rapid Prototyping</h4>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Iterative design support to dramatically accelerate your product development cycles.
                </p>
              </GlowCard>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Technical Specs & Differentiators */}
      <section className="py-24 border-t border-slate-900 bg-slate-900/10 relative overflow-hidden">
        <div className="absolute inset-0 grid-background-fine opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Technical Specifications - HUD Blueprint card */}
            <div className="p-8 sm:p-10 bg-slate-950/80 border border-slate-800 rounded-3xl relative overflow-hidden radar-sweep">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <h3 className="text-2xl sm:text-3xl font-extrabold mb-8 text-white bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Technical Specifications</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-indigo-500/10 p-2 rounded-lg text-indigo-400 border border-indigo-500/20">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100">Maximum Build Volume</h4>
                    <p className="text-slate-400 text-sm mt-1">256mm x 256mm x 256mm space for dense, robust components.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-cyan-500/10 p-2 rounded-lg text-cyan-400 border border-cyan-500/20">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100">Advanced Thermal Capacity</h4>
                    <p className="text-slate-400 text-sm mt-1">Optimized for specialized materials requiring up to 320°C extrusion temperature.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-purple-500/10 p-2 rounded-lg text-purple-400 border border-purple-500/20">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100">Scanning Precision</h4>
                    <p className="text-slate-400 text-sm mt-1">Capable of capturing highly intricate geometries for near-exact reproductions.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Differentiators - Glass Card */}
            <div className="bg-slate-900/35 border border-white/5 rounded-3xl p-8 sm:p-10 backdrop-blur-sm relative">
              <h3 className="text-2xl font-extrabold mb-8 text-white flex items-center gap-3">
                <Shield className="w-6 h-6 text-indigo-400" aria-hidden="true" />
                Why Choose TakomoCo?
              </h3>
              <ul className="space-y-8">
                <li>
                  <h4 className="text-base font-bold text-indigo-400 mb-1">Material Mastery</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Highly specialized in handling complex, abrasive, and carbon-fiber-reinforced composites.</p>
                </li>
                <li>
                  <h4 className="text-base font-bold text-cyan-400 mb-1">End-to-End Workflow</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">From scanning a broken legacy part to engineering and delivering a fiber-reinforced replacement seamlessly.</p>
                </li>
                <li>
                  <h4 className="text-base font-bold text-purple-400 mb-1">Agile Response</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Our small-scale focus allows for rapid pivots, personal attention, and dedicated engineering support.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <footer className="bg-slate-950 py-20 border-t border-slate-900 relative z-10" aria-label="Site footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-6">Ready to start building?</h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto text-base">
            Contact us today or log in to submit a request. We specialize in high-strength, chemically and impact resistant composites.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <Link 
              href="/login" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full text-base font-bold transition-all hover:shadow-indigo-500/20 active:scale-98 shadow-md"
            >
              Submit a Request
            </Link>
            <a 
              href="mailto:takomocompany@gmail.com"
              className="bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-800 px-8 py-4 rounded-full text-base font-bold transition-colors"
            >
              takomocompany@gmail.com
            </a>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="TakomoCo Logo" width={24} height={24} className="rounded" />
              <span className="font-semibold text-slate-300">TakomoCo</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center font-mono">
              <span>📞 385-695-4178</span>
              <span>NAICS: 333248, 541330, 541420</span>
              <span>© {new Date().getFullYear()} TakomoCo. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
