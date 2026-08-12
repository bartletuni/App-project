import type { Metadata } from "next";

/** Authenticated client area — never indexed, and bots shouldn't follow into it. */
export const metadata: Metadata = {
  title: "Client Dashboard",
  robots: { index: false, follow: false, nocache: true },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
