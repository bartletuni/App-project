import { Fragment } from "react";
import Link from "next/link";
import type { FaqItem } from "@/lib/faq";

/**
 * A page's questions as a definition list. Pair it with `faqPageSchema` over
 * the same items so the structured data is the visible text — see
 * src/lib/faq.ts.
 *
 * `tel:` and `mailto:` links are plain anchors; everything else is a route.
 */
export default function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <dl className="mt-10 divide-y divide-clay-500/15 border-y border-clay-500/15">
      {items.map((item) => (
        <div key={item.q} className="grid gap-3 py-7 md:grid-cols-12 md:gap-8">
          <dt className="md:col-span-4 font-display text-xl text-cream-100">{item.q}</dt>
          <dd className="md:col-span-8 text-cream-400 leading-relaxed [&_a]:text-clay-300 [&_a]:underline [&_a]:decoration-clay-500/40 [&_a]:underline-offset-2 hover:[&_a]:text-clay-200 [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-clay-500 [&_a]:rounded-sm">
            {item.a.map((part, i) => (
              <Fragment key={i}>
                {typeof part === "string" ? (
                  part
                ) : /^(tel|mailto):/.test(part.href) ? (
                  <a href={part.href}>{part.text}</a>
                ) : (
                  <Link href={part.href}>{part.text}</Link>
                )}
              </Fragment>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
