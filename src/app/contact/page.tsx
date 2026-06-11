import Link from "next/link";
import { ArrowLeft, Mail, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative z-10">
      {/* Top Navbar */}
      <nav className="backdrop-blur-md bg-slate-950/70 border-b border-slate-900 sticky top-0 z-50" aria-label="Contact page navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4 py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow" />
        </div>

        <div className="w-full max-w-lg relative z-10">
          <div className="text-center mb-8">
             <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-2xl flex items-center justify-center shadow-lg mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300" aria-hidden="true">
                <Mail className="w-7 h-7" />
             </div>
             <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">Get in Touch</h1>
             <p className="text-base text-slate-400 leading-relaxed">
               Have questions about your custom additive manufacturing order? Our team is standing by to help.
             </p>
          </div>

          <div className="bg-slate-900/40 rounded-3xl shadow-xl border border-slate-800/80 backdrop-blur-md overflow-hidden transform transition-all hover:-translate-y-1 duration-300">
            <div className="p-8 sm:p-10 text-center">
              <h2 className="text-xl font-bold text-white mb-2">Email Support</h2>
              <p className="text-slate-400 text-sm mb-8">
                We generally respond to all inquiries within 24 business hours. Click below to open your email client.
              </p>
              
              <a
                href="mailto:takomocompany@gmail.com"
                className="group relative inline-flex items-center justify-center w-full px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-indigo-600 rounded-xl hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 active:scale-95 shadow-md"
              >
                <span className="absolute inset-0 w-full h-full -mt-1 rounded-xl opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" aria-hidden="true"></span>
                <Mail className="w-4.5 h-4.5 mr-2.5 group-hover:scale-105 transition-transform" />
                takomocompany@gmail.com
              </a>
            </div>
            
            <div className="bg-slate-900/20 px-8 py-5 border-t border-slate-800/80 text-center flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">
               <Clock className="w-4 h-4 text-slate-600" />
               Operating Hours: Mon-Fri, 9am - 5pm EST
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
