"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { FileText } from "lucide-react";
import { quoteHref, quoteHrefForMaterial } from "@/lib/quote";

type Variant = "solid" | "outline" | "ghost";
type Size = "sm" | "md";

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[11px] tracking-[0.18em]",
  md: "px-7 py-3.5 text-xs tracking-[0.2em]",
};

const variants: Record<Variant, string> = {
  solid: "bg-clay-600 text-cream-100 hover:bg-clay-700 shadow-glow",
  outline:
    "border border-clay-500/30 text-cream-300 hover:border-clay-400 hover:text-cream-100",
  ghost:
    "border border-clay-500/40 bg-clay-500/5 text-cream-100 hover:bg-clay-500/15 hover:border-clay-400",
};

/**
 * The site-wide "Request a quote" call to action.
 *
 * One component so every placement — masthead, hero, rate sheet, stock index,
 * contact, footer — lands on the same destination, and so that destination is
 * decided in one place. A signed-in visitor gets the composer on their desk
 * with its Quote checkbox pre-ticked; everyone else gets `/quote`, the public
 * form that needs no account. Nobody is asked to sign in to ask a price.
 *
 * The session resolves after first paint, so the button renders pointing at
 * the public form and re-points itself once it knows better. That is the safe
 * order: a signed-in customer who taps early lands on /quote and is forwarded
 * to their composer, whereas guessing the other way would show a login wall to
 * someone who never needed one.
 */
export default function RequestQuoteButton({
  variant = "solid",
  size = "md",
  label = "Request a quote",
  className = "",
  material,
  href,
}: {
  variant?: Variant;
  size?: Size;
  label?: string;
  className?: string;
  /** Pre-select a material from the stock index. */
  material?: string;
  /** Overrides both, for a placement that means somewhere else entirely. */
  href?: string;
}) {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const destination =
    href || (material ? quoteHrefForMaterial(material, signedIn) : quoteHref(signedIn));

  return (
    <Link
      href={destination}
      className={`group inline-flex items-center justify-center gap-2 font-mono uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {label}
      <FileText
        className={`${size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0 transition-transform group-hover:-translate-y-0.5`}
        aria-hidden="true"
      />
    </Link>
  );
}
