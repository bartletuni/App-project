"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, Clock, Send } from "lucide-react";

import Reveal from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";
import Magnetic from "@/components/ui/Magnetic";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      {/* Top Navbar */}
      <nav
        className="bg-white/60 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50"
        aria-label="Contact page navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors group"
            >
              <ArrowLeft
                className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:-translate-x-0.5 transition-all"
                aria-hidden="true"
              />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4 py-12 sm:py-16 relative overflow-hidden">
        <div className="w-full max-w-lg relative z-10">
          <Reveal className="text-center mb-8">
            <motion.div
              initial={{ rotate: -8, scale: 0.8, opacity: 0 }}
              animate={{ rotate: -3, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl flex items-center justify-center shadow-glow mb-6 hover:rotate-0 transition-transform duration-300 animate-float"
              aria-hidden="true"
            >
              <Mail className="w-8 h-8" />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Get in{" "}
              <span className="animate-gradient-text animate-gradient-x bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600">
                Touch
              </span>
            </h1>
            <p className="text-lg text-gray-600">
              Have questions about your custom additive manufacturing order? Our
              team is standing by to help.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <TiltCard intensity={5} className="group rounded-3xl">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                <div className="p-8 sm:p-10 text-center">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Email Support
                  </h2>
                  <p className="text-gray-500 mb-8">
                    We generally respond to all inquiries within 24 business
                    hours. Tap below to open your email client.
                  </p>

                  <Magnetic strength={0.3} className="w-full">
                    <a
                      href="mailto:takomocompany@gmail.com"
                      className="group/btn relative inline-flex items-center justify-center w-full px-6 sm:px-8 py-4 text-base sm:text-lg font-bold text-white transition-all duration-200 bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 active:scale-95 shadow-md hover:shadow-glow"
                    >
                      <Send
                        className="w-5 h-5 mr-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform"
                        aria-hidden="true"
                      />
                      <span className="truncate">takomocompany@gmail.com</span>
                    </a>
                  </Magnetic>
                </div>

                <div className="bg-white/40 backdrop-blur-sm px-6 sm:px-8 py-6 border-t border-gray-200/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 font-medium">
                    <Phone className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                    385-695-4178
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 font-medium">
                    <Clock className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                    Mon–Fri, 9am – 5pm EST
                  </div>
                </div>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
