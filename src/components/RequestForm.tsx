"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { Upload, FileCode, Check, AlertTriangle, AlertCircle, RefreshCw, Calendar, Phone, Layers, Info } from "lucide-react";

function RequestFormContent({ onFormSubmit }: { onFormSubmit: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [material, setMaterial] = useState("");
  const [availableMaterials, setAvailableMaterials] = useState<{ id: string; name: string }[]>([]);
  const [dateNeeded, setDateNeeded] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [pastPhones, setPastPhones] = useState<{ id: string; number: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const initialMaterial = searchParams.get("material");

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

    fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableMaterials(data);
          if (data.length > 0) {
            if (initialMaterial && data.some(m => m.name === initialMaterial)) {
              setMaterial(initialMaterial);
            } else {
              setMaterial(data[0].name);
            }
          }
        }
      });
  }, [initialMaterial]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const selectedFile = droppedFiles[0];
      const extension = selectedFile.name.split(".").pop()?.toLowerCase();
      if (extension === "stl" || extension === "zip") {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Only .STL or .ZIP formats are supported.");
      }
    }
  };

  const selectFileManually = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!file) {
      setError("Please select or drop an STL or ZIP file.");
      setLoading(false);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("File size exceeds the 20MB limit.");
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
    formData.append("quantity", quantity);
    formData.append("material", material);
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
      if (availableMaterials.length > 0) setMaterial(availableMaterials[0].name);
      setQuantity("1");
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
    <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
      <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-800/80 pb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-indigo-400" />
        New Order Console
      </h2>

      <div className="bg-amber-500/5 border border-amber-500/20 text-amber-300 p-4 mb-6 rounded-xl flex gap-3 items-start" role="alert">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-xs uppercase tracking-wider font-mono">Cancellation Protocol</p>
          <p className="text-sm mt-1 text-slate-400">Orders can only be cancelled within <strong className="text-amber-400">30 minutes</strong> of placing the request.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex gap-2.5 items-center" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Holographic Build Plate Upload Zone */}
        <div>
<<<<<<< Updated upstream
          <label htmlFor="fileUpload" className="block text-sm font-semibold text-gray-700 mb-1.5">
            .STL or .ZIP File <span className="text-red-500" aria-hidden="true">*</span> <span className="text-gray-400 font-normal ml-1">(Max 20MB)</span>
          </label>
          <input
            id="fileUpload"
            type="file"
            accept=".stl,.zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors file:cursor-pointer cursor-pointer border border-gray-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
=======
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Holographic Build Plate (Model STL / ZIP)</label>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileInputChange} 
            accept=".stl,.zip" 
            className="hidden" 
>>>>>>> Stashed changes
          />
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={selectFileManually}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all overflow-hidden flex flex-col items-center justify-center min-h-[160px] ${
              isDragging 
                ? "border-cyan-500 bg-cyan-500/5 scale-[0.99]" 
                : file 
                  ? "border-emerald-500/50 bg-emerald-500/5" 
                  : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
            }`}
          >
            {/* Fine Grid Background inside Drag Box */}
            <div className="absolute inset-0 build-plate-grid opacity-30 pointer-events-none" />

            {/* Sweep Laser Scanning Animation on active file */}
            {file && (
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-scan z-10" />
            )}

            {file ? (
              <div className="relative z-20 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="mx-auto w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200 truncate max-w-[280px]">{file.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB / READY TO SCAN</p>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="relative z-20 space-y-3 text-slate-400">
                <div className="mx-auto w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-300">Drag & drop your 3D file here</p>
                  <p className="text-xs text-slate-500 mt-1">Supports .STL or .ZIP (Max 20MB)</p>
                </div>
                <button 
                  type="button" 
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/30 px-3.5 py-2 rounded-lg bg-indigo-500/5 transition-all"
                >
                  Select File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quantity Field */}
        <div>
<<<<<<< Updated upstream
          <label htmlFor="quantity" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Quantity <span className="text-red-500" aria-hidden="true">*</span>
          </label>
=======
          <label htmlFor="quantity" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Print Quantity</label>
>>>>>>> Stashed changes
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="block w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white font-mono"
            required
          />
        </div>

        {/* Date Field */}
        <div>
<<<<<<< Updated upstream
          <label htmlFor="dateNeeded" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Date Needed <span className="text-red-500" aria-hidden="true">*</span> <span className="text-gray-400 font-normal ml-1">(Min 5 days lead time)</span>
          </label>
          <input
            id="dateNeeded"
            type="date"
            min={minDate}
            value={dateNeeded}
            onChange={(e) => setDateNeeded(e.target.value)}
            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-gray-700"
            required
          />
=======
          <label htmlFor="dateNeeded" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date Needed (5 Days Lead Time)</label>
          <div className="relative">
            <input
              id="dateNeeded"
              type="date"
              min={minDate}
              value={dateNeeded}
              onChange={(e) => setDateNeeded(e.target.value)}
              className="block w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white font-mono"
              required
            />
          </div>
>>>>>>> Stashed changes
        </div>

        {/* Phone Field */}
        <div>
<<<<<<< Updated upstream
          <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Phone Number <span className="text-red-500" aria-hidden="true">*</span>
          </label>
=======
          <label htmlFor="phoneNumber" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
>>>>>>> Stashed changes
          {isAddingPhone || pastPhones.length === 0 ? (
            <div className="flex gap-2">
                <input
                    id="phoneNumber"
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    className="block w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white"
                    placeholder="e.g., (123) 456-7890"
                    required
                />
                {pastPhones.length > 0 && (
<<<<<<< Updated upstream
                    <button type="button" onClick={() => setIsAddingPhone(false)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                        Cancel
=======
                    <button 
                      type="button" 
                      onClick={() => setIsAddingPhone(false)} 
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-slate-700 bg-slate-900/50 px-3.5 rounded-xl transition-colors whitespace-nowrap"
                    >
                      Cancel
>>>>>>> Stashed changes
                    </button>
                )}
            </div>
          ) : (
             <div className="flex gap-2 items-center">
                 <select
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white"
                    required
                >
                    {pastPhones.map((phone) => (
                        <option key={phone.id} value={phone.number}>{phone.number}</option>
                    ))}
                </select>
<<<<<<< Updated upstream
                <button type="button" onClick={() => setIsAddingPhone(true)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    + Add New
=======
                <button 
                  type="button" 
                  onClick={() => setIsAddingPhone(true)} 
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-slate-700 bg-slate-900/50 px-3.5 py-3 rounded-xl transition-colors whitespace-nowrap"
                >
                  + Add New
>>>>>>> Stashed changes
                </button>
             </div>
          )}
        </div>
        
        {/* Material Selection */}
        <div>
<<<<<<< Updated upstream
          <label htmlFor="material" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Material <span className="text-red-500" aria-hidden="true">*</span>
          </label>
=======
          <label htmlFor="material" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Build Material</label>
>>>>>>> Stashed changes
          <select
            id="material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="block w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white"
            required
          >
            {availableMaterials.length === 0 ? (
                <option value="">No materials available</option>
            ) : (
                availableMaterials.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                ))
            )}
          </select>
        </div>

        {/* Notes Selection */}
        <div>
<<<<<<< Updated upstream
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Notes <span className="text-gray-400 font-normal ml-1">(Color, etc.) - Optional</span>
          </label>
=======
          <label htmlFor="notes" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Technical Instructions (Notes)</label>
>>>>>>> Stashed changes
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white resize-none"
            placeholder="Color, layer height constraints, infill details, etc."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-6"
        >
          {loading ? (
             <span className="flex items-center gap-2">
               <RefreshCw className="w-4 h-4 animate-spin text-white" />
               <span>Transmitting telemetry...</span>
               <span className="sr-only">Submitting your request, please wait</span>
             </span>
          ) : "Submit Request to Print Queue"}
        </button>
      </form>
    </div>
  );
}

export default function RequestForm({ onFormSubmit }: { onFormSubmit: () => void }) {
  return (
    <Suspense fallback={<div className="bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse h-[400px]"></div>}>
      <RequestFormContent onFormSubmit={onFormSubmit} />
    </Suspense>
  );
}
