"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RequestForm from "@/components/RequestForm";
import { format } from "date-fns";
import { LayoutDashboard, FileCode, Check, Ban, Loader, ArrowRight, Shield } from "lucide-react";

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

  const getStatusBadge = (statusName: string) => {
    const normalizedStatus = statusName.toUpperCase();
    const presets: Record<string, string> = {
      PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]",
      ACTIVE: "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]",
      COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]",
      "NEEDS REVIEW": "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      CANCELLED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      SHIPPED: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]",
    };
    return presets[normalizedStatus] || "bg-slate-800 text-slate-400 border border-slate-700";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-slate-100">
        <Loader className="animate-spin h-10 w-10 text-indigo-400 mb-4" />
        <p className="text-slate-400 font-mono text-sm tracking-wider">RETRIEVING telemetry...</p>
        <span className="sr-only">Loading your dashboard, please wait</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Telemetry Console</h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base">Welcome, <span className="text-indigo-400 font-semibold">{session?.user?.name || (session?.user as any)?.email}</span>. Oversee your additive manufacturing pipeline.</p>
          </div>
          <Link 
            href="/materials" 
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 px-4 py-2.5 rounded-xl transition-all"
          >
            Material Specifications
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-900/20 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  Active Telemetry & Request History
                </h2>
                <span className="text-xs text-slate-500 font-mono">{requests.length} Jobs Total</span>
              </div>
              
              {requests.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="bg-slate-950/60 p-5 rounded-2xl mb-4 border border-slate-800">
                    <FileCode className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-slate-300 font-medium text-base">No active printing jobs</h3>
                  <p className="text-slate-500 text-sm mt-1">Submit your STL or ZIP design telemetry to launch a print job.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden divide-y divide-slate-800/80">
                    {requests.map((req) => (
                      <div key={req.id} className="p-5 space-y-4 hover:bg-slate-900/20 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="text-sm font-bold text-slate-200 truncate pr-2" title={req.fileName}>{req.fileName}</div>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider font-mono ${getStatusBadge(req.status)}`}>
                            {req.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 font-mono">
                          <div>
                            <span className="text-slate-600 uppercase text-[9px] block">QTY</span>
                            <span className="font-semibold text-slate-200">{req.quantity}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 uppercase text-[9px] block">Invoice #</span>
                            <span className="font-semibold text-indigo-400">{req.invoiceNumber || "Pending"}</span>
                          </div>
                        </div>

                        {req.trackingNumber && (
                          <div className="text-xs bg-cyan-950/10 border border-cyan-500/10 p-2.5 rounded-lg text-cyan-400 font-mono flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-cyan-500/70">Tracking:</span>
                            <span className="font-bold">{req.trackingNumber}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/40">
                          <div className="text-[10px] text-slate-500 font-mono">
                            DUE: {format(new Date(req.dateNeeded), "MMM d, yyyy")}
                          </div>
                          <div className="flex gap-2">
                            {req.status === "PENDING" && isCancelable(req.createdAt) && (
                              <button
                                onClick={() => handleCancel(req.id)}
                                className="text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-800/80">
                      <caption className="sr-only">Your submitted print requests</caption>
                      <thead className="bg-slate-900/10">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Design Telemetry</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Qty</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Date Needed</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Status</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Financials & Logistics</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Submitted</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {requests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-200">
                              <div className="truncate max-w-[180px]" title={req.fileName}>{req.fileName}</div>
                              {req.material && <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">{req.material}</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                              {req.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                              {format(new Date(req.dateNeeded), "MMM d, yyyy")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full uppercase tracking-wider font-mono ${getStatusBadge(req.status)}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="font-semibold text-slate-200 font-mono">
                                {req.invoiceNumber ? `#${req.invoiceNumber}` : <span className="text-slate-500 font-normal italic text-xs">Uninvoiced</span>}
                              </div>
                              {req.trackingNumber && (
                                <div className="text-xs text-cyan-400 mt-1 font-mono">
                                  USPS: {req.trackingNumber}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                              {format(new Date(req.createdAt), "MMM d, h:mm a")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end items-center gap-3">
                                {isAdmin && (
                                  <Link
                                    href={`/admin?id=${req.id}`}
                                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase text-xs font-mono"
                                  >
                                    View
                                  </Link>
                                )}
                                {req.status === "PENDING" && isCancelable(req.createdAt) && (
                                  <button
                                    onClick={() => handleCancel(req.id)}
                                    className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase text-xs font-mono"
                                  >
                                    Cancel
                                  </button>
                                )}
                                {req.status === "PENDING" && !isCancelable(req.createdAt) && (
                                  <span className="text-slate-500 text-xs cursor-not-allowed bg-slate-950/60 border border-slate-900 px-2.5 py-1 rounded font-mono uppercase tracking-wider" title="Cancellation period expired">
                                    Locked
                                  </span>
                                )}
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
        </div>
      </main>
    </div>
  );
}
