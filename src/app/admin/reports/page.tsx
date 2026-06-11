"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

      // Generate PDF
      // Correct for timezone offset when parsing YYYY-MM-DD strings for formatting
      const startObj = new Date(`${startDate}T00:00:00`);
      const endObj = new Date(`${endDate}T23:59:59.999`);

      // Generate PDF
      const doc = new jsPDF("landscape");

      doc.setFontSize(18);
      doc.text("TakomoCo Request History Report", 14, 22);

      doc.setFontSize(11);
      doc.text(`Date Range: ${format(startObj, "MMM d, yyyy")} - ${format(endObj, "MMM d, yyyy")}`, 14, 30);
      doc.text(`Generated On: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 14, 36);

      const tableColumn = ["Date Submitted", "Customer Name", "User Email", "Phone", "File Name", "Material", "Quantity", "Status", "Invoice #", "Date Needed"];
      const tableRows: any[] = [];

      filteredRequests.forEach((req: any) => {
        const rowData = [
          format(new Date(req.createdAt), "MM/dd/yyyy"),
          req.user?.name || "N/A",
          req.user?.email || "N/A",
          req.phoneNumber?.number || "N/A",
          req.fileName,
          req.material || "N/A",
          req.quantity.toString(),
          req.status,
          req.invoiceNumber || "N/A",
          format(new Date(req.dateNeeded), "MM/dd/yyyy")
        ];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        styles: { fontSize: 9 }
      });

      doc.save(`TakomoCo_Report_${format(startObj, "yyyyMMdd")}_${format(endObj, "yyyyMMdd")}.pdf`);

    } catch (err) {
      console.error(err);
      alert("An error occurred while generating the report.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-transparent flex items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <nav className="bg-white/60 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50" aria-label="Admin navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
               <Image src="/logo.png" alt="TakomoCo Logo" width={32} height={32} className="rounded-lg shadow-sm" />
               <span className="font-bold text-xl text-gray-900 tracking-tight">Admin Console</span>
            </div>
            <div className="flex items-center gap-6">
               <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Requests
               </Link>
               <Link href="/admin/users" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Users
               </Link>
               <Link href="/admin/materials" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Materials
               </Link>
               <Link href="/admin/add-request" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Add Request
               </Link>
               <Link href="/admin/reports" className="text-sm font-bold text-indigo-600 transition-colors">
                 Reports
               </Link>
               <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Back to Dashboard
               </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200/50 bg-white/40">
                <h3 className="text-xl leading-6 font-bold text-gray-900">
                  Generate Reports
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Export request history into a downloadable PDF document.
                </p>
            </div>

            <div className="px-6 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleGeneratePDF}
                        disabled={loading || !startDate || !endDate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    </div>
  );
}
