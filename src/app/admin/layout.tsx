import type { Metadata } from "next";

/**
 * Applies to every /admin/* route. Staff-only tooling: kept out of the index
 * entirely, and bots are told not to follow links deeper into it.
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
