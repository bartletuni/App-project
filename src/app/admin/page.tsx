"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import AppShell from "@/components/AppShell";
import StlThumbnail from "@/components/StlThumbnail";
import StlViewer from "@/components/StlViewer";
import { PrintSettingsSummary } from "@/components/PrintSettingsFields";
import PartSourceSummary from "@/components/PartSourceSummary";
import { isDescriptionRequest, requestTitle } from "@/lib/part-source";
import { parseStoredSettings } from "@/lib/print-settings";
import {
  CANCELLED_STATUS,
  KIND_QUOTE,
  KIND_REQUEST,
  canConvert,
  convertability,
  isQuote,
  requestKind,
  statusHint,
  statusTone,
  statusesFor,
} from "@/lib/request-status";

/**
 * Console colours for a status, keyed by the tone the shared status table
 * gives it, so a new status never has to be added here as well.
 */
const TONE_CLASSES: Record<string, string> = {
  wait: "bg-yellow-500/15 text-yellow-200 border-yellow-500/30",
  review: "bg-clay-700/12 text-clay-200 border-clay-600/30",
  sent: "bg-cream-500/12 text-cream-200 border-cream-500/30",
  active: "bg-ember-400/12 text-ember-300 border-ember-400/30",
  done: "bg-green-500/15 text-green-200 border-green-500/30",
  ship: "bg-teal-500/15 text-teal-200 border-teal-500/30",
  bad: "bg-red-500/15 text-red-200 border-red-500/30",
  muted: "bg-espresso-700 text-cream-300 border-espresso-600",
};

function statusClasses(status: string): string {
  return TONE_CLASSES[statusTone(status)] || TONE_CLASSES.muted;
}

/** The status menu for one row — a quote and a build request differ. */
function StatusOptions({ request }: { request: any }) {
  return (
    <>
      {statusesFor(requestKind(request)).map((option) => (
        <option key={option} value={option} title={statusHint(option)}>
          {option}
        </option>
      ))}
    </>
  );
}

function AdminDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterUser, setFilterUser] = useState("");
  const [filterInvoice, setFilterInvoice] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [filterKind, setFilterKind] = useState("ALL");

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [quotedPriceInput, setQuotedPriceInput] = useState("");
  const [savingQuotedPrice, setSavingQuotedPrice] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchRequests = () => {
    fetch("/api/requests")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
           setRequests(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (!(session?.user as any)?.isAdmin) {
          router.push("/dashboard");
          return;
      }
      fetchRequests();
    }
  }, [status, router, session]);

  useEffect(() => {
    if (requests.length > 0) {
      const requestId = searchParams.get("id");
      if (requestId) {
        const req = requests.find((r) => r.id === requestId);
        if (req) {
          openModal(req);
        }
      }
    }
  }, [requests, searchParams]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "COMPLETED") {
      if (!confirm("Are you sure you want to mark this request as COMPLETED? An email notification will be sent to the customer.")) {
        return;
      }
    }
    try {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchRequests();
        if (selectedRequest && selectedRequest.id === id) {
            setSelectedRequest({ ...selectedRequest, status: newStatus });
        }
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this request? Admins bypass the 30-minute limit.")) return;
    setCancelingId(id);
    try {
      const res = await fetch(`/api/requests/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        fetchRequests();
        if (selectedRequest && selectedRequest.id === id) {
            setSelectedRequest({ ...selectedRequest, status: "CANCELLED" });
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel request");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancelingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this request? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete request");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting request");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveInvoice = async (id: string) => {
    setSavingInvoice(true);
    try {
      const res = await fetch(`/api/requests/${id}/invoice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceNumber: invoiceInput }),
      });
      if (res.ok) {
        fetchRequests();
        if (selectedRequest && selectedRequest.id === id) {
            setSelectedRequest({ ...selectedRequest, invoiceNumber: invoiceInput === "" ? null : invoiceInput });
        }
        alert("Invoice number saved successfully");
      } else {
        alert("Failed to save invoice number");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving invoice number");
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleSaveTracking = async (id: string) => {
    setSavingTracking(true);
    try {
      const res = await fetch(`/api/requests/${id}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: trackingInput }),
      });
      if (res.ok) {
        fetchRequests();
        if (selectedRequest && selectedRequest.id === id) {
            setSelectedRequest({ ...selectedRequest, trackingNumber: trackingInput === "" ? null : trackingInput });
        }
        alert("Tracking number saved successfully");
      } else {
        alert("Failed to save tracking number");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving tracking number");
    } finally {
      setSavingTracking(false);
    }
  };

  const handleSaveQuotedPrice = async (id: string) => {
    setSavingQuotedPrice(true);
    try {
      const res = await fetch(`/api/requests/${id}/quote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotedPrice: quotedPriceInput }),
      });
      if (res.ok) {
        fetchRequests();
        if (selectedRequest && selectedRequest.id === id) {
          setSelectedRequest({
            ...selectedRequest,
            quotedPrice: quotedPriceInput === "" ? null : quotedPriceInput,
          });
        }
        alert("Quoted price saved successfully");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save quoted price");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving quoted price");
    } finally {
      setSavingQuotedPrice(false);
    }
  };

  /**
   * Moves a quote onto the build queue. The price in the modal rides along, so
   * pricing it and starting it is one action. Anything already accepted is
   * converted without ceremony; a declined or expired quote asks first, since
   * that is reviving something the customer turned down.
   */
  const handleConvert = async (req: any) => {
    const blocked = convertability(req);
    if (!blocked.ok) {
      alert(blocked.reason);
      return;
    }

    const unusual = req.status === "QUOTE DECLINED" || req.status === "QUOTE EXPIRED";
    const confirmation = unusual
      ? `This quote is ${req.status}. Convert it into a build request anyway? It joins the queue as PENDING.`
      : "Convert this quote into a build request? It leaves the quote track and joins the build queue as PENDING.";
    if (!confirm(confirmation)) return;

    setConvertingId(req.id);
    try {
      const res = await fetch(`/api/requests/${req.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotedPrice: quotedPriceInput }),
      });
      if (res.ok) {
        const converted = await res.json();
        fetchRequests();
        if (selectedRequest && selectedRequest.id === req.id) {
          setSelectedRequest(converted);
          setQuotedPriceInput(converted.quotedPrice || "");
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to convert quote");
      }
    } catch (err) {
      console.error(err);
      alert("Error converting quote");
    } finally {
      setConvertingId(null);
    }
  };

  const openModal = (req: any) => {
    setSelectedRequest(req);
    setInvoiceInput(req.invoiceNumber || "");
    setTrackingInput(req.trackingNumber || "");
    setQuotedPriceInput(req.quotedPrice || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setInvoiceInput("");
    setTrackingInput("");
    setQuotedPriceInput("");
  };

  const filteredRequests = requests.filter((req) => {
    const userName = req.user?.name || "";
    const userEmail = req.user?.email || "";
    const searchTerm = filterUser.toLowerCase();

    const matchesUser = 
      !filterUser || 
      userName.toLowerCase().includes(searchTerm) || 
      userEmail.toLowerCase().includes(searchTerm);
    
    const matchesInvoice = 
      !filterInvoice || 
      (req.invoiceNumber && req.invoiceNumber.toLowerCase().includes(filterInvoice.toLowerCase()));
    
    const matchesStatus = filterStatus === "ALL" || req.status === filterStatus;

    const matchesKind = filterKind === "ALL" || requestKind(req) === filterKind;

    const matchesDate = !filterDate || format(new Date(req.createdAt), "yyyy-MM-dd") === filterDate;

    return matchesUser && matchesInvoice && matchesStatus && matchesKind && matchesDate;
  });

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-transparent flex items-center justify-center text-clay-300 font-semibold animate-pulse">Loading admin dashboard...</div>;
  }

  return (
    <AppShell variant="admin">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10 w-full">
        <div className="mb-8">
          <span className="eyebrow">CONSOLE ⁄ ORDERS</span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-cream-100">
            All system <span className="italic text-clay-300">requests</span>
          </h1>
          <p className="mt-2 text-cream-400">Manage, update, and review every user submission.</p>
        </div>

        {/* Filters */}
        <div className="bg-espresso-800/72 backdrop-blur-md rounded-2xl shadow-sm border border-clay-500/18 p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-xs font-bold text-cream-500 uppercase tracking-wider mb-2">Filter by User</label>
                <input
                    type="text"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    placeholder="Name or Email"
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-cream-500 uppercase tracking-wider mb-2">Invoice Number</label>
                <input
                    type="text"
                    value={filterInvoice}
                    onChange={(e) => setFilterInvoice(e.target.value)}
                    placeholder="Search Invoice #"
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-cream-500 uppercase tracking-wider mb-2">Type</label>
                <select
                    value={filterKind}
                    onChange={(e) => setFilterKind(e.target.value)}
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500"
                >
                    <option value="ALL">Quotes &amp; requests</option>
                    <option value={KIND_QUOTE}>Quotes only</option>
                    <option value={KIND_REQUEST}>Requests only</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-cream-500 uppercase tracking-wider mb-2">Status</label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500"
                >
                    <option value="ALL">All Statuses</option>
                    <optgroup label="Quotes">
                      {statusesFor(KIND_QUOTE).filter((o) => o !== CANCELLED_STATUS).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Requests">
                      {statusesFor(KIND_REQUEST).filter((o) => o !== CANCELLED_STATUS).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </optgroup>
                    <option value={CANCELLED_STATUS}>{CANCELLED_STATUS}</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-cream-500 uppercase tracking-wider mb-2">Submission Date</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full border border-espresso-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500"
                    />
                    {filterDate && (
                        <button 
                            onClick={() => setFilterDate("")}
                            className="bg-espresso-600 hover:bg-espresso-500 text-cream-500 px-3 py-2 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-espresso-800/72 backdrop-blur-md rounded-2xl shadow-sm border border-clay-500/18 overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-espresso-700 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-cream-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-cream-200">No requests match filters</h3>
                <p className="text-cream-500">Try adjusting your filters to find what you're looking for.</p>
                {(filterUser || filterInvoice || filterStatus !== "ALL" || filterKind !== "ALL" || filterDate) && (
                    <button 
                        onClick={() => {
                            setFilterUser("");
                            setFilterInvoice("");
                            setFilterStatus("ALL");
                            setFilterKind("ALL");
                            setFilterDate("");
                        }}
                        className="mt-4 text-clay-300 font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-lg px-2 py-1"
                    >
                        Reset all filters
                    </button>
                )}
            </div>
          ) : (
            <>
              {/* Mobile Card View (shown only on small screens) */}
              <div className="block lg:hidden">
                <div className="divide-y divide-espresso-700">
                  {filteredRequests.map((req) => (
                    <div key={req.id} className="p-4 space-y-4 hover:bg-espresso-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[10px] font-bold text-clay-300 uppercase tracking-tight">Customer</div>
                          <div className="text-sm font-bold text-cream-200">{req.user?.name || "N/A"}</div>
                          <div className="text-xs text-cream-500">{req.user?.email || "N/A"}</div>
                          {(req.isFreeSample || req.guestSubmitted) && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {req.isFreeSample && <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded uppercase tracking-wide" title="First-time customer's free PLA 2.0 sample — do not invoice">Free sample</span>}
                              {req.guestSubmitted && <span className="text-[10px] font-bold bg-clay-500/15 text-clay-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title="Came in through the public quote form — this customer has no account, so answer by phone or email">No account</span>}
                            </div>
                          )}
                          {isQuote(req) && <div className="mt-1.5"><span className="text-[10px] font-bold bg-amber-500/15 text-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title="Being priced — nothing is built until this is converted into a request">Quote</span></div>}
                          {!isQuote(req) && req.convertedAt && <div className="mt-1.5"><span className="text-[10px] font-bold bg-clay-500/15 text-clay-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title={`Converted from a quote on ${format(new Date(req.convertedAt), "MMM d, yyyy")}`}>From quote</span></div>}
                        </div>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value)}
                          title={statusHint(req.status)}
                          className={`text-[10px] font-bold rounded-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-clay-500 border ${statusClasses(req.status)}`}
                        >
                          <StatusOptions request={req} />
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <StlThumbnail fileId={req.fileId} fileName={req.fileName} size={44} />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-cream-500 uppercase tracking-tight">
                              {isDescriptionRequest(req) ? "Part (no file)" : "File"}
                            </div>
                            <div className="text-sm font-semibold text-cream-200 truncate" title={requestTitle(req)}>{requestTitle(req)}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-cream-500 uppercase tracking-tight">Invoice</div>
                          <div className="text-sm font-bold text-clay-300">
                            {req.invoiceNumber ? `#${req.invoiceNumber}` : <span className="text-cream-600 font-normal italic text-xs">Pending</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div className="text-xs text-cream-500">
                          <span className="font-semibold text-cream-200">Needed:</span> {format(new Date(req.dateNeeded), "MMM d")}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(req)}
                            className="text-clay-300 hover:text-clay-200 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                          >
                            View
                          </button>
                          {canConvert(req) && (
                            <button
                              onClick={() => { setQuotedPriceInput(req.quotedPrice || ""); handleConvert(req); }}
                              disabled={convertingId === req.id}
                              className="text-green-200 hover:text-green-100 bg-green-500/15 hover:bg-green-500/25 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                            >
                              {convertingId === req.id ? "Converting" : "To request"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(req.id)}
                            disabled={deletingId === req.id}
                            className="inline-flex items-center gap-1.5 text-red-300 hover:text-red-200 bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          >
                            {deletingId === req.id ? (
                                <>
                                  <span className="h-3 w-3 rounded-full border-2 border-red-300/40 border-t-red-300 animate-spin" />
                                  Deleting
                                </>
                            ) : (
                                "Delete"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View (hidden on mobile) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-espresso-700/50">
                  <caption className="sr-only">Admin requests table</caption>
                  <thead className="bg-espresso-700/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">User / Phone</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">File & Notes</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Quantity</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Dates</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Invoice #</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-cream-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-espresso-700/50">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-espresso-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-clay-300 uppercase tracking-tight mb-1">Customer</div>
                          <div className="text-sm font-bold text-cream-200">{req.user?.name || "N/A"}</div>
                          <div className="text-xs font-medium text-cream-500">{req.user?.email || "N/A"}</div>
                          <div className="text-xs font-medium text-cream-500">{req.phoneNumber?.number || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <StlThumbnail fileId={req.fileId} fileName={req.fileName} size={48} />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-cream-200">{requestTitle(req)}</div>
                              <div className="flex gap-2 mt-1">
                                  {req.isFreeSample && <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded uppercase tracking-wide" title="First-time customer's free PLA 2.0 sample — do not invoice">Free sample</span>}
                                  {req.guestSubmitted && <span className="text-[10px] font-bold bg-clay-500/15 text-clay-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title="Came in through the public quote form — this customer has no account, so answer by phone or email">No account</span>}
                                  {isDescriptionRequest(req) && <span className="text-[10px] font-bold bg-clay-500/15 text-clay-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title="No 3D file — model this part from the customer's description and references">Model it</span>}
                                  {isQuote(req) && <span className="text-[10px] font-bold bg-amber-500/15 text-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title="Being priced — nothing is built until this is converted into a request">Quote</span>}
                                  {!isQuote(req) && req.convertedAt && <span className="text-[10px] font-bold bg-clay-500/15 text-clay-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title={`Converted from a quote on ${format(new Date(req.convertedAt), "MMM d, yyyy")}`}>From quote</span>}
                                  {req.quotedPrice && <span className="text-[10px] font-bold bg-green-500/12 text-green-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title="Price quoted to the customer">{req.quotedPrice}</span>}
                                  {req.material && <span className="text-[10px] font-bold bg-clay-500/15 text-clay-300 px-1.5 py-0.5 rounded uppercase tracking-wide">{req.material}</span>}
                                  {req.printSettings && <span className="text-[10px] font-bold bg-teal-500/15 text-teal-300 px-1.5 py-0.5 rounded uppercase tracking-wide" title="Customer supplied custom slicer settings">Custom settings</span>}
                                  {req.notes && <div className="text-xs text-cream-500 truncate max-w-[150px]" title={req.notes}>{req.notes}</div>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-cream-200">{req.quantity}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-cream-200">Needed: {format(new Date(req.dateNeeded), "MMM d, yyyy")}</div>
                          <div className="text-xs font-medium text-cream-500 mt-0.5">Submitted: {format(new Date(req.createdAt), "MMM d")}</div>
                        </td>
                        <td className="px-6 py-4">
                          {req.invoiceNumber ? (
                            <span className="text-sm font-bold text-clay-300 bg-clay-500/12 px-2 py-1 rounded border border-clay-500/25">
                              #{req.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-cream-500 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                              value={req.status}
                              onChange={(e) => handleStatusChange(req.id, e.target.value)}
                              title={statusHint(req.status)}
                              className={`text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 cursor-pointer border ${statusClasses(req.status)}`}
                          >
                              <StatusOptions request={req} />
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3 items-center">
                            <button
                                onClick={() => openModal(req)}
                                className="inline-flex items-center gap-1.5 text-clay-300 hover:text-clay-200 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg transition-colors font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                {isQuote(req) ? "View Quote" : "View Order"}
                            </button>
                            {canConvert(req) && (
                              <button
                                onClick={() => { setQuotedPriceInput(req.quotedPrice || ""); handleConvert(req); }}
                                disabled={convertingId === req.id}
                                title="Move this quote onto the build queue"
                                className="inline-flex items-center gap-1.5 text-green-200 hover:text-green-100 bg-green-500/15 hover:bg-green-500/25 px-3 py-1.5 rounded-lg transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                              >
                                {convertingId === req.id ? (
                                  <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-green-200/40 border-t-green-200 animate-spin" />
                                    Converting
                                  </>
                                ) : (
                                  "Convert"
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(req.id)}
                              disabled={deletingId === req.id}
                              className="inline-flex items-center gap-1.5 text-red-300 hover:text-red-200 bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 rounded-lg transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            >
                              {deletingId === req.id ? (
                                  <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-red-300/40 border-t-red-300 animate-spin" />
                                    Deleting
                                  </>
                              ) : (
                                  "Delete"
                              )}
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-espresso-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-clay-500/20 overflow-hidden w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-espresso-600/50 bg-espresso-800/45 flex justify-between items-center sticky top-0 z-10">
                <h3 id="modal-title" className="text-xl leading-6 font-bold text-cream-200">
                  {isQuote(selectedRequest) ? "Quote Details" : "Ticket Details"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-cream-500 hover:text-cream-400 hover:bg-espresso-600 p-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                  aria-label="Close ticket details"
                  title="Close ticket details"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="px-6 py-6 sm:p-8">
                <div className="mb-8">
                    {isDescriptionRequest(selectedRequest) ? (
                      <>
                        <div className="text-sm font-medium text-cream-500 mb-2">Customer Submission</div>
                        <PartSourceSummary request={selectedRequest} />
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium text-cream-500 mb-2">3D Preview</div>
                        <StlViewer
                            fileId={selectedRequest.fileId}
                            fileName={selectedRequest.fileName}
                            className="h-72 w-full"
                        />
                      </>
                    )}
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">Name (Company/Personal)</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedRequest.user?.name}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">User Email</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedRequest.user?.email}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">Phone Number</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedRequest.phoneNumber?.number}</dd>
                        {/* A guest has no desk to watch, so the callback is the
                            reply — the console is the only place that says so. */}
                        {selectedRequest.guestSubmitted && (
                          <dd className="mt-1 text-xs text-clay-300">
                            No account — answer by phone or email.
                          </dd>
                        )}
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">Quantity</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedRequest.quantity}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">Material</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedRequest.material || "N/A"}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">Type</dt>
                        <dd className={`mt-1 text-sm font-semibold ${isQuote(selectedRequest) ? "text-amber-200" : "text-cream-200"}`}>
                          {isQuote(selectedRequest)
                            ? "Quote — price before build"
                            : selectedRequest.convertedAt
                              ? `Request — converted from a quote ${format(new Date(selectedRequest.convertedAt), "MMM d, yyyy")}`
                              : selectedRequest.quoteRequested
                                ? "Request — a quote was asked for"
                                : "Request"}
                        </dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">Date Needed</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{format(new Date(selectedRequest.dateNeeded), "MMM d, yyyy")}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-cream-500">Submitted On</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{format(new Date(selectedRequest.createdAt), "MMM d, yyyy h:mm a")}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-cream-500">File</dt>
                        <dd className="mt-2 text-sm text-cream-200">
                           {selectedRequest.fileId ? (
                             <a
                                href={`/api/download/${selectedRequest.fileId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-clay-300 hover:text-clay-200 bg-clay-500/12 hover:bg-clay-500/25 px-4 py-2 rounded-lg transition-colors font-semibold"
                             >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                Download {selectedRequest.fileName}
                             </a>
                           ) : (
                             <span className="text-cream-500 italic">
                               No 3D file — model from the description and references above.
                             </span>
                           )}
                        </dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-cream-500">Print Settings</dt>
                        <dd className="mt-2 text-sm text-cream-200 bg-espresso-700/60 p-4 rounded-lg border border-espresso-600/50">
                            <PrintSettingsSummary settings={parseStoredSettings(selectedRequest.printSettings)} />
                        </dd>
                    </div>
                    {selectedRequest.notes && (
                      <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-cream-500">Notes</dt>
                          <dd className="mt-1 text-sm text-cream-200 bg-espresso-700 p-4 rounded-lg border border-espresso-700">{selectedRequest.notes}</dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-cream-500">Quoted Price</dt>
                        <dd className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={quotedPriceInput}
                              onChange={(e) => setQuotedPriceInput(e.target.value)}
                              placeholder="e.g. $142.50"
                              className="border border-espresso-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500 w-48 bg-espresso-800 text-black"
                            />
                            <button
                              onClick={() => handleSaveQuotedPrice(selectedRequest.id)}
                              disabled={savingQuotedPrice || quotedPriceInput === (selectedRequest.quotedPrice || "")}
                              className="bg-clay-600 hover:bg-clay-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingQuotedPrice ? "Saving..." : "Save Price"}
                            </button>
                        </dd>
                        <dd className="mt-1 text-xs text-cream-500">
                          What was quoted to the customer. Kept on the record after conversion.
                        </dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-cream-500">Invoice Number</dt>
                        <dd className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={invoiceInput}
                              onChange={(e) => setInvoiceInput(e.target.value)}
                              placeholder="Enter Invoice #"
                              className="border border-espresso-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500 w-48 bg-espresso-800 text-black"
                            />
                            <button
                              onClick={() => handleSaveInvoice(selectedRequest.id)}
                              disabled={savingInvoice || invoiceInput === selectedRequest.invoiceNumber || (!invoiceInput && !selectedRequest.invoiceNumber)}
                              className="bg-clay-600 hover:bg-clay-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingInvoice ? "Saving..." : "Save Invoice"}
                            </button>
                        </dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-cream-500">USPS Tracking Number</dt>
                        <dd className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={trackingInput}
                              onChange={(e) => setTrackingInput(e.target.value)}
                              placeholder="Enter Tracking #"
                              className="border border-espresso-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500 w-48 bg-espresso-800 text-black"
                            />
                            <button
                              onClick={() => handleSaveTracking(selectedRequest.id)}
                              disabled={savingTracking || trackingInput === selectedRequest.trackingNumber || (!trackingInput && !selectedRequest.trackingNumber)}
                              className="bg-clay-600 hover:bg-clay-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingTracking ? "Saving..." : "Save Tracking"}
                            </button>
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="px-6 py-5 border-t border-espresso-600/50 bg-espresso-800/45">
               <h4 className="text-sm font-bold text-cream-200 mb-4 uppercase tracking-wider">Admin Actions</h4>
               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                   <div className="flex items-center gap-3">
                       <label htmlFor="status-select" className="text-sm font-medium text-cream-300">Update Status:</label>
                       <select
                            id="status-select"
                            value={selectedRequest.status}
                            onChange={(e) => handleStatusChange(selectedRequest.id, e.target.value)}
                            title={statusHint(selectedRequest.status)}
                            className="text-sm font-bold rounded-lg px-3 py-2 bg-espresso-800 border border-espresso-500 focus:outline-none focus:ring-2 focus:ring-clay-500 cursor-pointer text-black"
                         >
                            <StatusOptions request={selectedRequest} />
                       </select>
                   </div>
                   {canConvert(selectedRequest) && (
                       <button
                         onClick={() => handleConvert(selectedRequest)}
                         disabled={convertingId === selectedRequest.id}
                         title="Move this quote onto the build queue as PENDING"
                         className="inline-flex items-center gap-1.5 text-green-200 bg-green-500/18 hover:bg-green-500/30 px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                       >
                         {convertingId === selectedRequest.id ? (
                           <>
                             <span className="h-3.5 w-3.5 rounded-full border-2 border-green-200/40 border-t-green-200 animate-spin" />
                             Converting
                           </>
                         ) : (
                           "Convert to request"
                         )}
                       </button>
                   )}
                   {selectedRequest.status !== 'CANCELLED' && (
                       <button
                         onClick={() => handleCancel(selectedRequest.id)}
                         disabled={cancelingId === selectedRequest.id}
                         className="inline-flex items-center gap-1.5 text-red-300 bg-red-500/18 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                       >
                         {cancelingId === selectedRequest.id ? (
                           <>
                             <span className="h-3.5 w-3.5 rounded-full border-2 border-red-300/40 border-t-red-300 animate-spin" />
                             Canceling
                           </>
                         ) : (
                           isQuote(selectedRequest) ? "Cancel Quote" : "Cancel Request"
                         )}
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

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent flex items-center justify-center text-clay-300 font-semibold animate-pulse">Loading dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
