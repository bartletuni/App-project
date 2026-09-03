"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Phone,
  ShieldCheck,
  Zap,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/ui/Reveal";
import PartSourceFields from "@/components/PartSourceFields";
import { useFormAlert } from "@/components/ui/useFormAlert";
import { describeSubmitException, readSubmitError } from "@/lib/submit-error";
import { appendPartSource, emptyPartSource, PartSourceState, validatePartSource } from "@/lib/part-source";
import { COMPOSER_QUOTE_HREF } from "@/lib/quote";
import {
  FORM_TOKEN_FIELD,
  GuestContactState,
  HONEYPOT_FIELD,
  MATERIAL_UNDECIDED_LABEL,
  MAX_COMPANY_CHARS,
  MAX_CONTACT_NAME_CHARS,
  MAX_EMAIL_CHARS,
  MAX_NOTES_CHARS,
  MAX_PHONE_CHARS,
  MIN_LEAD_DAYS,
  TURNSTILE_FIELD,
  emptyGuestContact,
  turnstileSiteKey,
  validateGuestContact,
} from "@/lib/guest-quote";

const field =
  "w-full border border-clay-500/25 px-4 py-3 text-base text-cream-100 placeholder:text-cream-600 focus:border-clay-400 focus:ring-1 focus:ring-clay-500/40 outline-none transition rounded-md";
const labelCls =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 mb-2";

/**
 * The no-account quote form.
 *
 * Written for someone standing next to the machine that just broke: photograph
 * the part, say what it is, three contact fields, send. Everything the shop can
 * ask for on the callback — quantity, material, the date, notes — is folded
 * away behind one disclosure, so the form reads as four things, not eleven.
 *
 * Inputs are 16px on purpose: anything smaller and iOS zooms the page on focus,
 * which on a phone feels like the form fighting back. The contact block carries
 * real `autoComplete` tokens so one autofill tap fills all of it.
 *
 * What keeps the bots out is deliberately invisible: a honeypot field nobody
 * can see, a signed token proving this page was loaded and dwelt on, rate
 * limits at the endpoint, and Cloudflare Turnstile where a deployment has
 * configured it. A real customer clicks nothing extra.
 */
function QuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  // A signed-in visitor has a composer that already knows their details and
  // keeps the result on their desk; this page would be a downgrade for them.
  useEffect(() => {
    if (status === "authenticated") router.replace(COMPOSER_QUOTE_HREF);
  }, [status, router]);

  const [partSource, setPartSource] = useState<PartSourceState>(emptyPartSource);
  const [contact, setContact] = useState<GuestContactState>(emptyGuestContact);
  const [quantity, setQuantity] = useState("1");
  const [material, setMaterial] = useState("");
  const [materials, setMaterials] = useState<{ id: string; name: string }[]>([]);
  const [dateNeeded, setDateNeeded] = useState("");
  const [notes, setNotes] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [formToken, setFormToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string; email: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const errorAlert = useFormAlert<HTMLDivElement>();
  const error = errorAlert.message;
  const setError = errorAlert.show;

  const siteKey = turnstileSiteKey();
  const minDate = format(addDays(new Date(), MIN_LEAD_DAYS), "yyyy-MM-dd");
  const initialMaterial = searchParams.get("material");

  // The proof-of-form-load token, fetched the moment the page mounts so the
  // dwell-time check is measured from when the customer actually arrived.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/requests/guest/token")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.token) setFormToken(data.token);
      })
      .catch(() => {
        /* Submitting without one fails with a message that says to reload. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch("/api/materials")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return;
        setMaterials(data);
        // Only a material deep-link from the stock index preselects one;
        // otherwise "not sure" stands, because it is the honest answer.
        if (initialMaterial && data.some((m) => m.name === initialMaterial)) {
          setMaterial(initialMaterial);
          setDetailsOpen(true);
        }
      })
      .catch(() => setMaterials([]));
  }, [initialMaterial]);

  const updateContact = (patch: Partial<GuestContactState>) =>
    setContact((current) => ({ ...current, ...patch }));

  const resetTurnstile = () => {
    // A Turnstile response is spent once it is verified; a second submission
    // needs a fresh one.
    (window as any).turnstile?.reset?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    errorAlert.clear();

    const sourceError = validatePartSource(partSource);
    if (sourceError) return setError(sourceError);

    const contactError = validateGuestContact(contact);
    if (contactError) return setError(contactError);

    setLoading(true);

    const formData = new FormData();
    appendPartSource(formData, partSource);
    formData.append("name", contact.name);
    formData.append("email", contact.email);
    formData.append("phone", contact.phone);
    formData.append("company", contact.company);
    formData.append("quantity", quantity);
    formData.append("material", material);
    formData.append("dateNeeded", dateNeeded);
    formData.append("notes", notes);
    formData.append(FORM_TOKEN_FIELD, formToken);

    // The honeypot and the Turnstile response are both real inputs inside the
    // form — one hidden from people, one injected by Cloudflare's widget.
    const honeypot = formRef.current?.querySelector<HTMLInputElement>(`[name="${HONEYPOT_FIELD}"]`);
    formData.append(HONEYPOT_FIELD, honeypot?.value || "");
    const turnstile = formRef.current?.querySelector<HTMLInputElement>(`[name="${TURNSTILE_FIELD}"]`);
    if (turnstile?.value) formData.append(TURNSTILE_FIELD, turnstile.value);

    try {
      const res = await fetch("/api/requests/guest", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await readSubmitError(res));

      const data = await res.json();
      setSubmitted({ reference: data.reference || "", email: data.email || contact.email });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      resetTurnstile();
      setError(describeSubmitException(err));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <QuoteSent reference={submitted.reference} email={submitted.email} />;
  }

  const submitBlocker = validatePartSource(partSource) || validateGuestContact(contact);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-28 pb-20">
      <Reveal>
        <span className="eyebrow">QUOTE ⁄ NO ACCOUNT NEEDED</span>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl text-cream-100">
          Send us the part.<br />
          <span className="italic text-clay-300">We&apos;ll send back a price.</span>
        </h1>
        <p className="mt-5 text-cream-400 leading-relaxed">
          No sign-up, no password. A photo and a sentence is enough to start — we
          answer within one business day, print on a{" "}
          <strong className="font-semibold text-cream-200">72-hour typical
          turnaround</strong>, and nothing gets built or invoiced until you
          approve the price.
        </p>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cream-500">
          <li className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-clay-400" aria-hidden="true" /> 72h typical turnaround
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-clay-400" aria-hidden="true" /> Answer in 1 business day
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-clay-400" aria-hidden="true" /> No obligation
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-clay-400" aria-hidden="true" />
            <a href="tel:+13856954178" className="hover:text-clay-300 transition-colors">
              Or call 385-695-4178
            </a>
          </li>
        </ul>
      </Reveal>

      <Reveal delay={0.08} className="mt-8">
        <Panel className="p-6 sm:p-8 rounded-md">
          {error && (
            <div
              ref={errorAlert.ref}
              tabIndex={-1}
              className="mb-6 flex gap-3 border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300 outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-red-200">
                  Quote not sent
                </span>
                <span className="mt-1 block leading-relaxed">{error}</span>
              </span>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
            <PartSourceFields
              value={partSource}
              onChange={setPartSource}
              idPrefix="guest-quote"
              fieldClassName={field}
              labelClassName={labelCls}
              onLocalError={setError}
            />

            {/* Invisible to people, irresistible to a form-filling bot. Kept
                out of the tab order and hidden from assistive technology, so
                nobody who could fill it in ever meets it. */}
            <div aria-hidden="true" className="hidden">
              <label htmlFor="guest-quote-nickname">Leave this field empty</label>
              <input
                id="guest-quote-nickname"
                type="text"
                name={HONEYPOT_FIELD}
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>

            <div className="space-y-4 border-t border-clay-500/15 pt-6">
              <div className="flex items-center gap-3">
                <span className="eyebrow">WHERE TO SEND IT</span>
                <span className="hairline flex-1" />
              </div>

              <div>
                <label htmlFor="guest-name" className={labelCls}>
                  Your name <span className="text-clay-400">*</span>
                </label>
                <input
                  id="guest-name"
                  type="text"
                  value={contact.name}
                  onChange={(e) => updateContact({ name: e.target.value })}
                  maxLength={MAX_CONTACT_NAME_CHARS}
                  autoComplete="name"
                  className={field}
                  placeholder="Alex Rivera"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="guest-email" className={labelCls}>
                    Email <span className="text-clay-400">*</span>
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    inputMode="email"
                    value={contact.email}
                    onChange={(e) => updateContact({ email: e.target.value })}
                    maxLength={MAX_EMAIL_CHARS}
                    autoComplete="email"
                    className={field}
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="guest-phone" className={labelCls}>
                    Phone <span className="text-clay-400">*</span>
                  </label>
                  <input
                    id="guest-phone"
                    type="tel"
                    inputMode="tel"
                    value={contact.phone}
                    onChange={(e) => updateContact({ phone: e.target.value })}
                    maxLength={MAX_PHONE_CHARS}
                    autoComplete="tel"
                    className={field}
                    placeholder="(385) 695-4178"
                    required
                  />
                </div>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-cream-600">
                The quote goes to your email. The phone number is for the questions
                that are faster asked than typed.
              </p>
            </div>

            {/* Everything the shop can just as easily ask on the callback.
                Folded away so the form reads as four things, not eleven. */}
            <details
              className="group border border-clay-500/20 rounded-md open:border-clay-500/35 transition-colors"
              open={detailsOpen}
              onToggle={(e) => setDetailsOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cream-400 hover:text-cream-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-md">
                Add quantity, material, date — optional
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <div className="space-y-4 border-t border-clay-500/15 px-4 py-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guest-quantity" className={labelCls}>Quantity</label>
                    <input
                      id="guest-quantity"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={field}
                    />
                  </div>
                  <div>
                    <label htmlFor="guest-date" className={labelCls}>Need it by</label>
                    <input
                      id="guest-date"
                      type="date"
                      min={minDate}
                      value={dateNeeded}
                      onChange={(e) => setDateNeeded(e.target.value)}
                      className={field}
                    />
                  </div>
                </div>
                <p className="-mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cream-600">
                  {MIN_LEAD_DAYS}-day minimum lead time · sooner than that, call the shop
                </p>

                <div>
                  <label htmlFor="guest-material" className={labelCls}>Material</label>
                  <select
                    id="guest-material"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className={field}
                  >
                    <option value="">{MATERIAL_UNDECIDED_LABEL}</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="guest-company" className={labelCls}>Company</label>
                  <input
                    id="guest-company"
                    type="text"
                    value={contact.company}
                    onChange={(e) => updateContact({ company: e.target.value })}
                    maxLength={MAX_COMPANY_CHARS}
                    autoComplete="organization"
                    className={field}
                  />
                </div>

                <div>
                  <label htmlFor="guest-notes" className={labelCls}>Anything else</label>
                  <textarea
                    id="guest-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={MAX_NOTES_CHARS}
                    rows={3}
                    className={`${field} resize-none`}
                    placeholder="Colour, finish, what the part has to survive…"
                  />
                </div>
              </div>
            </details>

            {/* Cloudflare's widget, only when this deployment has configured it.
                Managed mode is invisible for almost every real visitor; the
                hidden input it injects here is read on submit. */}
            {siteKey && (
              <div
                className="cf-turnstile"
                data-sitekey={siteKey}
                data-theme="dark"
                data-appearance="interaction-only"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-md bg-clay-600 px-4 py-4 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 shadow-glow transition-colors hover:bg-clay-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  Get my quote
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </>
              )}
            </button>

            {/* What is still missing, before they press anything. Decorative:
                the banner above is the announced one. */}
            {!error && submitBlocker && (
              <p className="text-xs leading-relaxed text-cream-500" aria-hidden="true">
                {submitBlocker}
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-cream-600">
              By sending this you confirm you own this part or otherwise have the
              right to have it reproduced. Printed parts are not qualified for
              safety-critical use — see the{" "}
              <Link href="/terms" className="underline decoration-clay-500/40 underline-offset-2 hover:text-cream-400">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline decoration-clay-500/40 underline-offset-2 hover:text-cream-400">
                Privacy Policy
              </Link>
              . Prefer an account?{" "}
              <Link href="/login" className="underline decoration-clay-500/40 underline-offset-2 hover:text-cream-400">
                Sign in
              </Link>{" "}
              and use the composer instead.
            </p>
          </form>
        </Panel>
      </Reveal>

      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      )}
    </div>
  );
}

/**
 * What a guest gets instead of a dashboard: the reference the shop will use on
 * the phone, what happens next, and — as an offer, never a gate — the account
 * that would have kept it all in one place.
 */
function QuoteSent({ reference, email }: { reference: string; email: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-28 pb-20">
      <Reveal>
        <Panel className="p-7 sm:p-10 rounded-md">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-green-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Quote request sent
          </span>

          <h1 className="mt-5 font-display text-4xl text-cream-100">
            It&apos;s with the shop.
          </h1>

          {reference && (
            <div className="mt-6 border border-clay-500/25 bg-clay-500/5 px-5 py-4 rounded-md">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500">
                Your reference
              </div>
              <div className="mt-1 font-mono text-2xl tracking-[0.12em] text-clay-200">{reference}</div>
              <p className="mt-2 text-xs text-cream-500">
                Quote this if you call. A copy is on its way to {email}.
              </p>
            </div>
          )}

          <ol className="mt-7 space-y-4">
            {[
              ["01", "A person reads it", "Not a calculator — within one business day."],
              ["02", "We come back with a price", "By email or phone, with anything we still need to ask."],
              ["03", "You decide", "Nothing is built and nothing is invoiced until you approve it. Printing runs on a 72-hour typical turnaround from there."],
            ].map(([n, title, detail]) => (
              <li key={n} className="flex gap-4">
                <span className="font-mono text-xs text-clay-400 pt-0.5">{n}</span>
                <span>
                  <span className="block text-sm font-semibold text-cream-200">{title}</span>
                  <span className="mt-0.5 block text-sm text-cream-500">{detail}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/login?register=1&email=${encodeURIComponent(email)}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-clay-600 px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cream-100 shadow-glow transition-colors hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
            >
              Open an account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/quote"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-clay-500/30 px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cream-300 transition-colors hover:border-clay-400 hover:text-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
            >
              Send another part
            </Link>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-cream-600">
            An account puts every <em>future</em> job on one desk where you can watch it
            move. This quote stays where it is — we keep no-account quotes off accounts
            on purpose, so nobody can attach anything to yours by typing your address
            into a form. We&apos;ll answer this one at{" "}
            <span className="text-cream-400">{email}</span> either way.
          </p>
        </Panel>
      </Reveal>
    </div>
  );
}

export default function QuotePage() {
  return (
    <>
      <SiteHeader />
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-28 pb-20">
            <div className="panel h-[32rem] animate-pulse rounded-md" />
          </div>
        }
      >
        <QuoteContent />
      </Suspense>
      <SiteFooter />
    </>
  );
}
