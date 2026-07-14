"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import AppShell from "@/components/AppShell";
import StlThumbnail from "@/components/StlThumbnail";
import StlViewer from "@/components/StlViewer";
import { PrintSettingsSummary } from "@/components/PrintSettingsFields";
import { parseStoredSettings } from "@/lib/print-settings";

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

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const openModal = (req: any) => {
    setSelectedRequest(req);
    setInvoiceInput(req.invoiceNumber || "");
    setTrackingInput(req.trackingNumber || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setInvoiceInput("");
    setTrackingInput("");
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
    
    const matchesDate = !filterDate || format(new Date(req.createdAt), "yyyy-MM-dd") === filterDate;

    return matchesUser && matchesInvoice && matchesStatus && matchesDate;
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
        <div className="bg-espresso-800/72 backdrop-blur-md rounded-2xl shadow-sm border border-clay-500/18 p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
                <label className="block text-xs font-bold text-cream-500 uppercase tracking-wider mb-2">Status</label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">PENDING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="INVOICE SENT">INVOICE SENT</option>
                    <option value="SHIPPED">SHIPPED</option>
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
                {(filterUser || filterInvoice || filterStatus !== "ALL" || filterDate) && (
                    <button 
                        onClick={() => {
                            setFilterUser("");
                            setFilterInvoice("");
                            setFilterStatus("ALL");
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
                        </div>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value)}
                          className={`text-[10px] font-bold rounded-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-clay-500 border ${
                            req.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30' :
                            req.status === 'ACTIVE' ? 'bg-ember-400/12 text-ember-300 border-ember-400/30' :
                            req.status === 'COMPLETED' ? 'bg-green-500/15 text-green-200 border-green-500/30' :
                            req.status === 'NEEDS REVIEW' ? 'bg-clay-700/12 text-clay-200 border-clay-600/30' :
                            req.status === 'CANCELLED' ? 'bg-red-500/15 text-red-200 border-red-500/30' :
                            req.status === 'SHIPPED' ? 'bg-teal-500/15 text-teal-200 border-teal-500/30' :
                            'bg-espresso-700 text-cream-300 border-espresso-600'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="INVOICE SENT">INVOICE SENT</option>
                          <option value="SHIPPED">SHIPPED</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <StlThumbnail fileId={req.fileId} fileName={req.fileName} size={44} />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-cream-500 uppercase tracking-tight">File</div>
                            <div className="text-sm font-semibold text-cream-200 truncate" title={req.fileName}>{req.fileName}</div>
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
                              <div className="text-sm font-bold text-cream-200">{req.fileName}</div>
                              <div className="flex gap-2 mt-1">
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
                              className={`text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 cursor-pointer border ${
                                req.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30' :
                                req.status === 'ACTIVE' ? 'bg-ember-400/12 text-ember-300 border-ember-400/30' :
                                req.status === 'COMPLETED' ? 'bg-green-500/15 text-green-200 border-green-500/30' :
                                req.status === 'NEEDS REVIEW' ? 'bg-clay-700/12 text-clay-200 border-clay-600/30' :
                                req.status === 'CANCELLED' ? 'bg-red-500/15 text-red-200 border-red-500/30' :
                                req.status === 'SHIPPED' ? 'bg-teal-500/15 text-teal-200 border-teal-500/30' :
                                'bg-espresso-700 text-cream-300 border-espresso-600'
                              }`}
                          >
                              <option value="PENDING">PENDING</option>
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                              <option value="INVOICE SENT">INVOICE SENT</option>
                              <option value="SHIPPED">SHIPPED</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3 items-center">
                            <button
                                onClick={() => openModal(req)}
                                className="inline-flex items-center gap-1.5 text-clay-300 hover:text-clay-200 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg transition-colors font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View Order
                            </button>
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
                  Ticket Details
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
                    <div className="text-sm font-medium text-cream-500 mb-2">3D Preview</div>
                    <StlViewer
                        fileId={selectedRequest.fileId}
                        fileName={selectedRequest.fileName}
                        className="h-72 w-full"
                    />
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
                           <a
                              href={`/api/download/${selectedRequest.fileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-clay-300 hover:text-clay-200 bg-clay-500/12 hover:bg-clay-500/25 px-4 py-2 rounded-lg transition-colors font-semibold"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              Download {selectedRequest.fileName}
                           </a>
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
                            className="text-sm font-bold rounded-lg px-3 py-2 bg-espresso-800 border border-espresso-500 focus:outline-none focus:ring-2 focus:ring-clay-500 cursor-pointer text-black"
                         >
                            <option value="PENDING">PENDING</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="INVOICE SENT">INVOICE SENT</option>
                            <option value="SHIPPED">SHIPPED</option>
                       </select>
                   </div>
                   {selectedRequest.status !== 'CANCELLED' && (
                       <button
                         onClick={() => handleCancel(selectedRequest.id)}
                         className="text-red-300 bg-red-500/18 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm"
                       >
                         Cancel Request
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
