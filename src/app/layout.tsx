import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import InteractiveBackground from "@/components/InteractiveBackground";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <Providers>
          <InteractiveBackground />
          <Navbar />
          <main id="main-content" className="relative z-0">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
