import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";
import { breadcrumbSchema } from "@/lib/structured-data";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { LEGAL_CONTACT, LEGAL_LAST_UPDATED } from "@/lib/legal";

const title = "File Retention Policy";
const description =
  "What happens to the model files and photographs you upload to TakomoCo: we keep them so a part can be reprinted or revised without you starting over, and we delete any specific file on request.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/file-retention" },
  openGraph: {
    type: "website",
    url: "/file-retention",
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
const deletionMail = `mailto:${LEGAL_CONTACT.email}?subject=${encodeURIComponent(
  "File deletion request"
)}`;

const sections: LegalSection[] = [
  {
    id: "what-this-covers",
    n: "01",
    title: "What this covers",
    body: (
      <>
        <p>
          This policy covers the files you send the shop: 3D model files
          (.stl, .3mf, .step, archives of the same), and the reference
          photographs, sketches, and drawings attached to a request when there
          is no model yet. It applies whether the file arrived with a signed-in
          account or through the public{" "}
          <Link href="/estimate">estimate form</Link>.
        </p>
        <p>
          It sits alongside the{" "}
          <Link href="/terms">Terms of Service</Link> and the{" "}
          <Link href="/privacy">Privacy Policy</Link> and does not replace
          either. Nothing here changes who owns your model:{" "}
          <strong>your files stay yours</strong>, and holding a copy gives us no
          right to print it for anyone else, publish it, sell it, or use it for
          anything beyond your own work.
        </p>
      </>
    ),
  },
  {
    id: "we-keep-your-files",
    n: "02",
    title: "We keep a copy of what you submit",
    body: (
      <>
        <p>
          <strong>
            When you submit a file it may be retained in our database and file
            storage after the job it came in for is finished.
          </strong>{" "}
          That is deliberate, and it is for your benefit: the most common thing
          a customer asks for is the part they already had made.
        </p>
        <p>Because we still hold the file, that second run is simple:</p>
        <ul>
          <li>
            <strong>A reprint</strong> — ask for the same part again and we
            print from the file already on record. Nothing to re-upload, no
            hunting for the original on a drive you no longer own, no risk of
            sending a different revision by mistake.
          </li>
          <li>
            <strong>A revision</strong> — a change to a part we have made
            before starts from the file we printed, not from scratch, which is
            faster and cheaper to quote.
          </li>
          <li>
            <strong>A warranty or accuracy question</strong> — if a part comes
            back wrong, we can compare it against the exact file it was made
            from rather than taking either side&apos;s word for it.
          </li>
        </ul>
        <p>
          Stored with the file is the ordinary record of the job it belongs to:
          the file name, the material, quantity, and print settings used, and
          the request it was attached to. That is what lets us find the right
          file later when you ask for &ldquo;the bracket from last spring&rdquo;.
        </p>
      </>
    ),
  },
  {
    id: "how-long",
    n: "03",
    title: "How long we keep it",
    body: (
      <>
        <p>
          Files are kept while your account is open and the part remains
          something you might reasonably ask for again. We do not set a fixed
          expiry, because a customer coming back for a replacement part three
          years later is normal work for this shop rather than an edge case.
        </p>
        <p>
          A file is removed sooner in any of these cases: you ask us to delete
          it (section 04); you close your account, which removes the files
          attached to it; or the shop retires storage that is no longer needed
          for any live or foreseeable job.
        </p>
        <p>
          The order record itself — dates, quantities, the invoice number, and
          the amount — is kept for our accounting and warranty obligations even
          after a file is deleted, as described in section 07 of the{" "}
          <Link href="/privacy">Privacy Policy</Link>. Deleting a model does not
          erase the fact that an order happened.
        </p>
      </>
    ),
  },
  {
    id: "deletion",
    n: "04",
    title: "Deleting a file, on request",
    body: (
      <>
        <p>
          <strong>
            Any specific file can be deleted on request. Email{" "}
            <a href={deletionMail}>{LEGAL_CONTACT.email}</a> and tell us which
            one, and we will remove it.
          </strong>
        </p>
        <p>
          It helps us if you send the request from the email address on your
          account and name the file or the request it belongs to — the file
          name, the part name, or the order it was printed for is plenty. If
          you would rather we cleared everything, say so and we will delete
          every model file we hold for you.
        </p>
        <p>
          We will action the request and confirm it by reply, normally within a
          few days and in any case within the 45 days stated in the{" "}
          <Link href="/privacy">Privacy Policy</Link>. There is no charge, you
          do not have to give a reason, and asking will never affect how your
          work is handled or priced.
        </p>
        <p>
          Two honest limits. A file still needed for a job in production cannot
          be deleted mid-run — we will finish or cancel the part first, your
          choice. And routine backups cycle out on their own schedule, so a
          deleted file may persist in a backup for a short period afterwards; it
          is not restored to live storage and is not used for anything.
        </p>
        <p>
          After a deletion, a later reprint of that part means uploading the
          file again. That is the trade, and it is yours to make.
        </p>
      </>
    ),
  },
  {
    id: "handling",
    n: "05",
    title: "How the files are held",
    body: (
      <>
        <p>
          Uploaded files live in access-controlled object storage, not on a
          public address. A download link is served only to the account that
          owns the file, or to the shop. Other customers cannot reach your
          models, and we do not publish, share, or sell them.
        </p>
        <p>
          Inside the shop, access is limited to the people running the job. We
          use your file to price, repair, slice, print, and inspect your part,
          and to do the reprints and revisions described in section 02 —
          nothing else. We do not use customer models to train anything or to
          make parts for other people.
        </p>
      </>
    ),
  },
  {
    id: "your-agreement",
    n: "06",
    title: "Your agreement",
    body: (
      <>
        <p>
          Agreeing to this policy is required to open an account: the sign-up
          form asks you to tick a box confirming you accept it, and an account
          cannot be created without that. Submitting a file through the public
          estimate form accepts it too.
        </p>
        <p>
          You warrant, as under section 05 of the{" "}
          <Link href="/terms">Terms of Service</Link>, that you have the right
          to send us each file you upload and to have the part reproduced. If
          you hold someone else&apos;s model under an agreement that forbids a
          third party keeping a copy, do not upload it — or upload it and then
          ask us to delete it once the job is done, which is exactly what
          section 04 is for.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    n: "07",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy; the date at the top of the page shows when it
        last changed, and a material change will be announced on the site before
        it takes effect. Questions about it go to{" "}
        <a href={mail}>{LEGAL_CONTACT.email}</a>. This version is dated{" "}
        {LEGAL_LAST_UPDATED}.
      </p>
    ),
  },
];

export default function FileRetentionPage() {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb-file-retention"
        data={breadcrumbSchema([
          { name: "File Retention Policy", path: "/file-retention" },
        ])}
      />
      <LegalDocument
        current="/file-retention"
        eyebrow="LEGAL ⁄ FILE RETENTION"
        title="File retention"
        accent="policy."
        lede="What happens to a model after we have printed it. The short version: we keep it, so that the next time you need the part you can ask for it instead of starting over — and we delete any file you ask us to."
        summary={
          <>
            <ul>
              <li>
                A file you submit may be retained in our database and file
                storage after the job is done.
              </li>
              <li>
                That is so a reprint or a revision is easy: ask for the part
                again and we print from the file already on record, with
                nothing to re-upload.
              </li>
              <li>
                Your models stay yours. They are held in access-controlled
                storage, seen only by the shop and by you, and never published,
                sold, or printed for anyone else.
              </li>
              <li>
                Any specific file is deleted on request — email{" "}
                <a href={deletionMail}>{LEGAL_CONTACT.email}</a> and say which
                one. No charge, no reason needed.
              </li>
              <li>
                Deleting a model does not erase the order record behind it, and
                after a deletion a future reprint means uploading the file
                again.
              </li>
            </ul>
          </>
        }
        sections={sections}
      />
    </>
  );
}
