"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus, Trash2, Edit2, Check, X, Package } from "lucide-react";

export default function AdminMaterialsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add form states
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [newMaterialImage, setNewMaterialImage] = useState<File | null>(null);
  const [newTensileStrength, setNewTensileStrength] = useState("");
  const [newStiffness, setNewStiffness] = useState("");
  const [newHdt, setNewHdt] = useState("");
  const [newImpactResistance, setNewImpactResistance] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [editingImage, setEditingImage] = useState<File | null>(null);
  const [editingTensileStrength, setEditingTensileStrength] = useState("");
  const [editingStiffness, setEditingStiffness] = useState("");
  const [editingHdt, setEditingHdt] = useState("");
  const [editingImpactResistance, setEditingImpactResistance] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchMaterials = () => {
    fetch("/api/admin/materials")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMaterials(data);
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
      fetchMaterials();
    }
  }, [status, router, session]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;
    setIsSaving(true);

    const formData = new FormData();
    formData.append("name", newMaterialName);
    if (newMaterialDesc) formData.append("description", newMaterialDesc);
    if (newMaterialImage) formData.append("image", newMaterialImage);
    if (newTensileStrength) formData.append("tensileStrength", newTensileStrength);
    if (newStiffness) formData.append("stiffness", String(parseFloat(newStiffness) / 1000));
    if (newHdt) formData.append("hdt", newHdt);
    if (newImpactResistance) formData.append("impactResistance", String(parseFloat(newImpactResistance) * 1000));

    try {
      const res = await fetch("/api/admin/materials", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setNewMaterialName("");
        setNewMaterialDesc("");
        setNewMaterialImage(null);
        setNewTensileStrength("");
        setNewStiffness("");
        setNewHdt("");
        setNewImpactResistance("");
        setIsAdding(false);
        fetchMaterials();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add material");
      }
    } catch (err) {
      alert("Error adding material");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    setIsUpdating(id);

    const formData = new FormData();
    formData.append("name", editingName);
    if (editingDesc) formData.append("description", editingDesc);
    if (editingImage) formData.append("image", editingImage);
    formData.append("tensileStrength", editingTensileStrength);
    formData.append("stiffness", editingStiffness ? String(parseFloat(editingStiffness) / 1000) : "");
    formData.append("hdt", editingHdt);
    formData.append("impactResistance", editingImpactResistance ? String(parseFloat(editingImpactResistance) * 1000) : "");

    try {
      const res = await fetch(`/api/admin/materials/${id}`, {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        setEditingId(null);
        setEditingName("");
        setEditingDesc("");
        setEditingImage(null);
        setEditingTensileStrength("");
        setEditingStiffness("");
        setEditingHdt("");
        setEditingImpactResistance("");
        fetchMaterials();
      } else {
        alert("Failed to update material");
      }
    } catch (err) {
      alert("Error updating material");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material? Existing requests using this material will keep the name, but new requests won't be able to select it.")) return;

    try {
      const res = await fetch(`/api/admin/materials/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchMaterials();
      } else {
        alert("Failed to delete material");
      }
    } catch (err) {
      alert("Error deleting material");
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-transparent flex items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading materials...</div>;
  }

  const maxTensile = Math.max(...materials.map((m) => m.tensileStrength || 0), 0);
  const maxStiffness = Math.max(...materials.map((m) => m.stiffness || 0), 0);
  const maxHdt = Math.max(...materials.map((m) => m.hdt || 0), 0);
  const maxImpact = Math.max(...materials.map((m) => m.impactResistance || 0), 0);

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
              <Link href="/admin/materials" className="text-sm font-bold text-indigo-600 transition-colors">
                Materials
              </Link>
              <Link href="/admin/add-request" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                Add Request
              </Link>
              <Link href="/admin/reports" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                 Reports
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Material Management</h1>
            <p className="text-gray-500 mt-1">Manage the materials available for part requests.</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Material
          </button>
        </div>

        {isAdding && (
          <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Material</h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Material Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="e.g. Carbon Fiber PLA"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={newMaterialDesc}
                  onChange={(e) => setNewMaterialDesc(e.target.value)}
                  placeholder="Short description of the material's properties..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tensile Strength (MPa)</label>
                  <input
                    type="number"
                    step="any"
                    value={newTensileStrength}
                    onChange={(e) => setNewTensileStrength(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Stiffness (MPa)</label>
                  <input
                    type="number"
                    step="any"
                    value={newStiffness}
                    onChange={(e) => setNewStiffness(e.target.value)}
                    placeholder="e.g. 2400"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Heat Deflection Temperature (°C)</label>
                  <input
                    type="number"
                    step="any"
                    value={newHdt}
                    onChange={(e) => setNewHdt(e.target.value)}
                    placeholder="e.g. 55"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Impact Resistance (KJ/m²)</label>
                  <input
                    type="number"
                    step="any"
                    value={newImpactResistance}
                    onChange={(e) => setNewImpactResistance(e.target.value)}
                    placeholder="e.g. 0.025"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image (Optional, Max 5MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewMaterialImage(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors file:cursor-pointer cursor-pointer border border-gray-200 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Material"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewMaterialName("");
                    setNewMaterialDesc("");
                    setNewMaterialImage(null);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 overflow-hidden">
          {materials.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Package className="w-12 h-12 text-gray-300 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-bold text-gray-900">No materials defined</h3>
              <p className="text-gray-500 mb-6">Add materials to populate the dropdown for users.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                + Add First Material
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {materials.map((m) => (
                <li key={m.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
                  {editingId === m.id ? (
                    <div className="flex-1 flex flex-col gap-3 w-full">
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Material Name"
                        className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <textarea
                        value={editingDesc}
                        onChange={(e) => setEditingDesc(e.target.value)}
                        placeholder="Description (Optional)"
                        className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                        rows={2}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Tensile Strength (MPa)</label>
                          <input
                            type="number"
                            step="any"
                            value={editingTensileStrength}
                            onChange={(e) => setEditingTensileStrength(e.target.value)}
                            placeholder="e.g. 50"
                            className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Stiffness (MPa)</label>
                          <input
                            type="number"
                            step="any"
                            value={editingStiffness}
                            onChange={(e) => setEditingStiffness(e.target.value)}
                            placeholder="e.g. 2400"
                            className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Heat Deflection Temperature (°C)</label>
                          <input
                            type="number"
                            step="any"
                            value={editingHdt}
                            onChange={(e) => setEditingHdt(e.target.value)}
                            placeholder="e.g. 55"
                            className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Impact Resistance (KJ/m²)</label>
                          <input
                            type="number"
                            step="any"
                            value={editingImpactResistance}
                            onChange={(e) => setEditingImpactResistance(e.target.value)}
                            placeholder="e.g. 0.025"
                            className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditingImage(e.target.files?.[0] || null)}
                          className="block w-full sm:w-auto text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(m.id)}
                            disabled={isUpdating === m.id}
                            className="text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUpdating === m.id ? (
                               <>
                                 <svg className="animate-spin h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 Saving...
                               </>
                            ) : (
                               <><Check className="w-4 h-4" aria-hidden="true" /> Save</>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                              setEditingDesc("");
                              setEditingImage(null);
                              setEditingTensileStrength("");
                              setEditingStiffness("");
                              setEditingHdt("");
                              setEditingImpactResistance("");
                            }}
                            className="text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                          >
                            <X className="w-4 h-4" /> Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 flex-1">
                        <div className="flex items-center gap-4">
                          {m.imageId ? (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              <img src={`/api/download/${m.imageId}`} alt={m.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <div className="w-3 h-3 bg-indigo-300 rounded-full"></div>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-900 font-bold block text-lg">{m.name}</span>
                            {m.description && <span className="text-gray-500 text-sm">{m.description}</span>}
                          </div>
                        </div>

                        {/* Progress Bars */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 pt-3 border-t border-gray-100">
                          {/* Tensile Strength */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-500">Tensile Strength</span>
                              <span className="text-gray-900">{m.tensileStrength !== null && m.tensileStrength !== undefined ? `${m.tensileStrength} MPa` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                style={{ width: `${m.tensileStrength && maxTensile ? (m.tensileStrength / maxTensile) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Stiffness */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-500">Stiffness</span>
                              <span className="text-gray-950">{(m.stiffness !== null && m.stiffness !== undefined) ? `${m.stiffness * 1000} MPa` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                style={{ width: `${m.stiffness && maxStiffness ? (m.stiffness / maxStiffness) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* HDT */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-500">Heat Deflection Temp (HDT)</span>
                              <span className="text-gray-900">{m.hdt !== null && m.hdt !== undefined ? `${m.hdt} °C` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                style={{ width: `${m.hdt && maxHdt ? (m.hdt / maxHdt) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Impact Resistance */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-500">Impact Resistance</span>
                              <span className="text-gray-900">{m.impactResistance !== null && m.impactResistance !== undefined ? `${m.impactResistance / 1000} KJ/m²` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                style={{ width: `${m.impactResistance && maxImpact ? (m.impactResistance / maxImpact) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingId(m.id);
                            setEditingName(m.name);
                            setEditingDesc(m.description || "");
                            setEditingTensileStrength(m.tensileStrength !== null && m.tensileStrength !== undefined ? m.tensileStrength.toString() : "");
                            setEditingStiffness(m.stiffness !== null && m.stiffness !== undefined ? (m.stiffness * 1000).toString() : "");
                            setEditingHdt(m.hdt !== null && m.hdt !== undefined ? m.hdt.toString() : "");
                            setEditingImpactResistance(m.impactResistance !== null && m.impactResistance !== undefined ? (m.impactResistance / 1000).toString() : "");
                            setEditingImage(null);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          title="Edit material"
                          aria-label="Edit material"
                        >
                          <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          title="Delete material"
                          aria-label="Delete material"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
