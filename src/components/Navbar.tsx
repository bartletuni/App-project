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
    <nav className="bg-espresso-800/62 backdrop-blur-xl shadow-sm border-b border-espresso-600/50 sticky top-0 z-50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/dashboard" className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-clay-500 rounded-lg outline-none cursor-pointer">
            <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-sm flex-shrink-0" />
            <span className="font-bold text-xl tracking-tight text-cream-200 hidden sm:block">TakomoCo</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-cream-500 hover:text-clay-300 transition-colors flex items-center gap-1 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500">
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Dashboard</span>
              <span className="md:hidden sr-only">Dashboard</span>
            </Link>
            
            <Link href="/contact" className="text-sm font-medium text-cream-500 hover:text-clay-300 transition-colors flex items-center gap-1 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500">
              <LifeBuoy className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Support</span>
              <span className="md:hidden sr-only">Support</span>
            </Link>

            <Link href="/settings" className="text-sm font-medium text-cream-500 hover:text-clay-300 transition-colors flex items-center gap-1 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Settings</span>
              <span className="md:hidden sr-only">Settings</span>
            </Link>
            
            <div className="h-6 w-px bg-espresso-500 hidden sm:block mx-2"></div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-sm font-medium text-cream-200">{session?.user?.email}</span>
                <span className="text-xs text-cream-500">User Account</span>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1 text-sm font-medium text-red-300 hover:text-red-200 transition-colors bg-red-500/15 hover:bg-red-500/25 px-3 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
