"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { AlertTriangle, UploadCloud, Plus, ArrowRight } from "lucide-react";
import Panel from "@/components/ui/Panel";

const field =
  "w-full border border-clay-500/25 px-4 py-2.5 text-cream-100 placeholder:text-cream-600 focus:border-clay-400 focus:ring-1 focus:ring-clay-500/40 outline-none transition rounded-md";
const labelCls =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-cream-500 mb-2";

function RequestFormContent({ onFormSubmit }: { onFormSubmit: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [material, setMaterial] = useState("");
  const [availableMaterials, setAvailableMaterials] = useState<{ id: string; name: string }[]>([]);
  const [dateNeeded, setDateNeeded] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [pastPhones, setPastPhones] = useState<{ id: string; number: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const initialMaterial = searchParams.get("material");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!file) {
      setError("Please select an STL or ZIP file.");
      setLoading(false);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("File size exceeds the 20MB limit.");
      setLoading(false);
      return;
    }

    const finalPhone = (isAddingPhone || pastPhones.length === 0) ? newPhoneNumber : phoneNumber;
    if (!finalPhone) {
      setError("Please provide a phone number.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quantity", quantity);
    formData.append("material", material);
    formData.append("notes", notes);
    formData.append("dateNeeded", dateNeeded);
    formData.append("phoneNumber", finalPhone);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request.");
      }

      setFile(null);
      setNotes("");
      if (availableMaterials.length > 0) setMaterial(availableMaterials[0].name);
      setQuantity("1");
      setDateNeeded("");
      setNewPhoneNumber("");
      setIsAddingPhone(false);
      onFormSubmit();
    } catch (err: any) {
      setError(err.message);
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

      <div className="mb-6 flex gap-3 border-l-2 border-yellow-500/50 bg-yellow-500/10 px-4 py-3" role="alert">
        <AlertTriangle className="h-4 w-4 text-yellow-300 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs text-yellow-200/90 leading-relaxed">
          <span className="font-mono uppercase tracking-[0.1em] text-yellow-300">Policy ·</span>{" "}
          Orders can be cancelled within <strong>30 minutes</strong> of submission.
        </p>
      </div>

      {error && (
        <div className="mb-6 border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fileUpload" className={labelCls}>
            STL / ZIP file <span className="text-clay-400">*</span> <span className="text-cream-600 normal-case tracking-normal">(max 20MB)</span>
          </label>
          <input id="fileUpload" type="file" accept=".stl,.zip" onChange={(e) => setFile(e.target.files?.[0] || null)} className="sr-only peer" required />
          <label htmlFor="fileUpload" className="flex cursor-pointer items-center gap-3 border border-dashed border-clay-500/30 px-4 py-3 rounded-md hover:border-clay-400 hover:bg-clay-500/5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-clay-500">
            <UploadCloud className="h-5 w-5 text-clay-400 shrink-0" aria-hidden="true" />
            <span className="truncate text-sm text-cream-300">{file ? file.name : "Choose a file to upload"}</span>
          </label>
        </div>

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
                <Plus className="h-3 w-3" /> New
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

        <div>
          <label htmlFor="notes" className={labelCls}>Notes <span className="text-cream-600 normal-case tracking-normal">(color, etc. — optional)</span></label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${field} resize-none`} placeholder="Any special instructions?" />
        </div>

        <button
          type="submit"
          disabled={loading}
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
