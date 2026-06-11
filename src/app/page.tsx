"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Layers, Scan, Zap, Shield, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100 },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-transparent font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/60 backdrop-blur-xl z-50 border-b border-gray-100/50" aria-label="Landing page navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-sm" />
              <span className="font-bold text-xl text-gray-900 tracking-tight">TakomoCo</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/materials" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                Materials
              </Link>
              <Link 
                href="/login" 
                className="text-sm font-bold bg-indigo-600 text-white px-5 py-2 rounded-full hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Removed static blobs since they are handled by InteractiveBackground */}
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">
            Digital Design <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
              Physical Reality
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto mb-10 leading-relaxed">
            TakomoCo is a specialized additive manufacturing and rapid prototyping studio. We offer high-precision 3D printing and 3D scanning services for engineering and reproduction applications.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/login" 
              className="inline-flex justify-center items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Start Your Project
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
            <Link 
              href="/materials" 
              className="inline-flex justify-center items-center bg-white/60 backdrop-blur-md text-gray-900 border border-gray-200/50 px-8 py-4 rounded-full text-lg font-bold hover:bg-white/80 transition-all shadow-sm hover:shadow-md"
            >
              View Material Library
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Core Competencies */}
      <section className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.h2 variants={itemVariants} className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-2">Capabilities</motion.h2>
            <motion.h3 variants={itemVariants} className="text-3xl md:text-4xl font-extrabold text-gray-900">Core Competencies</motion.h3>
          </motion.div>
          
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:border-indigo-200 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-indigo-100/80 backdrop-blur-sm text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Layers className="w-7 h-7" aria-hidden="true" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Additive Manufacturing</h4>
              <p className="text-gray-600 leading-relaxed">Expert FDM/FFF printing with a strict focus on high-performance, engineering-grade materials.</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:border-blue-200 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-blue-100/80 backdrop-blur-sm text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Scan className="w-7 h-7" aria-hidden="true" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">3D Scanning & Reverse Eng.</h4>
              <p className="text-gray-600 leading-relaxed">High-fidelity scanning for intricate part reproduction, exact 1:1 copies, and robust digital archiving.</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:border-purple-200 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-purple-100/80 backdrop-blur-sm text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7" aria-hidden="true" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Rapid Prototyping</h4>
              <p className="text-gray-600 leading-relaxed">Iterative design support to dramatically accelerate your product development cycles.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Technical Specs & Differentiators */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Technical Specifications */}
            <div>
              <h3 className="text-3xl font-extrabold mb-8 text-white">Technical Specifications</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-white/10 p-2 rounded-lg text-indigo-300">
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Maximum Build Volume</h4>
                    <p className="text-gray-400 mt-1">256mm x 256mm x 256mm space for dense, robust components.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-white/10 p-2 rounded-lg text-blue-300">
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Advanced Thermal Capacity</h4>
                    <p className="text-gray-400 mt-1">Optimized for specialized materials requiring up to 320°C extrusion temperature.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-white/10 p-2 rounded-lg text-purple-300">
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Scanning Precision</h4>
                    <p className="text-gray-400 mt-1">Capable of capturing highly intricate geometries for near-exact reproductions.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Differentiators */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-sm">
              <h3 className="text-2xl font-extrabold mb-8 text-white flex items-center gap-3">
                <Shield className="w-7 h-7 text-indigo-400" aria-hidden="true" />
                Why Choose TakomoCo?
              </h3>
              <ul className="space-y-8">
                <li>
                  <h4 className="text-lg font-bold text-indigo-300 mb-2">Material Mastery</h4>
                  <p className="text-gray-400 leading-relaxed">Highly specialized in handling complex, abrasive, and carbon-fiber-reinforced composites.</p>
                </li>
                <li>
                  <h4 className="text-lg font-bold text-blue-300 mb-2">End-to-End Workflow</h4>
                  <p className="text-gray-400 leading-relaxed">From scanning a broken legacy part to engineering and delivering a fiber-reinforced replacement seamlessly.</p>
                </li>
                <li>
                  <h4 className="text-lg font-bold text-purple-300 mb-2">Agile Response</h4>
                  <p className="text-gray-400 leading-relaxed">Our small-scale focus allows for rapid pivots, personal attention, and dedicated engineering support.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <footer className="bg-transparent py-16 border-t border-gray-200/50" aria-label="Site footer">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          <motion.h2 variants={itemVariants} className="text-3xl font-extrabold text-gray-900 mb-6">Ready to start building?</motion.h2>
          <motion.p variants={itemVariants} className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Contact us today or log in to submit a request. We specialize in high-strength, chemically and impact resistant composites.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <Link 
              href="/login" 
              className="bg-indigo-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-indigo-700 transition-colors shadow-md"
            >
              Submit a Request
            </Link>
            <a 
              href="mailto:takomocompany@gmail.com"
              className="bg-white/60 backdrop-blur-md text-gray-900 border border-gray-200/50 px-8 py-4 rounded-full text-lg font-bold hover:bg-white/80 transition-all shadow-sm hover:shadow-md"
            >
              takomocompany@gmail.com
            </a>
          </motion.div>

          <div className="pt-8 border-t border-gray-200/50 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image src="/logo.png" alt="TakomoCo Logo" width={24} height={24} className="rounded" />
              <span className="font-semibold text-gray-900">TakomoCo</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center">
              <span>📞 385-695-4178</span>
              <span>Primary NAICS: 333248, 541330, 541420</span>
              <span>© {new Date().getFullYear()} TakomoCo. All rights reserved.</span>
            </div>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}
