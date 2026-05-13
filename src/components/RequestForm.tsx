"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";

export default function RequestForm({ onFormSubmit }: { onFormSubmit: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [dateNeeded, setDateNeeded] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [pastPhones, setPastPhones] = useState<{ id: string; number: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const minDate = format(addDays(new Date(), 5), "yyyy-MM-dd");

  useEffect(() => {
    fetch("/api/user/phone-numbers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPastPhones(data);
          if (data.length > 0) {
             setPhoneNumber(data[0].number);
          } else {
             setIsAddingPhone(true);
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!file) {
      setError("Please select an STL file.");
      setLoading(false);
      return;
    }

    const finalPhone = (isAddingPhone || pastPhones.length === 0) ? newPhoneNumber : phoneNumber;
    if (!finalPhone) {
        setError("Please provide a phone number.");
        setLoading(false);
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("notes", notes);
    formData.append("dateNeeded", dateNeeded);
    formData.append("phoneNumber", finalPhone);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request.");
      }

      setFile(null);
      setNotes("");
      setDateNeeded("");
      setNewPhoneNumber("");
      setIsAddingPhone(false);
      onFormSubmit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-6 text-gray-900 border-b border-gray-100 pb-4">Create New Request</h2>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 mb-6 rounded-xl flex gap-3 items-start" role="alert">
        <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <div>
          <p className="font-semibold text-sm">Cancellation Policy</p>
          <p className="text-sm mt-1 text-amber-700">Orders can only be cancelled within <strong>30 minutes</strong> of placing the request.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex gap-2 items-center">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fileUpload" className="block text-sm font-semibold text-gray-700 mb-1.5">.STL File (Required)</label>
          <input
            id="fileUpload"
            type="file"
            accept=".stl"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors file:cursor-pointer cursor-pointer border border-gray-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="dateNeeded" className="block text-sm font-semibold text-gray-700 mb-1.5">Date Needed (Min 5 days lead time)</label>
          <input
            id="dateNeeded"
            type="date"
            min={minDate}
            value={dateNeeded}
            onChange={(e) => setDateNeeded(e.target.value)}
            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-gray-700"
            required
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number (Required)</label>
          {isAddingPhone || pastPhones.length === 0 ? (
            <div className="flex gap-2">
                <input
                    id="phoneNumber"
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-gray-700"
                    placeholder="e.g., (123) 456-7890"
                    required
                />
                {pastPhones.length > 0 && (
                    <button type="button" onClick={() => setIsAddingPhone(false)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 rounded-lg transition-colors whitespace-nowrap">
                        Cancel
                    </button>
                )}
            </div>
          ) : (
             <div className="flex gap-2 items-center">
                 <select
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-gray-700 bg-white"
                    required
                >
                    {pastPhones.map((phone) => (
                        <option key={phone.id} value={phone.number}>{phone.number}</option>
                    ))}
                </select>
                <button type="button" onClick={() => setIsAddingPhone(true)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
                    + Add New
                </button>
             </div>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-gray-700 resize-none"
            placeholder="Any special instructions?"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-6"
        >
          {loading ? (
             <span className="flex items-center gap-2">
               <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Submitting...
             </span>
          ) : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
