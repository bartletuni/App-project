"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileStack, Clock, Loader2, CheckCircle2, FileText, ArrowUp, X, Download } from "lucide-react";

import AppShell from "@/components/AppShell";
import RequestForm from "@/components/RequestForm";
import Reveal from "@/components/ui/Reveal";
import Panel from "@/components/ui/Panel";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import StlThumbnail from "@/components/StlThumbnail";
import StlViewer from "@/components/StlViewer";
import { PrintSettingsSummary } from "@/components/PrintSettingsFields";
import { parseStoredSettings } from "@/lib/print-settings";

const statusStyle: Record<string, string> = {
  PENDING: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
  ACTIVE: "text-ember-300 border-clay-500/30 bg-clay-500/10",
  COMPLETED: "text-green-300 border-green-500/30 bg-green-500/10",
  "NEEDS REVIEW": "text-clay-200 border-clay-500/40 bg-clay-500/15",
  CANCELLED: "text-red-300 border-red-500/30 bg-red-500/10",
  SHIPPED: "text-teal-300 border-teal-500/30 bg-teal-500/10",
  "INVOICE SENT": "text-cream-300 border-cream-500/30 bg-cream-500/10",
};

function StatusChip({ status }: { status: string }) {
  const cls = statusStyle[status] || "text-cream-400 border-clay-500/20 bg-espresso-700/60";
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const isAdmin = (session?.user as any)?.isAdmin;

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (isAdmin) {
        router.push("/admin");
      } else {
        fetchRequests();
      }
    }
  }, [status, router, isAdmin]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    setCancelingId(id);
    try {
      const res = await fetch(`/api/requests/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        fetchRequests();
        setSelectedRequest((prev: any) => (prev && prev.id === id ? { ...prev, status: "CANCELLED" } : prev));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel request");
      }
    } catch (error) {
      console.error("Failed to cancel request", error);
      alert("An error occurred while canceling the request.");
    } finally {
      setCancelingId(null);
    }
  };

  const isCancelable = (createdAt: string) => {
    const diff = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60);
    return diff <= 30;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-transparent gap-4">
        <span className="h-8 w-8 rounded-full border-2 border-clay-500/30 border-t-clay-400 animate-spin" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream-500">Loading your desk…</p>
      </div>
    );
  }

  const stats = [
    { label: "Total", value: requests.length, icon: FileStack },
    { label: "Pending", value: requests.filter((r) => r.status === "PENDING").length, icon: Clock },
    { label: "Active", value: requests.filter((r) => r.status === "ACTIVE").length, icon: Loader2 },
    { label: "Done", value: requests.filter((r) => ["COMPLETED", "SHIPPED"].includes(r.status)).length, icon: CheckCircle2 },
  ];

  return (
    <AppShell variant="user">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 sm:py-12">
        <Reveal>
          <span className="eyebrow">YOUR DESK</span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-cream-100">
            Welcome, <span className="italic text-clay-300">{session?.user?.name || (session?.user as any)?.email}</span>
          </h1>
        </Reveal>

        {/* Stat strip */}
        {requests.length > 0 && (
          <Reveal delay={0.05}>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-clay-500/15 border border-clay-500/15">
              {stats.map((s) => (
                <div key={s.label} className="bg-espresso-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-3xl sm:text-4xl text-cream-100">
                      <AnimatedCounter value={s.value} />
                    </span>
                    <s.icon className="h-4 w-4 text-clay-400" aria-hidden="true" />
                  </div>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-cream-500">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        <div className="mt-10 grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Composer */}
          <Reveal direction="right" className="xl:col-span-5">
            <RequestForm onFormSubmit={fetchRequests} />
          </Reveal>

          {/* Ledger */}
          <Reveal direction="up" delay={0.1} className="xl:col-span-7">
            <div className="flex items-center gap-3 mb-4">
              <span className="eyebrow">BUILD LEDGER</span>
              <span className="hairline flex-1" />
              <span className="font-mono text-[10px] text-cream-600">{requests.length} REC</span>
            </div>

            {requests.length === 0 ? (
              <Panel className="p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-clay-400/70 mb-4" aria-hidden="true" />
                <h3 className="font-display text-xl text-cream-100">No builds on record</h3>
                <p className="mt-1 text-sm text-cream-500">Submit your first part with the composer.</p>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="mt-5 inline-flex items-center gap-2 border border-clay-500/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-clay-200 hover:bg-clay-500/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm"
                >
                  <ArrowUp className="h-3.5 w-3.5" /> Start a request
                </button>
              </Panel>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <Panel key={req.id} ticks={false} className="p-4 sm:p-5 rounded-md hover:border-clay-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(req)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-md"
                        title="Review this submission"
                      >
                        <StlThumbnail fileId={req.fileId} fileName={req.fileName} size={56} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-3.5 w-3.5 text-clay-400 shrink-0" aria-hidden="true" />
                            <h3 className="font-display text-lg text-cream-100 truncate">{req.fileName}</h3>
                          </div>
                          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-cream-500">
                            <span>QTY <span className="text-cream-200">{req.quantity}</span></span>
                            <span>INV <span className="text-clay-300">{req.invoiceNumber || "—"}</span></span>
                            <span>NEED <span className="text-cream-200">{format(new Date(req.dateNeeded), "MMM d")}</span></span>
                            {req.trackingNumber && <span>USPS <span className="text-teal-300">{req.trackingNumber}</span></span>}
                          </div>
                        </div>
                      </button>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusChip status={req.status} />
                        {req.status === "PENDING" && isCancelable(req.createdAt) && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={cancelingId === req.id}
                            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-300 hover:text-red-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded-sm"
                          >
                            {cancelingId === req.id ? (
                              <>
                                <span className="h-2.5 w-2.5 rounded-full border border-red-300/40 border-t-red-300 animate-spin" aria-hidden="true" />
                                Canceling
                              </>
                            ) : (
                              "Cancel"
                            )}
                          </button>
                        )}
                        {req.status === "PENDING" && !isCancelable(req.createdAt) && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cream-600" title="Cancellation window expired">Locked</span>
                        )}
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </div>

      {/* Submission review modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md bg-espresso-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-clay-500/15 bg-espresso-900/95 px-5 sm:px-6 py-4">
              <div className="min-w-0">
                <span className="eyebrow">SUBMISSION ⁄ REVIEW</span>
                <h3 id="review-modal-title" className="mt-1 font-display text-xl text-cream-100 truncate">
                  {selectedRequest.fileName}
                </h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusChip status={selectedRequest.status} />
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-cream-500 hover:text-cream-200 p-1.5 rounded-md hover:bg-espresso-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                  aria-label="Close submission review"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <StlViewer
                fileId={selectedRequest.fileId}
                fileName={selectedRequest.fileName}
                className="h-72 sm:h-80 w-full"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">Quantity</div>
                  <div className="text-sm text-cream-200">{selectedRequest.quantity}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">Material</div>
                  <div className="text-sm text-cream-200">{selectedRequest.material || "—"}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">Date needed</div>
                  <div className="text-sm text-cream-200">{format(new Date(selectedRequest.dateNeeded), "MMM d, yyyy")}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">Submitted</div>
                  <div className="text-sm text-cream-200">{format(new Date(selectedRequest.createdAt), "MMM d, yyyy")}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">Invoice</div>
                  <div className="text-sm text-clay-300">{selectedRequest.invoiceNumber || "Pending"}</div>
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-cream-500">Tracking</div>
                  <div className="text-sm text-teal-300">{selectedRequest.trackingNumber || "—"}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-cream-500">PRINT SETTINGS</span>
                  <span className="hairline flex-1" />
                </div>
                <PrintSettingsSummary settings={parseStoredSettings(selectedRequest.printSettings)} />
              </div>

              {selectedRequest.notes && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-cream-500">NOTES</span>
                    <span className="hairline flex-1" />
                  </div>
                  <p className="text-sm text-cream-200 whitespace-pre-wrap">{selectedRequest.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-clay-500/15">
                <a
                  href={`/api/download/${selectedRequest.fileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-clay-500/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-clay-200 hover:bg-clay-500/15 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download file
                </a>
                {selectedRequest.status === "PENDING" && isCancelable(selectedRequest.createdAt) && (
                  <button
                    onClick={() => handleCancel(selectedRequest.id)}
                    disabled={cancelingId === selectedRequest.id}
                    className="inline-flex items-center gap-2 border border-red-500/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-red-300 hover:bg-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    {cancelingId === selectedRequest.id ? "Canceling…" : "Cancel request"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
