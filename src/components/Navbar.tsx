"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Settings, LogOut, LayoutDashboard, LifeBuoy } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status !== "authenticated") {
    return null;
  }

  return (
    <nav className="backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 sticky top-0 z-50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/dashboard" className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg outline-none cursor-pointer group">
            <div className="relative">
              <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-indigo-500/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white hidden sm:block bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">TakomoCo</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-indigo-400 focus-visible:text-indigo-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-900/40">
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Dashboard</span>
              <span className="md:hidden sr-only">Dashboard</span>
            </Link>
            
            <Link href="/contact" className="text-sm font-medium text-slate-400 hover:text-indigo-400 focus-visible:text-indigo-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-900/40">
              <LifeBuoy className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Support</span>
              <span className="md:hidden sr-only">Support</span>
            </Link>

            <Link href="/settings" className="text-sm font-medium text-slate-400 hover:text-indigo-400 focus-visible:text-indigo-400 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-900/40">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Settings</span>
              <span className="md:hidden sr-only">Settings</span>
            </Link>
            
            <div className="h-6 w-px bg-slate-800 hidden sm:block mx-1"></div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-sm font-medium text-slate-200">{session?.user?.email}</span>
                <span className="text-xs text-indigo-400/80 font-mono">CLIENT PORTAL</span>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1.5 text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3.5 py-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden sr-only">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
