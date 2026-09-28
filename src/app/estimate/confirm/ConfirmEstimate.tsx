"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, MailX } from "lucide-react";

import Panel from "@/components/ui/Panel";
import { useFormAlert } from "@/components/ui/useFormAlert";
import { BUSINESS } from "@/lib/seo";
import { describeSubmitException, readSubmitError } from "@/lib/submit-error";
import type { GuestEmailAction } from "@/lib/guest-email";

const primary =
  "inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2";
const secondary =
  "mt-4 text-sm text-cream-500 underline decoration-clay-500/40 underline-offset-4 hover:text-cream-300 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded";

type Outcome = { action: "confirm" } | { action: "disown"; removed: boolean };

const telephone = BUSINESS.telephone.replace(/^\+1-/, "");

/**
 * The two answers to "was this you?", one at a time.
 *
 * The link someone clicked says which answer they meant, and that one is the
 * big button; the other is a quiet line under it, because a person who
 * clicked "this wasn't me" by mistake should be one tap from putting it right
 * — and nothing happens at all until a button is pressed.
 */
export default function ConfirmEstimate({
  token,
  reference,
  initialIntent,
}: {
  /** Null when the link failed its signature or age check on the server. */
  token: string | null;
  reference: string | null;
  initialIntent: GuestEmailAction;
}) {
  const [intent, setIntent] = useState<GuestEmailAction>(initialIntent);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const errorAlert = useFormAlert<HTMLDivElement>();
  const resultHeading = useRef<HTMLHeadingElement>(null);

  // Carry focus to the result, so it is announced and not just painted.
  useEffect(() => {
    if (outcome) resultHeading.current?.focus();
  }, [outcome]);

  const act = async () => {
    if (!token) return;
    errorAlert.clear();
    setBusy(true);
    try {
      const res = await fetch("/api/requests/guest/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, action: intent }),
      });
      if (!res.ok) throw new Error(await readSubmitError(res));
      const data = await res.json();
      setOutcome(
        data.action === "disown" ? { action: "disown", removed: Boolean(data.removed) } : { action: "confirm" }
      );
    } catch (err: unknown) {
      errorAlert.show(describeSubmitException(err));
    } finally {
      setBusy(false);
    }
  };

  const contact = (
    <p className="mt-6 text-sm leading-relaxed text-cream-500">
      Questions? Call{" "}
      <a href={`tel:${BUSINESS.telephone}`} className="text-clay-300 hover:text-clay-200">
        {telephone}
      </a>{" "}
      or email{" "}
      <a href={`mailto:${BUSINESS.email}`} className="text-clay-300 hover:text-clay-200">
        {BUSINESS.email}
      </a>
      .
    </p>
  );

  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8 pt-28 pb-20">
      <Panel className="p-7 sm:p-10 rounded-md">
        {!token || !reference ? (
          <>
            <span className="eyebrow">ESTIMATE ⁄ LINK</span>
            <h1 className="mt-4 font-display text-3xl text-cream-100">This link doesn&apos;t work any more.</h1>
            <p className="mt-4 text-cream-400 leading-relaxed">
              It has expired, or it was copied incompletely. Nothing has been changed. If an
              estimate request is still waiting on you — or you want one that used your address
              removed — get in touch and we&apos;ll sort it out by hand.
            </p>
            {contact}
          </>
        ) : outcome ? (
          <div aria-live="polite">
            {outcome.action === "confirm" ? (
              <>
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-green-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Confirmed
                </span>
                <h1 ref={resultHeading} tabIndex={-1} className="mt-4 font-display text-3xl text-cream-100 outline-none">
                  Thanks — that&apos;s all we needed.
                </h1>
                <p className="mt-4 text-cream-400 leading-relaxed">
                  Estimate <span className="font-mono text-clay-200">{reference}</span> is confirmed.
                  A person at the shop reads it within one business day and comes back with an
                  estimate, by email or phone.
                </p>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-clay-300">
                  <MailX className="h-4 w-4" aria-hidden="true" /> {outcome.removed ? "Removed" : "Reported"}
                </span>
                <h1 ref={resultHeading} tabIndex={-1} className="mt-4 font-display text-3xl text-cream-100 outline-none">
                  {outcome.removed ? "Done. Sorry for the bother." : "Understood — we've told the shop."}
                </h1>
                <p className="mt-4 text-cream-400 leading-relaxed">
                  {outcome.removed
                    ? "The request and everything uploaded with it have been deleted, and our estimate form will never email this address again."
                    : "The shop had already started work on this one, so it wasn't deleted automatically — a person will look at it. Our estimate form will never email this address again."}
                </p>
              </>
            )}
            {contact}
          </div>
        ) : (
          <>
            <span className="eyebrow">ESTIMATE ⁄ {reference}</span>
            {intent === "confirm" ? (
              <>
                <h1 className="mt-4 font-display text-3xl text-cream-100">Was this estimate request yours?</h1>
                <p className="mt-4 text-cream-400 leading-relaxed">
                  Someone asked us for an estimate and gave this email address for the answer. If it
                  was you, confirm it and we can start without calling to check first.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-4 font-display text-3xl text-cream-100">Didn&apos;t send this?</h1>
                <p className="mt-4 text-cream-400 leading-relaxed">
                  Then someone typed your address into our estimate form. Remove it and we&apos;ll
                  delete the request and anything uploaded with it, and the form will never email
                  this address again.
                </p>
              </>
            )}

            {errorAlert.message && (
              <div
                ref={errorAlert.ref}
                tabIndex={-1}
                role="alert"
                className="mt-6 flex gap-3 border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300 outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">{errorAlert.message}</span>
              </div>
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={act}
                disabled={busy}
                className={`${primary} ${
                  intent === "confirm"
                    ? "bg-clay-600 shadow-glow hover:bg-clay-700 focus-visible:ring-clay-500"
                    : "bg-red-700/80 hover:bg-red-700 focus-visible:ring-red-400"
                }`}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {intent === "confirm" ? "Confirming…" : "Removing…"}
                  </>
                ) : intent === "confirm" ? (
                  "Yes, it was me"
                ) : (
                  "Remove it and stop emails"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  errorAlert.clear();
                  setIntent(intent === "confirm" ? "disown" : "confirm");
                }}
                disabled={busy}
                className={secondary}
              >
                {intent === "confirm" ? "No — I didn't send this" : "Actually, it was me"}
              </button>
            </div>

            <p className="mt-8 text-xs leading-relaxed text-cream-600">
              What comes back from the shop is an estimate, not a guaranteed price — see the{" "}
              <Link href="/terms" className="underline decoration-clay-500/40 underline-offset-2 hover:text-cream-400">
                Terms
              </Link>
              . How we handle the address and files is in the{" "}
              <Link href="/privacy" className="underline decoration-clay-500/40 underline-offset-2 hover:text-cream-400">
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
