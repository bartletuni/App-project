"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import {
  DEFAULT_PRICING,
  PRICING_LIMITS,
  type PricingContent,
  type PricingItemData,
  type PricingMatrixRowData,
  type PricingSectionData,
  type PricingSettingsData,
} from "@/lib/pricing";

const inputClass =
  "w-full border border-espresso-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500";
const labelClass = "block text-xs font-semibold text-cream-500 mb-1";

const emptyItem: PricingItemData = { label: "", detail: "", price: "", note: "" };
const emptyMatrixRow: PricingMatrixRowData = {
  materialClass: "",
  gradeType: "",
  characteristics: "",
  applications: "",
};

/** Move an entry within a list, returning a new array. */
function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const settingFields: {
  key: keyof PricingSettingsData;
  label: string;
  hint?: string;
  multiline?: boolean;
}[] = [
  { key: "heroEyebrow", label: "Eyebrow label", hint: "Small monospace line above the title" },
  { key: "heroTitle", label: "Headline" },
  { key: "heroTitleAccent", label: "Headline accent", hint: "Rendered in italic clay" },
  { key: "heroIntro", label: "Intro / capabilities summary", multiline: true },
  { key: "advantageLabel", label: "Callout label" },
  { key: "advantageBody", label: "Callout body", multiline: true },
  { key: "matrixTitle", label: "Material matrix title" },
  { key: "matrixIntro", label: "Material matrix intro", multiline: true },
  { key: "contactPhone", label: "Phone" },
  { key: "contactEmail", label: "Email" },
  { key: "contactWeb", label: "Web" },
  { key: "footerNote", label: "Closing note", multiline: true },
];

export default function AdminPricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [content, setContent] = useState<PricingContent>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const applyResponse = useCallback((data: any) => {
    if (data && Array.isArray(data.sections) && data.settings) {
      setContent({
        settings: data.settings,
        sections: data.sections,
        matrix: Array.isArray(data.matrix) ? data.matrix : [],
      });
      setIsDefault(Boolean(data.isDefault));
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }
    if (status !== "authenticated") return;
    if (!(session?.user as any)?.isAdmin) {
      router.push("/dashboard");
      return;
    }

    fetch("/api/admin/pricing", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        applyResponse(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, session, router, applyResponse]);

  const updateSetting = (key: keyof PricingSettingsData, value: string) =>
    setContent((c) => ({ ...c, settings: { ...c.settings, [key]: value } }));

  const updateSection = (index: number, patch: Partial<PricingSectionData>) =>
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const updateItem = (
    sectionIndex: number,
    itemIndex: number,
    patch: Partial<PricingItemData>
  ) =>
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              items: s.items.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it)),
            }
          : s
      ),
    }));

  const updateMatrixRow = (index: number, patch: Partial<PricingMatrixRowData>) =>
    setContent((c) => ({
      ...c,
      matrix: c.matrix.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (res.ok) {
        applyResponse(data);
        setMessage({ kind: "ok", text: "Pricing page updated." });
      } else {
        setMessage({ kind: "error", text: data.error || "Failed to save pricing page." });
      }
    } catch {
      setMessage({ kind: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Restore the built-in TakomoCo catalog? Any edits saved to the pricing page will be replaced."
      )
    ) {
      return;
    }
    setResetting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pricing/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        applyResponse(data);
        setMessage({ kind: "ok", text: "Default catalog restored." });
      } else {
        setMessage({ kind: "error", text: data.error || "Failed to restore defaults." });
      }
    } catch {
      setMessage({ kind: "error", text: "Network error while restoring defaults." });
    } finally {
      setResetting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-clay-300 font-semibold animate-pulse">
        Loading pricing sheet...
      </div>
    );
  }

  return (
    <AppShell variant="admin">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="eyebrow">CONSOLE ⁄ RATES</span>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl text-cream-100">
              Pricing <span className="italic text-clay-300">sheet</span>
            </h1>
            <p className="mt-2 text-cream-400">
              Everything on the public{" "}
              <Link
                href="/pricing"
                className="text-clay-300 hover:text-clay-200 underline underline-offset-4 inline-flex items-center gap-1"
              >
                pricing page
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </Link>{" "}
              is editable here.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={handleReset}
              disabled={resetting || saving}
              className="inline-flex items-center gap-2 border border-clay-500/30 text-cream-300 hover:bg-clay-500/12 px-4 py-2.5 rounded-md font-mono text-[11px] uppercase tracking-[0.15em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              {resetting ? "Restoring…" : "Defaults"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || resetting}
              className="inline-flex items-center gap-2 bg-clay-600 hover:bg-clay-700 text-cream-100 px-4 py-2.5 rounded-md font-mono text-[11px] uppercase tracking-[0.15em] transition-all active:scale-95 shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        {isDefault && (
          <p className="mb-4 rounded-lg border border-clay-500/25 bg-clay-500/10 px-4 py-3 text-sm text-cream-300">
            Showing the built-in catalog — nothing has been saved to the database yet. Save
            to make these values editable copy.
          </p>
        )}

        {message && (
          <p
            role="status"
            className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              message.kind === "ok"
                ? "border border-green-500/30 bg-green-500/10 text-green-200"
                : "border border-red-500/30 bg-red-500/10 text-red-200"
            }`}
          >
            {message.text}
          </p>
        )}

        {/* Page copy */}
        <section className="bg-espresso-800/72 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-clay-500/18 mb-6">
          <h2 className="text-lg font-bold text-cream-200 mb-4">Page copy & contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {settingFields.map((field) => (
              <div key={field.key} className={field.multiline ? "sm:col-span-2" : ""}>
                <label htmlFor={`setting-${field.key}`} className={labelClass}>
                  {field.label}
                  {field.hint && (
                    <span className="ml-2 font-normal text-cream-600">{field.hint}</span>
                  )}
                </label>
                {field.multiline ? (
                  <textarea
                    id={`setting-${field.key}`}
                    rows={4}
                    maxLength={PRICING_LIMITS.setting}
                    value={content.settings[field.key]}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <input
                    id={`setting-${field.key}`}
                    type="text"
                    maxLength={PRICING_LIMITS.setting}
                    value={content.settings[field.key]}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Service sections */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-cream-200">Service sections</h2>
            <button
              onClick={() =>
                setContent((c) =>
                  c.sections.length >= PRICING_LIMITS.maxSections
                    ? c
                    : {
                        ...c,
                        sections: [...c.sections, { title: "", intro: "", items: [{ ...emptyItem }] }],
                      }
                )
              }
              className="inline-flex items-center gap-1.5 text-clay-300 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add section
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {content.sections.map((section, sectionIndex) => (
              <div
                key={sectionIndex}
                className="bg-espresso-800/72 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-sm border border-clay-500/18"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="font-mono text-xs tracking-[0.2em] text-clay-400 pt-2">
                    {String.fromCharCode(65 + (sectionIndex % 26))}
                  </span>
                  <div className="flex-1">
                    <label htmlFor={`section-title-${sectionIndex}`} className={labelClass}>
                      Section title
                    </label>
                    <input
                      id={`section-title-${sectionIndex}`}
                      type="text"
                      maxLength={PRICING_LIMITS.title}
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                      placeholder="e.g. 0.02mm Precision 3D Scanning"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-1 pt-6">
                    <button
                      onClick={() =>
                        setContent((c) => ({ ...c, sections: move(c.sections, sectionIndex, -1) }))
                      }
                      disabled={sectionIndex === 0}
                      className="p-2 text-cream-500 hover:text-clay-300 hover:bg-clay-500/18 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Move section ${section.title || sectionIndex + 1} up`}
                    >
                      <ArrowUp className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() =>
                        setContent((c) => ({ ...c, sections: move(c.sections, sectionIndex, 1) }))
                      }
                      disabled={sectionIndex === content.sections.length - 1}
                      className="p-2 text-cream-500 hover:text-clay-300 hover:bg-clay-500/18 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Move section ${section.title || sectionIndex + 1} down`}
                    >
                      <ArrowDown className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Remove this section and all of its lines?")) return;
                        setContent((c) => ({
                          ...c,
                          sections: c.sections.filter((_, i) => i !== sectionIndex),
                        }));
                      }}
                      className="p-2 text-cream-500 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition-all"
                      aria-label={`Delete section ${section.title || sectionIndex + 1}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor={`section-intro-${sectionIndex}`} className={labelClass}>
                    Section note (optional)
                  </label>
                  <textarea
                    id={`section-intro-${sectionIndex}`}
                    rows={2}
                    maxLength={PRICING_LIMITS.intro}
                    value={section.intro}
                    onChange={(e) => updateSection(sectionIndex, { intro: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <ul className="flex flex-col gap-3">
                  {section.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="rounded-xl border border-espresso-600 bg-espresso-900/40 p-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`item-label-${sectionIndex}-${itemIndex}`}
                            className={labelClass}
                          >
                            Line item
                          </label>
                          <input
                            id={`item-label-${sectionIndex}-${itemIndex}`}
                            type="text"
                            maxLength={PRICING_LIMITS.label}
                            value={item.label}
                            onChange={(e) =>
                              updateItem(sectionIndex, itemIndex, { label: e.target.value })
                            }
                            placeholder="e.g. Small Component Scan"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`item-price-${sectionIndex}-${itemIndex}`}
                            className={labelClass}
                          >
                            Price (free text)
                          </label>
                          <input
                            id={`item-price-${sectionIndex}-${itemIndex}`}
                            type="text"
                            maxLength={PRICING_LIMITS.price}
                            value={item.price}
                            onChange={(e) =>
                              updateItem(sectionIndex, itemIndex, { price: e.target.value })
                            }
                            placeholder="e.g. $75.00"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`item-detail-${sectionIndex}-${itemIndex}`}
                            className={labelClass}
                          >
                            Description
                          </label>
                          <input
                            id={`item-detail-${sectionIndex}-${itemIndex}`}
                            type="text"
                            maxLength={PRICING_LIMITS.detail}
                            value={item.detail}
                            onChange={(e) =>
                              updateItem(sectionIndex, itemIndex, { detail: e.target.value })
                            }
                            placeholder="e.g. Parts under 100mm."
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`item-note-${sectionIndex}-${itemIndex}`}
                            className={labelClass}
                          >
                            Price note
                          </label>
                          <input
                            id={`item-note-${sectionIndex}-${itemIndex}`}
                            type="text"
                            maxLength={PRICING_LIMITS.note}
                            value={item.note}
                            onChange={(e) =>
                              updateItem(sectionIndex, itemIndex, { note: e.target.value })
                            }
                            placeholder="e.g. flat setup rate"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setContent((c) => ({
                              ...c,
                              sections: c.sections.map((s, i) =>
                                i === sectionIndex ? { ...s, items: move(s.items, itemIndex, -1) } : s
                              ),
                            }))
                          }
                          disabled={itemIndex === 0}
                          className="p-1.5 text-cream-500 hover:text-clay-300 hover:bg-clay-500/18 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Move line ${item.label || itemIndex + 1} up`}
                        >
                          <ArrowUp className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() =>
                            setContent((c) => ({
                              ...c,
                              sections: c.sections.map((s, i) =>
                                i === sectionIndex ? { ...s, items: move(s.items, itemIndex, 1) } : s
                              ),
                            }))
                          }
                          disabled={itemIndex === section.items.length - 1}
                          className="p-1.5 text-cream-500 hover:text-clay-300 hover:bg-clay-500/18 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Move line ${item.label || itemIndex + 1} down`}
                        >
                          <ArrowDown className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() =>
                            setContent((c) => ({
                              ...c,
                              sections: c.sections.map((s, i) =>
                                i === sectionIndex
                                  ? { ...s, items: s.items.filter((_, j) => j !== itemIndex) }
                                  : s
                              ),
                            }))
                          }
                          className="p-1.5 text-cream-500 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition-all"
                          aria-label={`Delete line ${item.label || itemIndex + 1}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() =>
                    setContent((c) => ({
                      ...c,
                      sections: c.sections.map((s, i) =>
                        i === sectionIndex && s.items.length < PRICING_LIMITS.maxItemsPerSection
                          ? { ...s, items: [...s.items, { ...emptyItem }] }
                          : s
                      ),
                    }))
                  }
                  className="mt-3 inline-flex items-center gap-1.5 text-clay-300 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add line item
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Material matrix */}
        <section className="bg-espresso-800/72 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-sm border border-clay-500/18 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-cream-200">Material selection matrix</h2>
            <button
              onClick={() =>
                setContent((c) =>
                  c.matrix.length >= PRICING_LIMITS.maxMatrixRows
                    ? c
                    : { ...c, matrix: [...c.matrix, { ...emptyMatrixRow }] }
                )
              }
              className="inline-flex items-center gap-1.5 text-clay-300 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add row
            </button>
          </div>

          <ul className="flex flex-col gap-3">
            {content.matrix.map((row, index) => (
              <li key={index} className="rounded-xl border border-espresso-600 bg-espresso-900/40 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`matrix-class-${index}`} className={labelClass}>
                      Material class
                    </label>
                    <input
                      id={`matrix-class-${index}`}
                      type="text"
                      maxLength={PRICING_LIMITS.matrixCell}
                      value={row.materialClass}
                      onChange={(e) => updateMatrixRow(index, { materialClass: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`matrix-grade-${index}`} className={labelClass}>
                      Grade / type
                    </label>
                    <input
                      id={`matrix-grade-${index}`}
                      type="text"
                      maxLength={PRICING_LIMITS.matrixCell}
                      value={row.gradeType}
                      onChange={(e) => updateMatrixRow(index, { gradeType: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`matrix-characteristics-${index}`} className={labelClass}>
                      Primary characteristics
                    </label>
                    <input
                      id={`matrix-characteristics-${index}`}
                      type="text"
                      maxLength={PRICING_LIMITS.matrixCell}
                      value={row.characteristics}
                      onChange={(e) => updateMatrixRow(index, { characteristics: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`matrix-applications-${index}`} className={labelClass}>
                      Key applications
                    </label>
                    <input
                      id={`matrix-applications-${index}`}
                      type="text"
                      maxLength={PRICING_LIMITS.matrixCell}
                      value={row.applications}
                      onChange={(e) => updateMatrixRow(index, { applications: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-1">
                  <button
                    onClick={() => setContent((c) => ({ ...c, matrix: move(c.matrix, index, -1) }))}
                    disabled={index === 0}
                    className="p-1.5 text-cream-500 hover:text-clay-300 hover:bg-clay-500/18 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={`Move row ${row.materialClass || index + 1} up`}
                  >
                    <ArrowUp className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setContent((c) => ({ ...c, matrix: move(c.matrix, index, 1) }))}
                    disabled={index === content.matrix.length - 1}
                    className="p-1.5 text-cream-500 hover:text-clay-300 hover:bg-clay-500/18 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={`Move row ${row.materialClass || index + 1} down`}
                  >
                    <ArrowDown className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() =>
                      setContent((c) => ({ ...c, matrix: c.matrix.filter((_, i) => i !== index) }))
                    }
                    className="p-1.5 text-cream-500 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition-all"
                    aria-label={`Delete row ${row.materialClass || index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSave}
            disabled={saving || resetting}
            className="inline-flex items-center justify-center gap-2 bg-clay-600 hover:bg-clay-700 text-cream-100 px-6 py-3 rounded-md font-mono text-[11px] uppercase tracking-[0.15em] transition-all active:scale-95 shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 border border-clay-500/30 text-cream-300 hover:bg-clay-500/12 px-6 py-3 rounded-md font-mono text-[11px] uppercase tracking-[0.15em] transition-colors"
          >
            View public page
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
