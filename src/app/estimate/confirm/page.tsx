import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { estimateReference } from "@/lib/guest-estimate";
import { GuestEmailAction, verifyGuestEmailToken } from "@/lib/guest-email";
import ConfirmEstimate from "./ConfirmEstimate";

export const metadata: Metadata = {
  title: "Confirm an estimate request",
  description: "Confirm that an estimate request made with your email address was yours — or tell us it wasn't.",
  alternates: { canonical: "/estimate/confirm" },
  robots: { index: false, follow: false, nocache: true },
  // The link's token rides in the query string; keep it out of any Referer.
  referrer: "no-referrer",
};

/**
 * Where both links in the estimate form's confirmation email land.
 *
 * Opening this page changes nothing — mail scanners follow every link in a
 * message, so the page only reads the link and waits for a person to press a
 * button, which POSTs to /api/requests/guest/confirm. It checks the link's
 * signature here, with no database, so a person sees at once whether the link
 * is still good and a scanner that fetches it touches nothing.
 */
export default function ConfirmEstimatePage({
  searchParams,
}: {
  searchParams: { t?: string | string[]; a?: string | string[] };
}) {
  const token = typeof searchParams.t === "string" ? searchParams.t : "";
  const intent: GuestEmailAction = searchParams.a === "disown" ? "disown" : "confirm";
  const verified = verifyGuestEmailToken(token);

  return (
    <>
      <SiteHeader />
      <ConfirmEstimate
        token={verified.ok ? token : null}
        reference={verified.ok ? estimateReference(verified.requestId) : null}
        initialIntent={intent}
      />
      <SiteFooter />
    </>
  );
}
