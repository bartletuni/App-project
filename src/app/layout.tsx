import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TakomoCo — Additive Manufacturing & Rapid Prototyping",
  description: "TakomoCo is a specialized additive manufacturing and rapid prototyping studio offering high-precision 3D printing and 3D scanning services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${inter.variable}`}>
      <body className="antialiased bg-slate-950 text-slate-100 font-sans min-h-screen relative selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Global technical grid backdrops */}
        <div className="fixed inset-0 grid-background pointer-events-none z-0 opacity-40" aria-hidden="true" />
        <div className="fixed inset-0 grid-background-fine pointer-events-none z-0 opacity-60" aria-hidden="true" />
        
        {/* Skip links for screen readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        
        <Providers>
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main id="main-content" className="flex-grow flex flex-col">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
