"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, LayoutDashboard, LifeBuoy } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status !== "authenticated") {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link
            href="/dashboard"
            aria-label="TakomoCo Dashboard"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 rounded-lg p-1 -ml-1 transition-shadow"
          >
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-1.5 rounded-lg shadow-sm flex-shrink-0" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">TakomoCo</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 rounded-lg p-1">
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
            
            <Link href="/contact" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 rounded-lg p-1">
              <LifeBuoy className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Support</span>
            </Link>

            <Link href="/settings" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 rounded-lg p-1">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Settings</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-2"></div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-sm font-medium text-gray-900">{session?.user?.email}</span>
                <span className="text-xs text-gray-500">User Account</span>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
