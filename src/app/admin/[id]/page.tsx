"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

export default function AdminRequestViewPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(() => {
    fetch(`/api/requests/${params.id}`)
      .then((res) => {
         if (!res.ok) throw new Error("Failed to fetch");
         return res.json();
      })
      .then((data) => {
         setReq(data);
         setLoading(false);
      })
      .catch((err) => {
         console.error(err);
         setLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      if (!(session?.user as any)?.isAdmin) {
          router.push("/dashboard");
          return;
      }
      fetchRequest();
    }
  }, [status, router, session, fetchRequest]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/requests/${params.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchRequest();
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this request? Admins bypass the 30-minute limit.")) return;
    try {
      const res = await fetch(`/api/requests/${params.id}/cancel`, { method: "POST" });
      if (res.ok) {
        fetchRequest();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel request");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading request details...</div>;
  }

  if (!req) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-900">
           <h2 className="text-2xl font-bold mb-4">Request Not Found</h2>
           <Link href="/admin" className="text-indigo-600 hover:underline">Return to Admin Dashboard</Link>
        </div>
      );
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
               <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                 &larr; Back to Admin Dashboard
               </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-xl leading-6 font-bold text-gray-900">
                  Ticket Details
                </h3>
                <span className={`text-xs font-bold rounded-full px-3 py-1 border ${
                    req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                    req.status === 'ACTIVE' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                    req.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border-green-200' :
                    req.status === 'NEEDS REVIEW' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                    req.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                    'bg-gray-50 text-gray-800 border-gray-200'
                }`}>
                    {req.status}
                </span>
            </div>

            <div className="px-6 py-6 sm:p-8">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">User Email</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{req.user?.email}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{req.phoneNumber?.number}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{req.quantity}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Date Needed</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{format(new Date(req.dateNeeded), "MMM d, yyyy")}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Submitted On</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-semibold">{format(new Date(req.createdAt), "MMM d, yyyy h:mm a")}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">File</dt>
                        <dd className="mt-2 text-sm text-gray-900">
                           <a
                              href={`/api/download/${req.fileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors font-semibold"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              Download {req.fileName}
                           </a>
                        </dd>
                    </div>
                    {req.notes && (
                      <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Notes</dt>
                          <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-100">{req.notes}</dd>
                      </div>
                    )}
                </dl>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 bg-gray-50">
               <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Admin Actions</h4>
               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                   <div className="flex items-center gap-3">
                       <label htmlFor="status-select" className="text-sm font-medium text-gray-700">Update Status:</label>
                       <select
                            id="status-select"
                            value={req.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="text-sm font-bold rounded-lg px-3 py-2 bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                         >
                            <option value="PENDING">PENDING</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="INVOICE SENT">INVOICE SENT</option>
                       </select>
                   </div>
                   {req.status !== 'CANCELLED' && (
                       <button
                         onClick={handleCancel}
                         className="text-red-700 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm"
                       >
                         Cancel Request
                       </button>
                   )}
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}
