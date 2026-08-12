import type { Metadata } from "next";

/** Authenticated account settings — never indexed. */
export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false, nocache: true },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
