"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RequestForm from "@/components/RequestForm";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      router.push("/");
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

    try {
      const res = await fetch(`/api/requests/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel request");
      }
    } catch (error) {
      console.error("Failed to cancel request", error);
      alert("An error occurred while canceling the request.");
    }
  };

  const isCancelable = (createdAt: string) => {
    const diff = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60);
    return diff <= 30;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome, {session?.user?.name || (session?.user as any)?.email}</h1>
          <p className="text-gray-500 mt-2 text-lg">Manage your custom part requests and track their status.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Request Form */}
          {!isAdmin && (
            <div className="xl:col-span-1">
              <RequestForm onFormSubmit={fetchRequests} />
            </div>
          )}

          {/* Right Column: Past Requests */}
          <div className={isAdmin ? "xl:col-span-3" : "xl:col-span-2"}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-white">
                <h2 className="text-xl font-bold text-gray-900">Recent Requests</h2>
              </div>
              
              {requests.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="bg-gray-50 p-4 rounded-full mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-gray-900 font-medium text-lg">No requests found</h3>
                  <p className="text-gray-500 mt-1">You haven't submitted any part requests yet.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden">
                    <div className="divide-y divide-gray-100">
                      {requests.map((req) => (
                        <div key={req.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-bold text-gray-900 truncate pr-2">{req.fileName}</div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                              req.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              req.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border border-green-200' :
                              req.status === 'NEEDS REVIEW' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              req.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
                              req.status === 'SHIPPED' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                              'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-1 text-xs text-gray-500">
                            <div className="flex justify-between">
                              <div>Qty: <span className="font-semibold text-gray-900">{req.quantity}</span></div>
                              <div>Invoice: <span className="font-semibold text-indigo-600">{req.invoiceNumber || "Pending"}</span></div>
                            </div>
                            {req.trackingNumber && (
                              <div className="flex justify-between">
                                <div></div>
                                <div>USPS Tracking: <span className="font-semibold text-teal-600">{req.trackingNumber}</span></div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-1">
                            <div className="text-[10px] text-gray-400">
                              Needed: {format(new Date(req.dateNeeded), "MMM d, yyyy")}
                            </div>
                            <div className="flex gap-2">
                              {req.status === "PENDING" && isCancelable(req.createdAt) && (
                                <button
                                  onClick={() => handleCancel(req.id)}
                                  className="text-red-600 bg-red-50 px-3 py-1 rounded text-[10px] font-bold"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">File Name</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Needed</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {requests.map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {req.fileName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {req.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(req.dateNeeded), "MMM d, yyyy")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                                req.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                req.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                req.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border border-green-200' :
                                req.status === 'NEEDS REVIEW' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                req.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-200' :
                                req.status === 'SHIPPED' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                                'bg-gray-50 text-gray-700 border border-gray-200'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              <div>{req.invoiceNumber ? req.invoiceNumber : <span className="text-gray-400 font-normal">Pending</span>}</div>
                              {req.trackingNumber && (
                                <div className="text-xs text-teal-600 mt-1">
                                  USPS Tracking: {req.trackingNumber}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(req.createdAt), "MMM d, h:mm a")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3 items-center">
                              {isAdmin && (
                                <Link
                                  href={`/admin?id=${req.id}`}
                                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                  View Order
                                </Link>
                              )}
                              {req.status === "PENDING" && isCancelable(req.createdAt) && (
                                <button
                                  onClick={() => handleCancel(req.id)}
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-semibold"
                                >
                                  Cancel
                                </button>
                              )}
                              {req.status === "PENDING" && !isCancelable(req.createdAt) && (
                                <span className="text-gray-400 text-xs cursor-not-allowed bg-gray-50 border border-gray-100 px-2 py-1 rounded" title="Cancellation period expired">Locked</span>
                              )}
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
        </div>
      </main>
    </div>
  );
}
