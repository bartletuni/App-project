"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Beaker, Zap, Flame, Award, Shield, Hammer } from "lucide-react";
import { GlowCard, TiltCard } from "@/components/InteractiveGlow";

// Helper to resolve physical engineering specs for the UI design
const getMaterialSpecs = (name: string) => {
  const norm = name.toUpperCase();
  if (norm.includes("PLA")) {
    return { strength: 80, temperature: "55°C", flexibility: 20, impact: 30, color: "from-cyan-500 to-indigo-500" };
  } else if (norm.includes("ABS") || norm.includes("ASA")) {
    return { strength: 70, temperature: "98°C", flexibility: 45, impact: 65, color: "from-amber-500 to-rose-500" };
  } else if (norm.includes("PETG")) {
    return { strength: 75, temperature: "78°C", flexibility: 40, impact: 55, color: "from-emerald-500 to-teal-500" };
  } else if (norm.includes("TPU") || norm.includes("FLEX")) {
    return { strength: 40, temperature: "80°C", flexibility: 95, impact: 90, color: "from-pink-500 to-purple-500" };
  } else if (norm.includes("NYLON") || norm.includes("CARBON") || norm.includes("CF")) {
    return { strength: 95, temperature: "155°C", flexibility: 30, impact: 85, color: "from-indigo-500 to-purple-700" };
  }
  return { strength: 65, temperature: "70°C", flexibility: 35, impact: 50, color: "from-blue-500 to-indigo-500" };
};

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400 font-mono text-sm tracking-wider animate-pulse">
        QUERYING MATERIAL SPECIFICATIONS DATABASE...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Materials navigation bar */}
      <nav className="backdrop-blur-md bg-slate-950/70 border-b border-slate-900 sticky top-0 z-50" aria-label="Materials library navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold text-sm">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Home
            </Link>
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-md border border-white/10" />
              <span className="font-bold text-xl text-white tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">TakomoCo</span>
            </div>
            <Link 
              href="/login" 
              className="text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full transition-all shadow-md"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-4 font-mono uppercase tracking-wider">
            Material Library
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Thermoplastic Specifications
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            We work with a wide array of high-performance thermoplastics. Explore our technical materials specialized for high-strength, chemically resistant, and impact-resistant applications.
          </p>
        </div>

        {materials.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 text-center max-w-2xl mx-auto">
            <Beaker className="w-16 h-16 text-slate-700 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-2xl font-bold text-white mb-2">No Materials Listed</h3>
            <p className="text-slate-500">Database query returned empty. Check back later as we update our material properties.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {materials.map((m) => {
              const specs = getMaterialSpecs(m.name);
              return (
                <TiltCard key={m.id} maxTilt={5} className="h-full">
                  <GlowCard className="h-full flex flex-col" glowColor="rgba(6, 182, 212, 0.15)">
                    {m.imageId && (
                      <div className="h-44 w-full bg-slate-950 relative overflow-hidden border-b border-slate-800/80">
                        <img 
                          src={`/api/download/${m.imageId}`} 
                          alt={m.name} 
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                      </div>
                    )}
                    
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-2xl font-extrabold text-white mb-3 tracking-tight">{m.name}</h3>
                        {m.description ? (
                          <p className="text-slate-400 leading-relaxed text-sm mb-6">{m.description}</p>
                        ) : (
                          <p className="text-slate-500 italic text-sm mb-6">High performance engineering-grade material.</p>
                        )}

                        {/* Visual Spec Meters */}
                        <div className="space-y-3.5 mb-8 border-t border-slate-850 pt-5">
                          <div>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-indigo-400" /> Tensile Strength</span>
                              <span className="font-mono text-indigo-400">{specs.strength}%</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                              <div className={`h-full bg-gradient-to-r ${specs.color} rounded-full`} style={{ width: `${specs.strength}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Hammer className="w-3.5 h-3.5 text-cyan-400" /> Impact Resistance</span>
                              <span className="font-mono text-cyan-400">{specs.impact}%</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                              <div className={`h-full bg-gradient-to-r ${specs.color} rounded-full`} style={{ width: `${specs.impact}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-purple-400" /> Flexibility</span>
                              <span className="font-mono text-purple-400">{specs.flexibility}%</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                              <div className={`h-full bg-gradient-to-r ${specs.color} rounded-full`} style={{ width: `${specs.flexibility}%` }} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                            <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-amber-500" /> Max Deflection Temp</span>
                            <span className="font-mono text-slate-300 font-bold">{specs.temperature}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Link 
                          href={`/dashboard?material=${encodeURIComponent(m.name)}`}
                          className="w-full inline-flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-transparent px-5 py-3 rounded-xl font-bold transition-all hover:shadow-indigo-500/10 active:scale-[0.98]"
                        >
                          <Zap className="w-4 h-4" aria-hidden="true" />
                          Build With Material
                        </Link>
                      </div>
                    </div>
                  </GlowCard>
                </TiltCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
