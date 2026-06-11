"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { Loader, Search, RefreshCw, X, Download, Shield, Eye, Trash2 } from "lucide-react";

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

  const getStatusBadge = (statusName: string) => {
    const normalizedStatus = statusName.toUpperCase();
    const presets: Record<string, string> = {
      PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      ACTIVE: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      "NEEDS REVIEW": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      CANCELLED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      SHIPPED: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    };
    return presets[normalizedStatus] || "bg-slate-800 text-slate-400 border border-slate-700";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-indigo-400 font-mono text-sm tracking-wider animate-pulse">
        <Loader className="animate-spin h-8 w-8 mb-4" />
        LOADING SYSTEM METRICS DATABASE...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative z-10">
      <nav className="backdrop-blur-md bg-slate-950/70 border-b border-slate-900 sticky top-0 z-50" aria-label="Admin navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
               <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-sm border border-white/10" />
               <span className="font-bold text-xl text-white tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Admin Console</span>
            </div>
            <div className="flex items-center gap-6">
               <Link href="/admin" className="text-sm font-bold text-indigo-400 transition-colors">
                 Requests
               </Link>
               <Link href="/admin/users" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">
                 Users
               </Link>
               <Link href="/admin/materials" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">
                 Materials
               </Link>
               <Link href="/admin/add-request" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">
                 Add Request
               </Link>
               <Link href="/admin/reports" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                 Reports
               </Link>
               <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">
                 Dashboard
               </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        <div className="flex justify-between items-end mb-8 border-b border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">System Telemetry Database</h1>
              <p className="text-slate-400 mt-1 text-sm">Review, index, and process all user geometries and prints.</p>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">Filter by Client</label>
                <input
                    type="text"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    placeholder="Name or Email"
                    className="w-full border border-slate-850 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">Invoice Number</label>
                <input
                    type="text"
                    value={filterInvoice}
                    onChange={(e) => setFilterInvoice(e.target.value)}
                    placeholder="Search Invoice #"
                    className="w-full border border-slate-850 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">Print Status</label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border border-slate-850 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 focus:outline-none focus:border-indigo-500 text-white"
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">Submission Date</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full border border-slate-850 rounded-xl px-4 py-2.5 text-sm bg-slate-950/60 focus:outline-none focus:border-indigo-500 text-white"
                    />
                    {filterDate && (
                        <button 
                            onClick={() => setFilterDate("")}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors font-mono uppercase"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* System Table Grid */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-950/60 border border-slate-850 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-slate-750" />
                </div>
                <h3 className="text-base font-bold text-slate-300">No matching print records</h3>
                <p className="text-slate-500 text-sm mt-1">Adjust filters or search parameters to locate telemetry records.</p>
                {(filterUser || filterInvoice || filterStatus !== "ALL" || filterDate) && (
                    <button 
                        onClick={() => {
                            setFilterUser("");
                            setFilterInvoice("");
                            setFilterStatus("ALL");
                            setFilterDate("");
                        }}
                        className="mt-4 text-indigo-400 font-bold hover:text-indigo-300 text-sm"
                    >
                        Reset Filters
                    </button>
                )}
            </div>
          ) : (
            <>
              {/* Mobile Card View (shown only on small screens) */}
              <div className="block lg:hidden divide-y divide-slate-800/45">
                {filteredRequests.map((req) => (
                  <div key={req.id} className="p-5 space-y-4 hover:bg-slate-900/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider font-mono mb-1">Customer</div>
                        <div className="text-sm font-bold text-slate-200">{req.user?.name || "N/A"}</div>
                        <div className="text-xs text-slate-400">{req.user?.email || "N/A"}</div>
                      </div>
                      <select
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)}
                        className={`text-[10px] font-bold rounded-full px-2.5 py-1 focus:outline-none focus:border-indigo-500 border bg-slate-950 text-white cursor-pointer ${getStatusBadge(req.status)}`}
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

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-400">
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">File Name</div>
                        <div className="text-sm font-semibold text-slate-200 truncate" title={req.fileName}>{req.fileName}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice</div>
                        <div className="text-sm font-bold text-indigo-400">
                          {req.invoiceNumber ? `#${req.invoiceNumber}` : <span className="text-slate-600 font-normal italic text-xs">Unbilled</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/40">
                      <div className="text-xs text-slate-400 font-mono">
                        <span className="font-semibold text-slate-500">Needed:</span> {format(new Date(req.dateNeeded), "MMM d")}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(req)}
                          className="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (hidden on mobile) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800/80">
                  <caption className="sr-only">Admin requests database</caption>
                  <thead className="bg-slate-900/10">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">User / Contact</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">File & Parameters</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Quantity</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Dates</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Financial Log</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Status</th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider font-mono mb-1">Customer</div>
                          <div className="text-sm font-bold text-slate-200">{req.user?.name || "N/A"}</div>
                          <div className="text-xs font-mono text-slate-400 mt-0.5">{req.user?.email || "N/A"}</div>
                          <div className="text-xs font-mono text-slate-550">{req.phoneNumber?.number || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-200">{req.fileName}</div>
                          <div className="flex gap-2 mt-1.5">
                              {req.material && <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide">{req.material}</span>}
                              {req.notes && <div className="text-xs text-slate-500 truncate max-w-[150px]" title={req.notes}>{req.notes}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-200 font-mono">{req.quantity}</div>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <div className="text-sm font-semibold text-slate-200">Needed: {format(new Date(req.dateNeeded), "MMM d, yyyy")}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Sent: {format(new Date(req.createdAt), "MMM d")}</div>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          {req.invoiceNumber ? (
                            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                              #{req.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600 italic">Unbilled</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                              value={req.status}
                              onChange={(e) => handleStatusChange(req.id, e.target.value)}
                              className={`text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer border bg-slate-950 text-white ${getStatusBadge(req.status)}`}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-3 items-center">
                              <button
                                  onClick={() => openModal(req)}
                                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase text-xs font-mono"
                              >
                                  <Eye className="w-3.5 h-3.5" />
                                  Inspect
                              </button>
                              <button
                                onClick={() => handleDelete(req.id)}
                                className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase text-xs font-mono"
                              >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                              </button>
                            </div>
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

      {/* Modal - Immersive Holographic HUD */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
            <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950 flex justify-between items-center sticky top-0 z-10">
                <h3 id="modal-title" className="text-lg leading-6 font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  Telemetry Inspector
                </h3>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-white hover:bg-slate-850 p-1.5 rounded-xl transition-colors focus-visible:outline-none"
                  aria-label="Close ticket details"
                  title="Close ticket details"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="px-6 py-6 sm:p-8">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Client Name</dt>
                        <dd className="mt-1 text-sm text-slate-200 font-semibold">{selectedRequest.user?.name}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Client Email</dt>
                        <dd className="mt-1 text-sm text-slate-200 font-mono">{selectedRequest.user?.email}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Telemetry Phone</dt>
                        <dd className="mt-1 text-sm text-slate-200 font-mono">{selectedRequest.phoneNumber?.number}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Batch Quantity</dt>
                        <dd className="mt-1 text-sm text-slate-200 font-mono">{selectedRequest.quantity}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Core Material</dt>
                        <dd className="mt-1 text-sm text-indigo-400 font-bold font-mono uppercase">{selectedRequest.material || "N/A"}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Delivery Deadline</dt>
                        <dd className="mt-1 text-sm text-slate-200 font-mono">{format(new Date(selectedRequest.dateNeeded), "MMM d, yyyy")}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Enqueued On</dt>
                        <dd className="mt-1 text-sm text-slate-200 font-mono">{format(new Date(selectedRequest.createdAt), "MMM d, yyyy h:mm a")}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-2">3D CAD Model Telemetry</dt>
                        <dd className="text-sm">
                           <a
                              href={`/api/download/${selectedRequest.fileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 rounded-xl transition-colors font-bold text-xs uppercase tracking-wider font-mono shadow-sm"
                           >
                              <Download className="w-4 h-4" />
                              Download {selectedRequest.fileName}
                           </a>
                        </dd>
                    </div>
                    {selectedRequest.notes && (
                      <div className="sm:col-span-2">
                          <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">Technical Notes</dt>
                          <dd className="text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-850 font-mono leading-relaxed">{selectedRequest.notes}</dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-2">Invoice Allocation</dt>
                        <dd className="flex items-center gap-2">
                            <input
                              type="text"
                              value={invoiceInput}
                              onChange={(e) => setInvoiceInput(e.target.value)}
                              placeholder="Enter Invoice #"
                              className="border border-slate-800 rounded-xl px-3 py-2 text-sm bg-slate-950/60 focus:outline-none focus:border-indigo-500 text-white font-mono w-48"
                            />
                            <button
                              onClick={() => handleSaveInvoice(selectedRequest.id)}
                              disabled={savingInvoice || invoiceInput === selectedRequest.invoiceNumber || (!invoiceInput && !selectedRequest.invoiceNumber)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono h-[38px]"
                            >
                              {savingInvoice ? "Saving..." : "Apply Invoice"}
                            </button>
                        </dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-2">USPS Tracking Allocation</dt>
                        <dd className="flex items-center gap-2">
                            <input
                              type="text"
                              value={trackingInput}
                              onChange={(e) => setTrackingInput(e.target.value)}
                              placeholder="Enter Tracking #"
                              className="border border-slate-800 rounded-xl px-3 py-2 text-sm bg-slate-950/60 focus:outline-none focus:border-indigo-500 text-white font-mono w-48"
                            />
                            <button
                              onClick={() => handleSaveTracking(selectedRequest.id)}
                              disabled={savingTracking || trackingInput === selectedRequest.trackingNumber || (!trackingInput && !selectedRequest.trackingNumber)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono h-[38px]"
                            >
                              {savingTracking ? "Saving..." : "Apply Tracking"}
                            </button>
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="px-6 py-5 border-t border-slate-800/80 bg-slate-950/60">
               <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider font-mono">Operation Overrides</h4>
               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                   <div className="flex items-center gap-3">
                       <label htmlFor="status-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Change Status:</label>
                       <select
                            id="status-select"
                            value={selectedRequest.status}
                            onChange={(e) => handleStatusChange(selectedRequest.id, e.target.value)}
                            className="text-xs font-bold rounded-xl px-3 py-2.5 bg-slate-900 border border-slate-800 focus:outline-none focus:border-indigo-500 text-white font-mono cursor-pointer"
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
                         className="text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-4 py-2 rounded-xl transition-colors font-bold uppercase text-xs font-mono shadow-sm"
                       >
                         Override & Cancel Job
                       </button>
                   )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-indigo-400 font-mono text-sm tracking-wider animate-pulse">
        <Loader className="animate-spin h-8 w-8 mb-4" />
        INITIALIZING SYSTEM INTERFACE...
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
