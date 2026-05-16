"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

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
      router.push("/api/auth/signin");
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

  const openModal = (req: any) => {
    setSelectedRequest(req);
    setInvoiceInput(req.invoiceNumber || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setInvoiceInput("");
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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading admin dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
               <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-lg flex items-center justify-center font-bold shadow-sm">
                  T
               </div>
               <span className="font-bold text-xl text-gray-900 tracking-tight">Admin Console</span>
            </div>
            <div className="flex items-center gap-6">
               <Link href="/admin" className="text-sm font-bold text-indigo-600 transition-colors">
                 Requests
               </Link>
               <Link href="/admin/users" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Users
               </Link>
               <Link href="/admin/materials" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Materials
               </Link>
               <Link href="/admin/reports" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg">
                 Generate Reports
               </Link>
               <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Back to Dashboard
               </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">All System Requests</h1>
               <p className="text-gray-500 mt-1">Manage, update, and review all user submissions.</p>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by User</label>
                <input
                    type="text"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    placeholder="Name or Email"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Invoice Number</label>
                <input
                    type="text"
                    value={filterInvoice}
                    onChange={(e) => setFilterInvoice(e.target.value)}
                    placeholder="Search Invoice #"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Submission Date</label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {filterDate && (
                        <button 
                            onClick={() => setFilterDate("")}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">No requests match filters</h3>
                <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
                {(filterUser || filterInvoice || filterStatus !== "ALL" || filterDate) && (
                    <button 
                        onClick={() => {
                            setFilterUser("");
                            setFilterInvoice("");
                            setFilterStatus("ALL");
                            setFilterDate("");
                        }}
                        className="mt-4 text-indigo-600 font-bold hover:underline"
                    >
                        Reset all filters
                    </button>
                )}
            </div>
          ) : (
            <>
              {/* Mobile Card View (shown only on small screens) */}
              <div className="block lg:hidden">
                <div className="divide-y divide-gray-100">
                  {filteredRequests.map((req) => (
                    <div key={req.id} className="p-4 space-y-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">Customer</div>
                          <div className="text-sm font-bold text-gray-900">{req.user?.name || "N/A"}</div>
                          <div className="text-xs text-gray-500">{req.user?.email || "N/A"}</div>
                        </div>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value)}
                          className={`text-[10px] font-bold rounded-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 border ${
                            req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                            req.status === 'ACTIVE' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            req.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border-green-200' :
                            req.status === 'NEEDS REVIEW' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            req.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                            req.status === 'SHIPPED' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                            'bg-gray-50 text-gray-800 border-gray-200'
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
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">File</div>
                          <div className="text-sm font-semibold text-gray-900 truncate" title={req.fileName}>{req.fileName}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Invoice</div>
                          <div className="text-sm font-bold text-indigo-700">
                            {req.invoiceNumber ? `#${req.invoiceNumber}` : <span className="text-gray-300 font-normal italic text-xs">Pending</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold text-gray-900">Needed:</span> {format(new Date(req.dateNeeded), "MMM d")}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(req)}
                            className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View (hidden on mobile) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User / Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">File & Notes</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-indigo-600 uppercase tracking-tight mb-1">Customer</div>
                          <div className="text-sm font-bold text-gray-900">{req.user?.name || "N/A"}</div>
                          <div className="text-xs font-medium text-gray-500">{req.user?.email || "N/A"}</div>
                          <div className="text-xs font-medium text-gray-400">{req.phoneNumber?.number || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{req.fileName}</div>
                          <div className="flex gap-2 mt-1">
                              {req.material && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wide">{req.material}</span>}
                              {req.notes && <div className="text-xs text-gray-500 truncate max-w-[150px]" title={req.notes}>{req.notes}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{req.quantity}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">Needed: {format(new Date(req.dateNeeded), "MMM d, yyyy")}</div>
                          <div className="text-xs font-medium text-gray-500 mt-0.5">Submitted: {format(new Date(req.createdAt), "MMM d")}</div>
                        </td>
                        <td className="px-6 py-4">
                          {req.invoiceNumber ? (
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                              #{req.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                              value={req.status}
                              onChange={(e) => handleStatusChange(req.id, e.target.value)}
                              className={`text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border ${
                                req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                req.status === 'ACTIVE' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                req.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border-green-200' :
                                req.status === 'NEEDS REVIEW' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                req.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                                req.status === 'SHIPPED' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                                'bg-gray-50 text-gray-800 border-gray-200'
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
                                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View Order
                            </button>
                            <button
                              onClick={() => handleDelete(req.id)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                            >
                              Delete
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-xl leading-6 font-bold text-gray-900">
                  Ticket Details
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Close ticket details"
                  title="Close ticket details"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="px-6 py-6 sm:p-8">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Name (Company/Personal)</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{selectedRequest.user?.name}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">User Email</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{selectedRequest.user?.email}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{selectedRequest.phoneNumber?.number}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{selectedRequest.quantity}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Material</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{selectedRequest.material || "N/A"}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Date Needed</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{format(new Date(selectedRequest.dateNeeded), "MMM d, yyyy")}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Submitted On</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{format(new Date(selectedRequest.createdAt), "MMM d, yyyy h:mm a")}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">File</dt>
                        <dd className="mt-2 text-sm text-gray-900">
                           <a
                              href={`/api/download/${selectedRequest.fileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors font-semibold"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              Download {selectedRequest.fileName}
                           </a>
                        </dd>
                    </div>
                    {selectedRequest.notes && (
                      <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Notes</dt>
                          <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-100">{selectedRequest.notes}</dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                        <dd className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={invoiceInput}
                              onChange={(e) => setInvoiceInput(e.target.value)}
                              placeholder="Enter Invoice #"
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 bg-white text-black"
                            />
                            <button
                              onClick={() => handleSaveInvoice(selectedRequest.id)}
                              disabled={savingInvoice || invoiceInput === selectedRequest.invoiceNumber || (!invoiceInput && !selectedRequest.invoiceNumber)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingInvoice ? "Saving..." : "Save Invoice"}
                            </button>
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 bg-gray-50">
               <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Admin Actions</h4>
               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                   <div className="flex items-center gap-3">
                       <label htmlFor="status-select" className="text-sm font-medium text-gray-700">Update Status:</label>
                       <select
                            id="status-select"
                            value={selectedRequest.status}
                            onChange={(e) => handleStatusChange(selectedRequest.id, e.target.value)}
                            className="text-sm font-bold rounded-lg px-3 py-2 bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-black"
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
                         className="text-red-700 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm"
                       >
                         Cancel Request
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
