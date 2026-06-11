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
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/dashboard" className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg outline-none cursor-pointer">
            <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-sm flex-shrink-0" />
            <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">TakomoCo</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Dashboard</span>
              <span className="md:hidden sr-only">Dashboard</span>
            </Link>
            
            <Link href="/contact" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
              <LifeBuoy className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Support</span>
              <span className="md:hidden sr-only">Support</span>
            </Link>

            <Link href="/settings" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Settings</span>
              <span className="md:hidden sr-only">Settings</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-2"></div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-sm font-medium text-gray-900">{session?.user?.email}</span>
                <span className="text-xs text-gray-500">User Account</span>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg"
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
