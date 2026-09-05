"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { buildReportPdf, reportFileName } from "@/lib/report-pdf";

export default function GenerateReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      if (!(session?.user as any)?.isAdmin) {
          router.push("/dashboard");
      }
    }
  }, [status, router, session]);

  const handleGeneratePDF = async () => {
    if (!startDate || !endDate) {
      alert("Please select both a start date and an end date.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Start Date must be before End Date.");
      return;
    }

    setLoading(true);

    try {
      // Fetch requests already filtered by date range on the backend
      const res = await fetch(`/api/requests?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      const filteredRequests = await res.json();

      if (filteredRequests.length === 0) {
        alert("No requests found within the selected date range.");
        setLoading(false);
        return;
      }

      // Correct for timezone offset when parsing YYYY-MM-DD strings for formatting
      const startObj = new Date(`${startDate}T00:00:00`);
      const endObj = new Date(`${endDate}T23:59:59.999`);

      const doc = buildReportPdf({
        requests: filteredRequests,
        start: startObj,
        end: endObj,
      });

      doc.save(reportFileName(startObj, endObj));

    } catch (err) {
      console.error(err);
      alert("An error occurred while generating the report.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-transparent flex items-center justify-center text-clay-300 font-semibold animate-pulse">Loading...</div>;
  }

  return (
    <AppShell variant="admin">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 w-full">
        <div className="mb-8">
          <span className="eyebrow">CONSOLE ⁄ REPORTS</span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-cream-100">Generate <span className="italic text-clay-300">reports</span></h1>
        </div>
        <div className="panel rounded-md overflow-hidden">
            <div className="px-6 py-5 border-b border-espresso-600/50 bg-espresso-800/45">
                <h3 className="font-display text-xl text-cream-100">
                  Export to PDF
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-cream-500">
                  Export request history into a downloadable PDF document.
                </p>
            </div>

            <div className="px-6 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-cream-300 mb-2">Start Date</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-espresso-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-clay-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-cream-300 mb-2">End Date</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-espresso-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-clay-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleGeneratePDF}
                        disabled={loading || !startDate || !endDate}
                        className="bg-clay-600 hover:bg-clay-700 text-white font-bold py-3 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                             <span className="flex items-center gap-2">
                               <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                               Generating...
                             </span>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              Export PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </AppShell>
  );
}
