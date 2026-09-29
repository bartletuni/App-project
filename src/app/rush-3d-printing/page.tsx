import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock, Mail, Zap } from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import FaqList from "@/components/FaqList";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/ui/Reveal";
import RequestEstimateButton from "@/components/RequestEstimateButton";
import {
  breadcrumbSchema,
  faqPageSchema,
  rushPrintingServiceSchema,
} from "@/lib/structured-data";
import { BUSINESS, OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { MIN_LEAD_DAYS } from "@/lib/guest-estimate";
import type { FaqItem } from "@/lib/faq";

/**
 * The page for the customer the shop is built around: someone who needs a
 * part quickly and is looking for somewhere to make it today. It is what a
 * search for "rush 3D printing", "fast replacement part" or "24 hour 3D
 * printing" should land on, and the address outreach can say out loud —
 * /rush and /express redirect here.
 *
 * It leads with an email to the shop, not the form, on purpose. The estimate
 * form only takes dates at least MIN_LEAD_DAYS out, and a job that cannot
 * wait that long needs a conversation about what is possible before anyone
 * pays. Files are still asked for through the form, because an upload is
 * the better-protected route: both policies cover a file sent by email or
 * text, and both say plainly that it is less protected in transit (/privacy
 * §09, /file-retention §05). The email link pre-fills a "Rush job" subject so
 * the shop can pick these out of the inbox.
 *
 * Every speed it names is one the shop already publishes: the 72-hour lead
 * time (homepage spec sheet) and the 24-hour express line (the rate sheet at
 * /pricing, whose surcharge is deliberately not repeated here because an
 * admin can change it there). It also says as plainly as the Terms do that a
 * date is a target worked to in good faith and runs from payment (§04), and
 * that a rush date can change a price (§03). A customer in a hurry is the one
 * most likely to take a number literally, so the page is written to be taken
 * literally.
 *
 * A server component, so all of it is in the initial HTML; only the first
 * block skips its reveal, so the headline paints without waiting on script.
 */

const title = "Rush 3D Printing — Need a Part Fast? 24-Hour Express";
const description =
  "Machine down and the part can't wait? Replacement parts 3D printed on 24-hour express or 72-hour standard turnaround, shipped anywhere in the US.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/rush-3d-printing" },
  openGraph: {
    type: "website",
    url: "/rush-3d-printing",
    siteName: SITE_NAME,
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE.url],
  },
};

const mail = {
  href: `mailto:${BUSINESS.email}?subject=${encodeURIComponent("Rush job")}`,
  text: BUSINESS.email,
};

const steps = [
  {
    n: "01",
    title: "Email the shop",
    body: "Tell us what broke, what it does, and the date it has to arrive. We will tell you straight whether that date is realistic.",
  },
  {
    n: "02",
    title: "Send what you have",
    body: "A 3D file is fastest — we print exactly that. No file? Photos and a few measurements work too. Upload them through the estimate form, where they stay private.",
  },
  {
    n: "03",
    title: "Approve and pay",
    body: "You get a price before anything is made. Production starts once the invoice is paid, through Square — we never see your card.",
  },
  {
    n: "04",
    title: "It ships",
    body: "Checked against the model, packed, and shipped to you anywhere in the United States.",
  },
];

const tips = [
  {
    title: "Send a file if you have one",
    body: "An STL, or a ZIP with the model in it, skips the modelling step altogether.",
  },
  {
    title: "Measure what it mates with",
    body: "Photos show the shape. A hole spacing or a shaft diameter off the calipers is what makes it fit first time.",
  },
  {
    title: "Say what it has to survive",
    body: "Heat, wear, oil, sunlight. Knowing up front means we choose the material once, not twice.",
  },
  {
    title: "Give us the arrive-by date",
    body: "Not the ship-by date. Turnaround is the making; transit comes after it.",
  },
];

const questions: FaqItem[] = [
  {
    q: "Can you really make a part in 24 hours?",
    a: [
      "Express means the part is produced within 24 hours of the invoice being paid, then shipped. Whether a particular part fits that window depends on its size and on whether we have to model it first, so email ",
      mail,
      " and we will tell you before you pay anything.",
    ],
  },
  {
    q: "Does a rush cost more?",
    a: [
      "Express carries a surcharge on top of the normal price; the current figure is on the ",
      { href: "/pricing", text: "rate sheet" },
      ". Standard turnaround costs nothing extra. A rush date can change a price we have already given you, and if it does we requote before going ahead — the ",
      { href: "/terms#estimates-and-quotes", text: "Terms" },
      " cover it.",
    ],
  },
  {
    q: "I don't have a CAD file. Can it still be rushed?",
    a: [
      "Yes, though modelling adds time. We model parts from photos and measurements, or from a 3D scan of the original, and that happens before printing starts — so tell us your deadline when you email and we will say what is realistic.",
    ],
  },
  {
    q: `Why won't the estimate form take a date sooner than ${MIN_LEAD_DAYS} days out?`,
    a: [
      "The form is for standard work. For anything sooner, email ",
      mail,
      " with the date you need it by, then send the part through the form and leave its date blank.",
    ],
  },
  {
    q: "How long does shipping take?",
    a: [
      "Turnaround is the time it takes to make the part. Shipping comes after it, and depends on the carrier and how far the part is going; we ship anywhere in the United States. Tell us the date it has to arrive, not the date it has to leave, and we will plan to that.",
    ],
  },
  {
    q: "Will a part made in a hurry hold up?",
    a: [
      "A rush changes the queue, not the part. It is made in the material chosen for the job — carbon-fiber nylons and grades with heat-deflection temperatures up to 252 °C among them — and checked against the model before it ships, like every other part.",
    ],
  },
  {
    q: "The part is discontinued, not just late. Can you help?",
    a: [
      "Yes. Reproducing parts nobody sells any more is a service of its own — ",
      { href: "/replacement-parts", text: "replacement parts" },
      " explains how we do it, and the same turnarounds apply.",
    ],
  },
];

const emailButton =
  "inline-flex items-center justify-center gap-2 bg-clay-700 px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 shadow-glow transition-colors hover:bg-clay-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-950";

const proseLinks =
  "[&_a]:text-clay-300 [&_a]:underline [&_a]:decoration-clay-500/40 [&_a]:underline-offset-2 hover:[&_a]:text-clay-200 [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-clay-500 [&_a]:rounded-sm";

export default function RushPrintingPage() {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-rush"
        data={breadcrumbSchema([{ name: "Rush 3D printing", path: "/rush-3d-printing" }])}
      />
      <JsonLd id="ld-service-rush" data={rushPrintingServiceSchema()} />
      <JsonLd id="ld-faq-rush" data={faqPageSchema(questions)} />

      <div className="min-h-screen bg-transparent text-cream-200">
        <SiteHeader />

        <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 sm:pt-36 pb-20">
          {/* Masthead */}
          <Reveal priority>
            <span className="eyebrow">RUSH ORDERS · 24-HOUR EXPRESS</span>
            <h1 className="mt-4 max-w-4xl font-display text-[2.6rem] leading-[1.05] sm:text-6xl text-cream-100">
              Need a part fast? <span className="italic text-clay-300">24-hour rush 3D printing.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream-300">
              When a machine is down or a deadline won&apos;t move, a part that is six weeks on
              back-order is no use to you. TakomoCo 3D prints replacement and custom parts in
              engineering-grade and carbon-fiber materials — most within about 72 hours, and
              within 24 on express when it can&apos;t wait that long — and ships them anywhere in
              the United States.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={mail.href} className={emailButton}>
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email <span className="normal-case tracking-normal">{BUSINESS.email}</span>
              </a>
              <RequestEstimateButton variant="ghost" />
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-cream-500">
              Rush jobs start with an email · {BUSINESS.openingHours.label}
            </p>
          </Reveal>

          {/* The two speeds */}
          <section className="mt-20" aria-labelledby="speeds-heading">
            <Reveal>
              <span className="eyebrow">TURNAROUND</span>
              <h2 id="speeds-heading" className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">
                Two speeds, both fast
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-px bg-clay-500/15 md:grid-cols-2">
              <Reveal className="bg-espresso-900">
                <div className={`h-full p-7 sm:p-8 ${proseLinks}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center border border-clay-500/25 text-clay-300">
                      <Zap className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay-300">
                      When it can&apos;t wait
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-3xl text-cream-100">24-hour express</h3>
                  <p className="mt-3 text-cream-400 leading-relaxed">
                    Produced within 24 hours of payment, then shipped — for the machine that is
                    down now. It carries a surcharge, listed on the{" "}
                    <Link href="/pricing">rate sheet</Link>, and it starts with an email, so we can
                    tell you whether your part fits the window before you pay for it.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.06} className="bg-espresso-900">
                <div className={`h-full p-7 sm:p-8 ${proseLinks}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center border border-clay-500/25 text-clay-300">
                      <Clock className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay-300">
                      Most jobs
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-3xl text-cream-100">72-hour standard</h3>
                  <p className="mt-3 text-cream-400 leading-relaxed">
                    Made within about 72 hours of payment, at no extra charge.{" "}
                    <a href={mail.href}>Email us</a>, or send it through the{" "}
                    <Link href="/estimate">estimate form</Link> — no account needed, and the
                    estimate comes back within one business day.
                  </p>
                </div>
              </Reveal>
            </div>
            <Reveal>
              <p className={`mt-6 max-w-3xl text-sm leading-relaxed text-cream-400 ${proseLinks}`}>
                Both clocks start when the invoice is paid, and the date you need a part by is a
                target we work to in good faith rather than a guarantee — as our{" "}
                <Link href="/terms#orders">Terms</Link> put it. Shipping comes after, and depends on
                the carrier and the distance.
              </p>
            </Reveal>
          </section>

          {/* How a rush runs */}
          <section className="mt-20" aria-labelledby="route-heading">
            <Reveal>
              <span className="eyebrow">THE FASTEST ROUTE</span>
              <h2 id="route-heading" className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">
                Broken to shipped
              </h2>
            </Reveal>
            <ol className="mt-10 grid gap-px bg-clay-500/15 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.n} className="list-none bg-espresso-900">
                  <Reveal delay={i * 0.08} className="h-full p-6">
                    <span className="font-display text-4xl text-clay-400">{s.n}</span>
                    <h3 className="mt-4 font-display text-xl text-cream-100">{s.title}</h3>
                    <p className="mt-2 text-sm text-cream-400 leading-relaxed">{s.body}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>

          {/* What makes it faster */}
          <Reveal className="mt-20">
            <Panel className="p-7 sm:p-10">
              <span className="eyebrow">SAVE A DAY</span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl text-cream-100">
                What makes a rush faster
              </h2>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2">
                {tips.map((t) => (
                  <li key={t.title} className="border-l-2 border-clay-500/40 pl-4">
                    <h3 className="font-display text-xl text-cream-100">{t.title}</h3>
                    <p className="mt-1.5 text-cream-400 leading-relaxed">{t.body}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>

          {/* Questions */}
          <section className="mt-20" aria-labelledby="questions-heading">
            <Reveal>
              <span className="eyebrow">STRAIGHT ANSWERS</span>
              <h2 id="questions-heading" className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">
                Before you email
              </h2>
            </Reveal>
            <FaqList items={questions} />
          </section>

          {/* Closing CTA */}
          <Reveal className="mt-20">
            <div className="flex flex-col items-start gap-5 border-t border-clay-500/15 pt-10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl text-cream-100">
                  Machine down right now?
                </h2>
                <p className="mt-3 max-w-xl text-cream-400">
                  Email us what broke and when it has to be running again.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <a href={mail.href} className={emailButton}>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email <span className="normal-case tracking-normal">{BUSINESS.email}</span>
                </a>
                <RequestEstimateButton variant="ghost" className="shrink-0" />
              </div>
            </div>
            <Link
              href="/replacement-parts"
              className="group mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-cream-300 transition-colors hover:text-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
            >
              Part discontinued? How we reproduce parts you can&apos;t buy
              <ArrowUpRight className="h-4 w-4 text-clay-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
