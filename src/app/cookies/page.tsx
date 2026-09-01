import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
import {
  COOKIE_INVENTORY,
  COOKIE_NOTICE_STORAGE_KEY,
  LEGAL_CONTACT,
  LEGAL_LAST_UPDATED,
} from "@/lib/legal";

const title = "Cookie Policy";
const description =
  "Every cookie takomoco.com sets, named, with its lifetime and purpose. All three are strictly necessary — there is no analytics, advertising, or tracking on this site.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cookies" },
  openGraph: {
    type: "website",
    url: "/cookies",
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

/**
 * The inventory, as cards rather than a table. A four-column table of long
 * cookie names is unreadable on a phone, and the alternative — a horizontally
 * scrolling table — is worse. Each cookie gets its own bordered row instead,
 * which stacks cleanly and keeps the spec-sheet look.
 */
function CookieTable() {
  return (
    <div className="mt-5 space-y-3">
      {COOKIE_INVENTORY.map((c) => (
        <div
          key={c.name}
          className="panel-flat p-5 transition-colors hover:border-clay-500/30"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <code className="break-all font-mono text-[12px] text-clay-200">
              {c.name}
            </code>
            <span className="border border-clay-500/30 bg-clay-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-clay-300">
              {c.category}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-cream-400">
            {c.purpose}
          </p>
          <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cream-600">
            <span className="text-clay-500">Expires</span>
            <span className="h-px w-4 bg-clay-500/40" aria-hidden="true" />
            {c.duration}
          </p>
        </div>
      ))}
    </div>
  );
}

const sections: LegalSection[] = [
  {
    id: "what-they-are",
    n: "01",
    title: "What a cookie is",
    body: (
      <p>
        A cookie is a small text file a site asks your browser to keep and hand
        back on the next request. Cookies are how a website recognises that two
        page loads came from the same person — which is what makes staying
        signed in possible — and also, on many sites, how visitors are followed
        from page to page for advertising. Both use the same mechanism. What
        matters is which kind a site actually sets.
      </p>
    ),
  },
  {
    id: "our-cookies",
    n: "02",
    title: "The cookies this site sets",
    body: (
      <>
        <p>
          Three, and all three are strictly necessary — they exist to sign you
          in and keep that session secure. They are set by the site itself, not
          by a third party, and{" "}
          <strong>
            a visitor who never signs in is never given any of them.
          </strong>{" "}
          This is the complete list:
        </p>
        <CookieTable />
      </>
    ),
  },
  {
    id: "no-tracking",
    n: "03",
    title: "What this site does not set",
    body: (
      <>
        <p>
          <strong>
            There is no analytics, advertising, or tracking on this site.
          </strong>{" "}
          No Google Analytics, no advertising or conversion pixel, no social
          media tracker, no session recorder, no third-party profiling of any
          kind. Nothing follows you from here to another site, and nothing about
          your browsing is sold or shared.
        </p>
        <p>
          Because every cookie we set is strictly necessary to deliver a service
          you asked for, we are not required to ask your permission before
          setting them — that exemption is written into the ePrivacy rules and
          mirrored in US state privacy law. We tell you about them anyway,
          which is the part we do owe you. If we ever add something that is not
          strictly necessary, it will be off until you switch it on, and this
          page and the notice on the site will change first.
        </p>
      </>
    ),
  },
  {
    id: "local-storage",
    n: "04",
    title: "One other thing stored on your device",
    body: (
      <>
        <p>
          Dismissing the cookie notice writes a single key to your
          browser&apos;s local storage —{" "}
          <code className="font-mono text-[12px] text-clay-200">
            {COOKIE_NOTICE_STORAGE_KEY}
          </code>{" "}
          — so the notice does not reappear on every page. It is not a cookie,
          it is never sent to our servers, and it holds nothing about you beyond
          the fact that you closed the banner. Clearing your browser&apos;s site
          data removes it and the notice comes back.
        </p>
      </>
    ),
  },
  {
    id: "controlling",
    n: "05",
    title: "Controlling cookies yourself",
    body: (
      <>
        <p>
          Every browser lets you see the cookies a site has set, delete them, or
          refuse them — usually under Settings, then Privacy. You can do that
          here at any time, and nothing about the public site will break: the
          homepage, materials, pricing, and contact pages need no cookies at
          all.
        </p>
        <p>
          What will break is the signed-in half. Blocking cookies from this site
          means the sign-in cannot be remembered, so the dashboard, your
          requests, and account settings become unreachable. There is no way
          around that; a session has to be stored somewhere.
        </p>
        <p>
          Signing out clears your session cookie immediately. Browser
          &ldquo;Do Not Track&rdquo; and Global Privacy Control signals are moot
          here, since there is no tracking to turn off.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    n: "06",
    title: "Changes and questions",
    body: (
      <p>
        If the list in section 02 changes, this page changes with it and the
        date at the top is updated; a new cookie that is not strictly necessary
        would also bring back the notice, asking first. This version is dated{" "}
        {LEGAL_LAST_UPDATED}. Questions go to{" "}
        <a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a>, and
        the wider picture is in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-cookies"
        data={breadcrumbSchema([{ name: "Cookie Policy", path: "/cookies" }])}
      />
      <LegalDocument
        current="/cookies"
        eyebrow="LEGAL ⁄ COOKIES"
        title="Cookie"
        accent="policy."
        lede="Three cookies, all of them there to keep you signed in. No analytics, no advertising, no trackers — here is each one by name."
        summary={
          <>
            <ul>
              <li>
                This site sets <strong>three cookies</strong>, all strictly
                necessary for signing in and keeping that session secure.
              </li>
              <li>
                Browse without an account and you are given{" "}
                <strong>no cookies at all</strong>.
              </li>
              <li>
                There is no analytics, advertising, or tracking here — nothing
                to opt out of.
              </li>
              <li>
                You can block or delete them in your browser; only the
                signed-in dashboard needs them.
              </li>
            </ul>
          </>
        }
        sections={sections}
      />
    </>
  );
}
