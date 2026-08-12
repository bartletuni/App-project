import type { Metadata } from "next";

/**
 * Sign-in is a utility page with no standalone search value, and indexing it
 * would compete with the pages that do. Keep it crawlable (so link equity
 * still flows) but out of the index.
 */
export const metadata: Metadata = {
  title: "Client Sign In",
  description: "Sign in to the TakomoCo client desk to submit and track additive manufacturing requests.",
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
