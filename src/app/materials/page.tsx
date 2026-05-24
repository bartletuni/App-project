"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Beaker, Zap } from "lucide-react";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-indigo-600 font-semibold animate-pulse">
        Loading material library...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-semibold text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-sm" />
              <span className="font-bold text-xl text-gray-900 tracking-tight">TakomoCo</span>
            </div>
            <Link 
              href="/login" 
              className="text-sm font-bold bg-indigo-600 text-white px-5 py-2 rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Material Library
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            We work with a wide array of high-performance thermoplastics. Explore our technical materials specialized for high-strength, chemically resistant, and impact-resistant applications.
          </p>
        </div>

        {materials.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-16 text-center max-w-2xl mx-auto">
            <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No materials listed yet</h3>
            <p className="text-gray-500">Check back later as we update our comprehensive material library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {materials.map((m) => (
              <div key={m.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden flex flex-col transition-all group hover:-translate-y-1">
                {m.imageId ? (
                  <div className="h-48 w-full bg-gray-100 relative overflow-hidden border-b border-gray-100">
                    <img 
                      src={`/api/download/${m.imageId}`} 
                      alt={m.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-full bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100"></div>
                )}
                
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-3">{m.name}</h3>
                  {m.description ? (
                    <p className="text-gray-600 flex-1 leading-relaxed">{m.description}</p>
                  ) : (
                    <p className="text-gray-400 italic flex-1 text-sm">High performance engineering-grade material.</p>
                  )}
                  
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <Link 
                      href={`/dashboard?material=${encodeURIComponent(m.name)}`}
                      className="w-full inline-flex justify-center items-center gap-2 bg-gray-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-gray-200 hover:border-transparent px-6 py-3 rounded-xl font-bold transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Build With This Material
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
