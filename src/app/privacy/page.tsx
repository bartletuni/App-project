import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { LEGAL_CONTACT, LEGAL_LAST_UPDATED } from "@/lib/legal";

const title = "Privacy Policy";
const description =
  "What TakomoCo collects when you request a quote or open a client account, who processes it, how long it is kept, and how to have it corrected or deleted.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
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
    id: "who-we-are",
    n: "01",
    title: "Who we are",
    body: (
      <>
        <p>
          TakomoCo is an additive manufacturing studio operating in Utah, United
          States. This policy covers takomoco.com and the client dashboard
          attached to it, and explains what we do with personal information you
          give us when you browse the site, request a quote, or open an account.
        </p>
        <p>
          For anything in this policy, write to{" "}
          <a href={mail}>{LEGAL_CONTACT.email}</a> or call {LEGAL_CONTACT.telephone}{" "}
          during shop hours.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    n: "02",
    title: "What we collect",
    body: (
      <>
        <p>
          We collect only what an order actually needs. There is no tracking
          pixel, advertising tag, or third-party analytics script anywhere on
          this site, so simply reading a page leaves us nothing about you beyond
          the ordinary server logs described below.
        </p>
        <h3>Account information</h3>
        <p>
          When you register: your name, email address, telephone number or
          numbers, shipping address, billing address, and a password. The
          password is never stored as you typed it — it is hashed with bcrypt,
          and no one at the shop can read it.
        </p>
        <h3>Order information</h3>
        <p>
          When you submit a part request: the 3D model file you upload (
          <em>.stl</em> or <em>.zip</em>), or, if you have no model yet, the part
          name, description, and dimensions you write instead; quantity;
          material; print settings; your notes; and the date you need it by. As
          the job progresses we add the quoted price, order status, invoice
          number, and shipping tracking number.
        </p>
        <h3>Technical information</h3>
        <p>
          Our hosting and storage providers keep standard server logs — IP
          address, browser user-agent, and the time and path of the request —
          which exist to keep the service running and to investigate abuse.
        </p>
        <p>
          We do not ask for and do not want government identifiers, health
          information, or biometric data. Payment card numbers never touch this
          site: invoices are settled outside the application, so we hold no card
          details.
        </p>
      </>
    ),
  },
  {
    id: "why-we-use-it",
    n: "03",
    title: "Why we use it",
    body: (
      <>
        <p>Each thing we collect is used for the job it was collected for:</p>
        <ul>
          <li>
            <strong>To manufacture your part.</strong> Your model file, print
            settings, and notes are what the shop works from.
          </li>
          <li>
            <strong>To reach you about your order.</strong> Quotes, invoices,
            status changes, and shipping notices go to your email address; we
            use your phone number if an order needs a conversation.
          </li>
          <li>
            <strong>To ship it.</strong> Your shipping address goes to the
            carrier, and your billing address is used for invoicing.
          </li>
          <li>
            <strong>To keep your account working and secure.</strong> Signing
            in, staying signed in, and protecting the account from misuse.
          </li>
          <li>
            <strong>To meet our own legal and tax obligations.</strong> Business
            records for completed orders.
          </li>
        </ul>
        <p>
          We do not send marketing email unless you ask us to. Everything we
          send by default is transactional — it is about an order you placed or
          an account you opened.
        </p>
      </>
    ),
  },
  {
    id: "never-sold",
    n: "04",
    title: "We do not sell your information",
    body: (
      <>
        <p>
          <strong>
            We have never sold or shared personal information for money or for
            cross-context behavioural advertising, and we do not intend to.
          </strong>{" "}
          Your model files and part descriptions are treated as your
          confidential business information. We do not publish them, show them
          to other customers, or use them as portfolio work without asking you
          first, in writing.
        </p>
      </>
    ),
  },
  {
    id: "processors",
    n: "05",
    title: "Who else touches it",
    body: (
      <>
        <p>
          Running the shop takes a short list of service providers. Each one may
          only handle your information to provide its service to us, and none of
          them may use it for their own purposes:
        </p>
        <ul>
          <li>
            <strong>Cloudflare R2</strong> — stores the model files and
            reference images you upload.
          </li>
          <li>
            <strong>Resend</strong> — delivers transactional email such as
            quotes, invoices, and status updates.
          </li>
          <li>
            <strong>Our database and application hosting providers</strong> —
            store account and order records and serve the site.
          </li>
          <li>
            <strong>Shipping carriers</strong> — receive the name and address
            needed to deliver a finished part.
          </li>
        </ul>
        <p>
          Beyond those, we disclose personal information only when the law
          requires it — a valid subpoena, court order, or similar legal process
          — or when it is necessary to establish or defend a legal claim. If a
          request appears overbroad or improper, we will push back on it.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    n: "06",
    title: "Cookies",
    body: (
      <>
        <p>
          This site sets three cookies, all of them strictly necessary: they
          keep you signed in, protect forms against cross-site request forgery,
          and remember the page you were heading to when sign-in interrupted
          you. A visitor who never signs in is never given any of them.
        </p>
        <p>
          There are no analytics, advertising, or profiling cookies. The{" "}
          <Link href="/cookies">Cookie Policy</Link> lists each one by name,
          with its lifetime and exactly what it does.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    n: "07",
    title: "How long we keep it",
    body: (
      <>
        <ul>
          <li>
            <strong>Account records</strong> — for as long as your account is
            open, and afterwards only as long as tax and business-record rules
            require.
          </li>
          <li>
            <strong>Order records</strong> — kept for our accounting and
            warranty obligations, generally seven years.
          </li>
          <li>
            <strong>Uploaded model files</strong> — kept while the order is
            live and for a reasonable window afterwards so a part can be
            reprinted or a revision quoted. Ask us and we will delete a file
            sooner.
          </li>
          <li>
            <strong>Server logs</strong> — short-lived, per our providers&apos;
            standard retention.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    n: "08",
    title: "Your choices and rights",
    body: (
      <>
        <p>
          You can see and change your name, addresses, phone numbers, and
          password yourself at any time from{" "}
          <Link href="/settings">Account settings</Link>. Beyond that, you may
          ask us to:
        </p>
        <ul>
          <li>tell you what personal information we hold about you;</li>
          <li>correct anything inaccurate;</li>
          <li>
            delete your account and the personal information attached to it,
            except records we must keep for tax or legal reasons;
          </li>
          <li>delete a specific uploaded model file;</li>
          <li>send you a copy of your information in a portable format.</li>
        </ul>
        <p>
          Email <a href={mail}>{LEGAL_CONTACT.email}</a> and we will respond
          within 45 days. We will never charge you for making a request, and we
          will never treat you differently for having made one.
        </p>
        <h3>California residents</h3>
        <p>
          The rights above are the rights the CCPA, as amended by the CPRA,
          gives you: to know, to delete, to correct, to opt out of sale or
          sharing, and to limit the use of sensitive personal information. There
          is nothing to opt out of here — as stated in section 04, we do not
          sell or share personal information, and we do not collect sensitive
          personal information as that law defines it. You may use an authorised
          agent to make a request on your behalf.
        </p>
        <h3>If you are outside the United States</h3>
        <p>
          The shop, its servers, and its service providers are in the United
          States. Using the site means your information is transferred to and
          processed in the United States, where privacy law differs from the law
          where you live. If the GDPR or UK GDPR applies to you, our lawful
          bases are performance of a contract (making and delivering your part),
          legal obligation (tax and business records), and our legitimate
          interest in keeping the site secure and operating. You may object, ask
          us to restrict processing, or complain to your local supervisory
          authority.
        </p>
      </>
    ),
  },
  {
    id: "security",
    n: "09",
    title: "How we protect it",
    body: (
      <>
        <p>
          Traffic to and from the site is encrypted in transit. Passwords are
          stored only as bcrypt hashes. Uploaded files are held in private
          storage and reached through short-lived signed links rather than
          public URLs, and every upload is checked against its real file
          signature before it is stored. Order and account records are reachable
          only by you and by shop staff who need them to do the work.
        </p>
        <p>
          No system is perfectly secure, and we will not pretend otherwise. If a
          breach ever affects your personal information, we will notify you and
          the relevant authorities as the law requires.
        </p>
      </>
    ),
  },
  {
    id: "children",
    n: "10",
    title: "Children",
    body: (
      <p>
        This is a business-to-business manufacturing service. It is not directed
        to children, and we do not knowingly collect personal information from
        anyone under 16. If you believe a child has given us information, write
        to <a href={mail}>{LEGAL_CONTACT.email}</a> and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    n: "11",
    title: "Changes to this policy",
    body: (
      <p>
        If this policy changes we will update the date at the top of the page,
        and for a material change — a new category of information, a new
        purpose, a new recipient — we will say so on the site before the change
        takes effect. This version is dated {LEGAL_LAST_UPDATED}.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-privacy"
        data={breadcrumbSchema([{ name: "Privacy Policy", path: "/privacy" }])}
      />
      <LegalDocument
        current="/privacy"
        eyebrow="LEGAL ⁄ PRIVACY"
        title="Privacy"
        accent="policy."
        lede="What we collect when you request a part, who else ever touches it, how long we keep it, and how to get it back or have it deleted."
        summary={
          <>
            <p>
              We collect what it takes to build and ship your part — your
              contact and address details, and the model or description you send
              us. Nothing more.
            </p>
            <ul>
              <li>
                No analytics, no advertising tags, no tracking of any kind on
                this site.
              </li>
              <li>
                We have never sold or shared your information, and your model
                files are treated as confidential.
              </li>
              <li>
                Your uploads and account details are yours — ask and we will
                correct or delete them.
              </li>
            </ul>
          </>
        }
        sections={sections}
      />
    </>
  );
}
