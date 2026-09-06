import Link from "next/link";
import { LEGAL_ROUTES } from "@/lib/legal";

/**
 * The row of links to the legal documents.
 *
 * Every page of the site has to reach these — it is the convention people
 * look for and what the disclosure rules assume — but the site has two
 * different footers (the marketing one and the console's), and the login
 * page has neither. Rendering the row from one component means adding a
 * fourth document later is a change to `LEGAL_ROUTES` alone, and no page
 * can end up listing two of the three.
 *
 * `tone` exists because the row sits on two different grounds: the marketing
 * footer's panel, where it is the quietest thing present, and the console's
 * rule, where it is the only thing present and should not read as disabled.
 */
export default function LegalLinks({
  tone = "quiet",
  className = "",
}: {
  tone?: "quiet" | "plain";
  className?: string;
}) {
  const link =
    tone === "quiet"
      ? "text-cream-600 hover:text-clay-300"
      : "text-cream-500 hover:text-clay-300";

  return (
    <ul
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.15em] ${className}`}
    >
      {LEGAL_ROUTES.map((r) => (
        <li key={r.href}>
          <Link
            href={r.href}
            className={`${link} rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500`}
          >
            {r.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
