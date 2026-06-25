"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RequestForm from "@/components/RequestForm";
import { format } from "date-fns";
import { FileStack, Clock, Loader2, CheckCircle2 } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

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
      <div className="min-h-screen flex flex-col justify-center items-center bg-transparent">
        <svg className="animate-spin h-10 w-10 text-clay-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-cream-500 font-medium">Loading your dashboard...</p>
        <span className="sr-only">Loading your dashboard, please wait</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-cream-200 font-sans">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Reveal className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream-200 tracking-tight">
            Welcome,{" "}
            <span className="animate-gradient-text animate-gradient-x bg-gradient-to-r from-clay-400 via-ember-400 to-clay-300">
              {session?.user?.name || (session?.user as any)?.email}
            </span>
          </h1>
          <p className="text-cream-500 mt-2 text-base sm:text-lg">
            Manage your custom part requests and track their status.
          </p>
        </Reveal>

        {/* Stats summary */}
        {requests.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[
              { label: "Total", value: requests.length, icon: FileStack, color: "text-clay-300 bg-clay-500/15" },
              { label: "Pending", value: requests.filter((r) => r.status === "PENDING").length, icon: Clock, color: "text-amber-300 bg-amber-500/20" },
              { label: "Active", value: requests.filter((r) => r.status === "ACTIVE").length, icon: Loader2, color: "text-ember-300 bg-ember-400/15" },
              { label: "Completed", value: requests.filter((r) => ["COMPLETED", "SHIPPED"].includes(r.status)).length, icon: CheckCircle2, color: "text-emerald-300 bg-emerald-500/20" },
            ].map((stat, i) => (
              <Reveal key={stat.label} direction="up" delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-clay-500/25 bg-espresso-800/62 backdrop-blur-xl p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-cream-200">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm font-medium text-cream-500">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Request Form */}
          {!isAdmin && (
            <Reveal direction="right" className="xl:col-span-1">
              <RequestForm onFormSubmit={fetchRequests} />
            </Reveal>
          )}

          {/* Right Column: Past Requests */}
          <Reveal direction="up" delay={0.1} className={isAdmin ? "xl:col-span-3" : "xl:col-span-2"}>
            <div className="bg-espresso-800/72 backdrop-blur-md rounded-2xl shadow-sm border border-clay-500/18 overflow-hidden">
              <div className="px-6 py-5 border-b border-espresso-600/50 bg-espresso-800/45">
                <h2 className="text-xl font-bold text-cream-200">Recent Requests</h2>
              </div>
              
              {requests.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="bg-espresso-700 p-4 rounded-full mb-4">
                    <svg className="w-10 h-10 text-cream-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-cream-200 font-medium text-lg">No requests found</h3>
                  <p className="text-cream-500 mt-1 mb-6">You haven't submitted any part requests yet.</p>
                  {!isAdmin && (
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="bg-clay-500/12 text-clay-300 hover:bg-clay-500/25 px-4 py-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                    >
                      Start a Request
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden">
                    <div className="divide-y divide-espresso-700">
                      {requests.map((req) => (
                        <div key={req.id} className="p-4 space-y-3 hover:bg-espresso-700 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-bold text-cream-200 truncate pr-2">{req.fileName}</div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              req.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' :
                              req.status === 'ACTIVE' ? 'bg-ember-400/12 text-ember-300 border border-ember-400/30' :
                              req.status === 'COMPLETED' ? 'bg-green-500/15 text-green-300 border border-green-500/30' :
                              req.status === 'NEEDS REVIEW' ? 'bg-clay-700/12 text-clay-200 border border-clay-600/30' :
                              req.status === 'CANCELLED' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
                              req.status === 'SHIPPED' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' :
                              'bg-espresso-700 text-cream-300 border border-espresso-600'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-1 text-xs text-cream-500">
                            <div className="flex justify-between">
                              <div>Qty: <span className="font-semibold text-cream-200">{req.quantity}</span></div>
                              <div>Invoice: <span className="font-semibold text-clay-300">{req.invoiceNumber || "Pending"}</span></div>
                            </div>
                            {req.trackingNumber && (
                              <div className="flex justify-between">
                                <div></div>
                                <div>USPS Tracking: <span className="font-semibold text-teal-300">{req.trackingNumber}</span></div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-1">
                            <div className="text-[10px] text-cream-500">
                              Needed: {format(new Date(req.dateNeeded), "MMM d, yyyy")}
                            </div>
                            <div className="flex gap-2">
                              {req.status === "PENDING" && isCancelable(req.createdAt) && (
                                <button
                                  onClick={() => handleCancel(req.id)}
                                  className="text-red-300 bg-red-500/15 px-3 py-1 rounded text-[10px] font-bold"
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
                    <table className="min-w-full divide-y divide-espresso-600">
                      <caption className="sr-only">Your submitted part requests</caption>
                      <thead className="bg-espresso-700/50">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-cream-500 uppercase tracking-wider">File Name</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-cream-500 uppercase tracking-wider">Quantity</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Date Needed</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-cream-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-cream-500 uppercase tracking-wider">Invoice #</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-cream-500 uppercase tracking-wider">Submitted</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-cream-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-transparent divide-y divide-espresso-700/50">
                        {requests.map((req) => (
                          <tr key={req.id} className="hover:bg-espresso-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cream-200">
                              {req.fileName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-cream-500">
                              {req.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-cream-500">
                              {format(new Date(req.dateNeeded), "MMM d, yyyy")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                                req.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' :
                                req.status === 'ACTIVE' ? 'bg-ember-400/12 text-ember-300 border border-ember-400/30' :
                                req.status === 'COMPLETED' ? 'bg-green-500/15 text-green-300 border border-green-500/30' :
                                req.status === 'NEEDS REVIEW' ? 'bg-clay-700/12 text-clay-200 border border-clay-600/30' :
                                req.status === 'CANCELLED' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
                                req.status === 'SHIPPED' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' :
                                'bg-espresso-700 text-cream-300 border border-espresso-600'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-cream-200">
                              <div>{req.invoiceNumber ? req.invoiceNumber : <span className="text-cream-500 font-normal">Pending</span>}</div>
                              {req.trackingNumber && (
                                <div className="text-xs text-teal-300 mt-1">
                                  USPS Tracking: {req.trackingNumber}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-cream-500">
                              {format(new Date(req.createdAt), "MMM d, h:mm a")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3 items-center">
                              {isAdmin && (
                                <Link
                                  href={`/admin?id=${req.id}`}
                                  className="inline-flex items-center gap-1 text-clay-300 hover:text-clay-200 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                  View Order
                                </Link>
                              )}
                              {req.status === "PENDING" && isCancelable(req.createdAt) && (
                                <button
                                  onClick={() => handleCancel(req.id)}
                                  className="text-red-300 hover:text-red-200 bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 rounded-md transition-colors font-semibold"
                                >
                                  Cancel
                                </button>
                              )}
                              {req.status === "PENDING" && !isCancelable(req.createdAt) && (
                                <span className="text-cream-500 text-xs cursor-not-allowed bg-espresso-700 border border-espresso-700 px-2 py-1 rounded" title="Cancellation period expired">Locked</span>
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
          </Reveal>
        </div>
      </main>
    </div>
  );
}
