"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { AlertTriangle, Plus, ArrowRight } from "lucide-react";
import Panel from "@/components/ui/Panel";
import PartSourceFields from "@/components/PartSourceFields";
import { useFormAlert } from "@/components/ui/useFormAlert";
import { describeSubmitException, readSubmitError } from "@/lib/submit-error";
import PrintSettingsFields, { PrintSettingsState } from "@/components/PrintSettingsFields";
import { DEFAULT_CUSTOM_SETTINGS, validateCustomSettings } from "@/lib/print-settings";
import { QUOTE_PARAM, isQuoteRequested } from "@/lib/quote";
import {
  PartSourceState,
  appendPartSource,
  emptyPartSource,
  quoteIsForced,
  validatePartSource,
} from "@/lib/part-source";

const field =
  "w-full border border-clay-500/25 px-4 py-2.5 text-cream-100 placeholder:text-cream-600 focus:border-clay-400 focus:ring-1 focus:ring-clay-500/40 outline-none transition rounded-md";
const labelCls =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 mb-2";

function RequestFormContent({ onFormSubmit }: { onFormSubmit: () => void }) {
  const searchParams = useSearchParams();
  const initialMaterial = searchParams.get("material");

  const [partSource, setPartSource] = useState<PartSourceState>(emptyPartSource);
  const [notes, setNotes] = useState("");
  const [material, setMaterial] = useState("");
  const [availableMaterials, setAvailableMaterials] = useState<{ id: string; name: string }[]>([]);
  const [dateNeeded, setDateNeeded] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [pastPhones, setPastPhones] = useState<{ id: string; number: string }[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettingsState>({
    mode: "AUTO",
    custom: { ...DEFAULT_CUSTOM_SETTINGS },
  });
  // Off unless the visitor arrived through a "Request a quote" button, and
  // only for that visit — the initialiser runs once, and submitting clears it.
  const [quoteRequested, setQuoteRequested] = useState(() =>
    isQuoteRequested(searchParams.get(QUOTE_PARAM))
  );
  const [loading, setLoading] = useState(false);
  // The banner sits at the top of the panel, well above the submit button, so
  // it scrolls itself into view rather than failing somewhere off-screen.
  const errorAlert = useFormAlert<HTMLDivElement>();
  const error = errorAlert.message;
  const setError = errorAlert.show;

  const minDate = format(addDays(new Date(), 3), "yyyy-MM-dd");

  useEffect(() => {
    fetch("/api/user/phone-numbers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPastPhones(data);
          if (data.length > 0) {
            setPhoneNumber(data[0].number);
          } else {
            setIsAddingPhone(true);
          }
        }
      });

    fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableMaterials(data);
          if (data.length > 0) {
            if (initialMaterial && data.some((m) => m.name === initialMaterial)) {
              setMaterial(initialMaterial);
            } else {
              setMaterial(data[0].name);
            }
          }
        }
      });
  }, [initialMaterial]);

  // A described part cannot be priced until we have modelled it, so the quote
  // box ticks itself and locks for that lane; the API enforces the same rule.
  const quoteLocked = quoteIsForced(partSource.mode);
  const quoteChecked = quoteLocked || quoteRequested;

  // Kept off the submit button as a tooltip too, so a disabled button always
  // says which piece is still missing rather than sitting there inert.
  const submitBlocker = validatePartSource(partSource);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    errorAlert.clear();

    const sourceError = validatePartSource(partSource);
    if (sourceError) {
      setError(sourceError);
      setLoading(false);
      return;
    }

    const finalPhone = (isAddingPhone || pastPhones.length === 0) ? newPhoneNumber : phoneNumber;
    if (!finalPhone) {
      setError("Please provide a phone number.");
      setLoading(false);
      return;
    }

    let printSettingsJson = "";
    if (printSettings.mode === "CUSTOM") {
      const result = validateCustomSettings(printSettings.custom);
      if ("error" in result) {
        setError(`Print settings: ${result.error}`);
        setLoading(false);
        return;
      }
      printSettingsJson = JSON.stringify(result.settings);
    }

    const formData = new FormData();
    appendPartSource(formData, partSource);
    formData.append("quantity", quantity);
    formData.append("material", material);
    formData.append("notes", notes);
    formData.append("dateNeeded", dateNeeded);
    formData.append("phoneNumber", finalPhone);
    formData.append("quoteRequested", quoteChecked ? "true" : "false");
    if (printSettingsJson) formData.append("printSettings", printSettingsJson);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await readSubmitError(res));
      }

      setPartSource(emptyPartSource());
      setNotes("");
      if (availableMaterials.length > 0) setMaterial(availableMaterials[0].name);
      setQuantity("1");
      setDateNeeded("");
      setNewPhoneNumber("");
      setIsAddingPhone(false);
      setPrintSettings({ mode: "AUTO", custom: { ...DEFAULT_CUSTOM_SETTINGS } });
      setQuoteRequested(false);
      onFormSubmit();
    } catch (err: unknown) {
      setError(describeSubmitException(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel className="p-6 sm:p-7 rounded-md">
      <div className="flex items-center gap-3 mb-6">
        <span className="eyebrow">NEW BUILD ⁄ COMPOSER</span>
        <span className="hairline flex-1" />
      </div>

      {/* Standing advice, not a live alert — role="alert" here announced it on
          load and competed with the submission error below. */}
      <div className="mb-6 flex gap-3 border-l-2 border-yellow-500/50 bg-yellow-500/10 px-4 py-3" role="note">
        <AlertTriangle className="h-4 w-4 text-yellow-300 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-1.5 text-xs text-yellow-200/90 leading-relaxed">
          <p>
            <span className="font-mono uppercase tracking-[0.1em] text-yellow-300">Policy ·</span>{" "}
            Orders can be cancelled within <strong>30 minutes</strong> of submission.
          </p>
          <p>
            <span className="font-mono uppercase tracking-[0.1em] text-yellow-300">Payment ·</span>{" "}
            Your invoice is sent promptly after this request is submitted, and
            manufacturing starts once it is <strong>paid in full</strong>.
          </p>
        </div>
      </div>

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
              Request not submitted
            </span>
            <span className="mt-1 block leading-relaxed">{error}</span>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <PartSourceFields
          value={partSource}
          onChange={setPartSource}
          idPrefix="composer"
          fieldClassName={field}
          labelClassName={labelCls}
          onLocalError={setError}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className={labelCls}>Quantity <span className="text-clay-400">*</span></label>
            <input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={field} required />
          </div>
          <div>
            <label htmlFor="dateNeeded" className={labelCls}>Date needed <span className="text-clay-400">*</span></label>
            <input id="dateNeeded" type="date" min={minDate} value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)} className={field} required />
          </div>
        </div>
        <p className="-mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-cream-600">Min 3-day lead time</p>

        <div>
          <label htmlFor="phoneNumber" className={labelCls}>Phone number <span className="text-clay-400">*</span></label>
          {isAddingPhone || pastPhones.length === 0 ? (
            <div className="flex gap-2">
              <input id="phoneNumber" type="tel" value={newPhoneNumber} onChange={(e) => setNewPhoneNumber(e.target.value)} className={field} placeholder="(123) 456-7890" required />
              {pastPhones.length > 0 && (
                <button type="button" onClick={() => setIsAddingPhone(false)} className="shrink-0 border border-clay-500/25 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-cream-400 hover:text-clay-300 hover:border-clay-400 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500">
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <select id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={field} required>
                {pastPhones.map((phone) => (
                  <option key={phone.id} value={phone.number}>{phone.number}</option>
                ))}
              </select>
              <button type="button" onClick={() => setIsAddingPhone(true)} className="shrink-0 inline-flex items-center gap-1 border border-clay-500/25 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-clay-300 hover:bg-clay-500/15 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500">
                <Plus className="h-3 w-3" aria-hidden="true" /> New
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="material" className={labelCls}>Material <span className="text-clay-400">*</span></label>
          <select id="material" value={material} onChange={(e) => setMaterial(e.target.value)} className={field} required>
            {availableMaterials.length === 0 ? (
              <option value="">No materials available</option>
            ) : (
              availableMaterials.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)
            )}
          </select>
        </div>

        <PrintSettingsFields value={printSettings} onChange={setPrintSettings} idPrefix="user-ps" />

        <div>
          <label htmlFor="notes" className={labelCls}>Notes <span className="text-cream-600 normal-case tracking-normal">(color, etc. — optional)</span></label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${field} resize-none`} placeholder="Any special instructions?" />
        </div>

        <label
          htmlFor="quoteRequested"
          className={`flex items-start gap-3 rounded-md border border-clay-500/25 px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay-500 ${
            quoteLocked ? "cursor-default bg-clay-500/5" : "cursor-pointer hover:border-clay-400"
          }`}
        >
          <input
            id="quoteRequested"
            name="quoteRequested"
            type="checkbox"
            checked={quoteChecked}
            disabled={quoteLocked}
            onChange={(e) => setQuoteRequested(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-clay-500 outline-none disabled:opacity-80"
          />
          <span className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-cream-300">
              Quote {quoteLocked && <span className="text-clay-300">· always, on a described part</span>}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-cream-500">
              {quoteLocked
                ? "There is nothing to price until we have modelled your part, so this one is quoted first. You approve the price before we build anything."
                : "Price this part first. We send a quote for your approval before the invoice — manufacturing still starts once that invoice is paid."}
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !!submitBlocker}
          title={submitBlocker || undefined}
          className="group w-full inline-flex items-center justify-center gap-2 bg-clay-600 px-4 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-cream-100 hover:bg-clay-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-[0.99] shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-md"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-cream-200/40 border-t-cream-100 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit request
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </>
          )}
        </button>

        {/* Repeats the banner beside the button that was just pressed. The
            banner above is the one announced; this copy is decorative. */}
        {error && (
          <p className="flex gap-2 items-start text-sm text-red-300" aria-hidden="true">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </form>
    </Panel>
  );
}

export default function RequestForm({ onFormSubmit }: { onFormSubmit: () => void }) {
  return (
    <Suspense fallback={<div className="panel rounded-md h-96 animate-pulse" />}>
      <RequestFormContent onFormSubmit={onFormSubmit} />
    </Suspense>
  );
}
