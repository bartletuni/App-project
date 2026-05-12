"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchRequests();
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
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel request");
      }
    } catch (err) {
      console.error(err);
    }
  };

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
               <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Back to User Dashboard
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">No requests found</h3>
                <p className="text-gray-500">There are currently no part requests in the system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User / Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">File & Notes</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{req.user.email}</div>
                        <div className="text-sm font-medium text-gray-500">{req.phoneNumber.number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{req.fileName}</div>
                        {req.notes && <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={req.notes}><span className="font-semibold text-gray-700">Notes:</span> {req.notes}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">Needed: {format(new Date(req.dateNeeded), "MMM d, yyyy")}</div>
                        <div className="text-xs font-medium text-gray-500 mt-0.5">Submitted: {format(new Date(req.createdAt), "MMM d")}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <select
                            value={req.status}
                            onChange={(e) => handleStatusChange(req.id, e.target.value)}
                            className={`text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer border ${
                              req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                              req.status === 'ACTIVE' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              req.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border-green-200' :
                              req.status === 'NEEDS REVIEW' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                              req.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                              'bg-gray-50 text-gray-800 border-gray-200'
                            }`}
                         >
                            <option value="PENDING">PENDING</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="NEEDS REVIEW">NEEDS REVIEW</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                         </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3 items-center">
                          <Link
                              href={`/admin/${req.id}`}
                              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                          >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              View Details
                          </Link>
                          {req.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancel(req.id)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                              >
                                Cancel
                              </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
