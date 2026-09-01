import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
import {
  GOVERNING_LAW,
  LEGAL_CONTACT,
  LEGAL_LAST_UPDATED,
  SQUARE_PRIVACY_URL,
} from "@/lib/legal";
import {
  FREE_SAMPLE_MATERIAL,
  FREE_SAMPLE_QUANTITY,
} from "@/lib/free-sample";

const title = "Terms of Service";
const description =
  "The terms covering TakomoCo quotes, orders, and manufacturing — cancellation, payment, ownership of the files you upload, what we will not print, and the limits of our liability.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
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

const mail = `mailto:${LEGAL_CONTACT.email}`;

const sections: LegalSection[] = [
  {
    id: "agreement",
    n: "01",
    title: "The agreement",
    body: (
      <>
        <p>
          These terms are the agreement between you and TakomoCo (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, the shop) covering takomoco.com, the client
          dashboard, and every quote and part we produce for you. By creating an
          account or submitting a request, you accept them.
        </p>
        <p>
          You must be at least 18 and able to enter a binding contract. If you
          are ordering for a company, you are confirming that you are authorised
          to bind it, and &ldquo;you&rdquo; means that company.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    n: "02",
    title: "Your account",
    body: (
      <>
        <p>
          Keep your password to yourself and tell us promptly at{" "}
          <a href={mail}>{LEGAL_CONTACT.email}</a> if you think someone else has
          reached your account. Activity under your sign-in is treated as yours.
          Give us accurate contact and address details and keep them current in{" "}
          <Link href="/settings">Account settings</Link> — a part shipped to a
          stale address is not something we can recover for you.
        </p>
      </>
    ),
  },
  {
    id: "quotes",
    n: "03",
    title: "Quotes and pricing",
    body: (
      <>
        <p>
          The rates published on the{" "}
          <Link href="/pricing">pricing sheet</Link> are estimates to help you
          budget. They are not offers, and no price is binding until we send you
          a written quote for your specific part.
        </p>
        <p>
          A quote is based on the model, quantity, material, and settings you
          submitted. If any of those change — a revised model, a different
          material, a rush date — the price may change too, and we will requote
          before continuing. Unless a quote says otherwise, it is good for{" "}
          <strong>30 days</strong>. Prices are in US dollars and exclude
          shipping and any applicable sales tax.
        </p>
      </>
    ),
  },
  {
    id: "orders",
    n: "04",
    title: "Orders, payment, and cancellation",
    body: (
      <>
        <p>
          Submitting a request is a request, not a completed sale. We accept it
          by sending your invoice, and{" "}
          <strong>manufacturing begins once that invoice is paid in full.</strong>{" "}
          We may decline any request, and if we decline one you have paid for,
          you get a full refund.
        </p>
        <h3>Paying</h3>
        <p>
          Invoices are issued and collected through <strong>Square</strong>. The
          invoice reaches you from Square and is paid there, under Square&apos;s
          own terms and{" "}
          <a href={SQUARE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            privacy notice
          </a>{" "}
          — we never see or hold your card details.
          Refunds are returned through Square to the method you paid with, and a
          payment dispute or chargeback is handled through Square as well. If
          something looks wrong on an invoice, tell us first: it is faster than
          a dispute, and we would rather fix our own mistake.
        </p>
        <h3>Cancelling</h3>
        <p>
          You may cancel a request yourself from your dashboard within{" "}
          <strong>30 minutes</strong> of submitting it. After that window, email
          the shop: if the part has not entered production we will usually still
          cancel it and refund you.{" "}
          <strong>
            Once production has started, a custom part cannot be cancelled or
            refunded
          </strong>{" "}
          — it is made to your specification and has no other buyer.
        </p>
        <h3>Delivery dates</h3>
        <p>
          The date you need a part by is a target we work towards in good faith,
          not a guaranteed delivery date, and it runs from payment rather than
          from submission. Once a part is handed to the carrier, transit time
          and risk of loss pass to you.
        </p>
        <h3>The free sample</h3>
        <p>
          First-time customers may claim one free sample: {FREE_SAMPLE_QUANTITY}{" "}
          part, printed in {FREE_SAMPLE_MATERIAL}, one per account, not
          invoiced. It is subject to these same terms, is offered at our
          discretion, may be limited by size or complexity, and cannot be
          exchanged for a discount or for cash.
        </p>
      </>
    ),
  },
  {
    id: "your-files",
    n: "05",
    title: "The files you send us",
    body: (
      <>
        <p>
          <strong>Your models stay yours.</strong> Uploading a file gives us no
          ownership of it. You grant us only the licence we need to do the job:
          to store, view, repair, slice, and print your file in order to quote
          and produce your part, and to keep a copy for the period described in
          the <Link href="/privacy">Privacy Policy</Link> so the part can be
          reprinted or revised.
        </p>
        <p>
          Where we create something for you — a model drawn from your
          description, or a mesh produced by scanning and reverse-engineering
          your physical part — that deliverable is yours once the invoice for it
          is paid. Our own tooling, fixtures, process settings, and know-how
          remain ours.
        </p>
        <h3>Your warranty to us</h3>
        <p>
          This one matters, particularly for reproduction work.{" "}
          <strong>
            You warrant that you own the part you are asking us to make, or
            otherwise have the right to have it reproduced,
          </strong>{" "}
          and that making it will not infringe anyone&apos;s patent, copyright,
          trademark, trade dress, or trade secret, or breach a contract you are
          under. We cannot assess the provenance of a part from a mesh, and we
          rely on you for it.
        </p>
        <p>
          You agree to indemnify and hold us harmless against any claim, loss,
          or cost arising from a file you sent us or a part we made to your
          specification, including intellectual-property claims by third
          parties. If we receive a credible infringement claim about your job,
          we may pause or cancel it.
        </p>
      </>
    ),
  },
  {
    id: "will-not-print",
    n: "06",
    title: "What we will not print",
    body: (
      <>
        <p>Do not submit a request for any of the following:</p>
        <ul>
          <li>
            firearms, firearm frames or receivers, suppressors, magazines, or
            any component of a regulated weapon;
          </li>
          <li>
            counterfeit goods, or parts bearing someone else&apos;s trademark or
            trade dress without their authorisation;
          </li>
          <li>
            anything that infringes a patent, copyright, or other right of a
            third party;
          </li>
          <li>
            devices intended to defeat a lock, a safety interlock, an emissions
            control, or a security measure;
          </li>
          <li>
            export-controlled technical data — including anything subject to
            ITAR or the EAR — unless we have agreed to it in writing in advance;
          </li>
          <li>anything else unlawful under US federal or Utah law.</li>
        </ul>
        <p>
          We may refuse or stop any job on these grounds, at our sole
          discretion, and we will refund anything you have paid for work not
          yet done.
        </p>
      </>
    ),
  },
  {
    id: "part-limits",
    n: "07",
    title: "What a printed part is, and is not",
    body: (
      <>
        <p>
          Additive manufacturing has real limits, and we would rather state them
          plainly than have them surprise you.
        </p>
        <h3>Variation is normal</h3>
        <p>
          Printed parts vary in dimension, colour, surface finish, and layer
          appearance between runs and between spools. Published material figures
          — tensile strength, stiffness, heat-deflection temperature, impact
          resistance — are typical values from material suppliers, measured on
          test coupons. A printed part is anisotropic: it is weaker across layer
          lines than along them, and it will not match those figures in every
          orientation. Unless we have agreed a tolerance in writing, treat them
          as indicative rather than guaranteed.
        </p>
        <h3>Not for safety-critical use</h3>
        <p>
          <strong>
            Parts we supply are not qualified for any application where failure
            could cause injury, death, or serious property damage.
          </strong>{" "}
          That includes, without limitation, medical or dental devices and
          implants; aerospace and aviation components; motor-vehicle safety,
          steering, braking, or fuel systems; pressure vessels; lifting,
          climbing, or fall-protection equipment; personal protective equipment;
          firearm components; and load-bearing structural use. Do not use them
          in those applications unless we have signed a separate written
          engineering agreement covering it.
        </p>
        <p>
          You are responsible for deciding whether a part is fit for what you
          intend, and for testing, inspecting, and qualifying it for that use
          before you rely on it. We manufacture to the specification you supply;
          we do not certify the design behind it.
        </p>
      </>
    ),
  },
  {
    id: "warranty",
    n: "08",
    title: "Warranty and what we will do",
    body: (
      <>
        <p>
          We warrant that a part will be manufactured with reasonable skill and
          care, in the material and quantity ordered, and substantially to the
          model or description you supplied. Inspect what arrives and tell us
          within <strong>10 days</strong> of delivery if something is wrong.
        </p>
        <p>
          If it is our error, we will, at our option,{" "}
          <strong>reprint the part or refund what you paid for it.</strong> That
          is the whole of our responsibility and your only remedy. The warranty
          does not cover a defect in your own model, a material or setting you
          chose against our advice, wear, misuse, modification after delivery,
          or use outside section 07.
        </p>
        <p>
          Beyond that warranty, everything is supplied <strong>&ldquo;as
          is&rdquo;</strong>, and to the fullest extent the law allows we
          disclaim all other warranties, express or implied, including
          merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    n: "09",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          To the fullest extent permitted by law, we are not liable for lost
          profits, lost revenue, lost data, business interruption, cost of
          replacement goods, or any indirect, incidental, special, consequential,
          or punitive damages, however caused, even if we were told such damages
          were possible.
        </p>
        <p>
          <strong>
            Our total liability for any claim relating to an order is capped at
            the amount you actually paid us for that order.
          </strong>
        </p>
        <p>
          Nothing here limits liability that cannot lawfully be limited —
          including liability for death or personal injury caused by our
          negligence, or for fraud. Some jurisdictions do not allow some of
          these exclusions, in which case they apply to you only as far as that
          jurisdiction permits.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    n: "10",
    title: "Using the site",
    body: (
      <>
        <p>
          Use the site for its purpose. Do not attempt to reach another
          customer&apos;s account or files, probe or interfere with the service,
          upload malware, scrape the site, or use it in a way that breaks the
          law. We may suspend or close an account that does. We may also change
          or withdraw features, and we do not promise uninterrupted
          availability.
        </p>
      </>
    ),
  },
  {
    id: "law",
    n: "11",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These terms are governed by the laws of {GOVERNING_LAW}, without
          regard to conflict-of-laws rules, and the state and federal courts
          sitting in Utah have exclusive jurisdiction over any dispute. The UN
          Convention on Contracts for the International Sale of Goods does not
          apply.
        </p>
        <p>
          Talk to us first — email <a href={mail}>{LEGAL_CONTACT.email}</a> and
          most problems get sorted out without lawyers. If a provision of these
          terms is held unenforceable, the rest stays in force. Our not
          enforcing something once does not waive it later.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    n: "12",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms; the date at the top of the page shows when
        they last changed, and a material change will be announced on the site
        before it takes effect. The terms that govern an order are the ones in
        force when that order was accepted — a later change does not reach
        backwards into a job already under way. This version is dated{" "}
        {LEGAL_LAST_UPDATED}.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-terms"
        data={breadcrumbSchema([{ name: "Terms of Service", path: "/terms" }])}
      />
      <LegalDocument
        current="/terms"
        eyebrow="LEGAL ⁄ TERMS"
        title="Terms of"
        accent="service."
        lede="How quotes, orders, and manufacturing work at this shop — including the two things worth reading before you upload anything: who is responsible for the part being yours to reproduce, and what a printed part should never be used for."
        summary={
          <>
            <ul>
              <li>
                Published rates are estimates. A price is fixed only when we
                send you a written quote, and work starts once the invoice is
                paid.
              </li>
              <li>
                You can cancel yourself within 30 minutes. After production
                starts, a custom part cannot be refunded.
              </li>
              <li>
                Invoices are issued and paid through Square, and refunds go back
                the same way.
              </li>
              <li>
                Your models stay yours — but you are confirming you have the
                right to have the part reproduced.
              </li>
              <li>
                Printed parts are not qualified for safety-critical use:
                medical, aerospace, vehicle safety, lifting, or load-bearing
                applications.
              </li>
              <li>
                If we get it wrong, we reprint it or refund it, up to what you
                paid for that order.
              </li>
            </ul>
          </>
        }
        sections={sections}
      />
    </>
  );
}
