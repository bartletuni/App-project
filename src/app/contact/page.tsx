"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="bg-white/60 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50" aria-label="Contact page navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4 py-16 relative overflow-hidden">
        {/* Background Decorative Shapes removed since InteractiveBackground handles them */}
        <motion.div
          className="w-full max-w-lg relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-8">
             <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300" aria-hidden="true">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             </div>
             <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Get in Touch</h1>
             <p className="text-lg text-gray-600">
               Have questions about your custom additive manufacturing order? Our team is standing by to help.
             </p>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden transform transition-all hover:-translate-y-1 hover:shadow-2xl duration-300">
            <div className="p-8 sm:p-10 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email Support</h2>
              <p className="text-gray-500 mb-8">
                We generally respond to all inquiries within 24 business hours. Click below to open your email client.
              </p>
              
              <a
                href="mailto:takomocompany@gmail.com"
                className="group relative inline-flex items-center justify-center w-full px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 active:scale-95 shadow-md hover:shadow-lg"
              >
                <span className="absolute inset-0 w-full h-full -mt-1 rounded-xl opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" aria-hidden="true"></span>
                <svg className="w-5 h-5 mr-3 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                takomocompany@gmail.com
              </a>
            </div>
            
            <div className="bg-white/40 backdrop-blur-sm px-8 py-6 border-t border-gray-200/50 text-center">
               <p className="text-sm text-gray-500 font-medium">
                  Operating Hours: Mon-Fri, 9am - 5pm EST
               </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
