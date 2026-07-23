"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    setDeletingId(id);
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
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-transparent flex items-center justify-center text-clay-300 font-semibold animate-pulse">Loading materials...</div>;
  }

  const maxTensile = Math.max(...materials.map((m) => m.tensileStrength || 0), 0);
  const maxStiffness = Math.max(...materials.map((m) => m.stiffness || 0), 0);
  const maxHdt = Math.max(...materials.map((m) => m.hdt || 0), 0);
  const maxImpact = Math.max(...materials.map((m) => m.impactResistance || 0), 0);

  return (
    <AppShell variant="admin">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10 w-full">
        <div className="flex justify-between items-end gap-4 mb-8">
          <div>
            <span className="eyebrow">CONSOLE ⁄ STOCK</span>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl text-cream-100">Stock <span className="italic text-clay-300">control</span></h1>
            <p className="mt-2 text-cream-400">Manage the materials available for part requests.</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="shrink-0 inline-flex items-center gap-2 bg-clay-600 hover:bg-clay-700 text-cream-100 px-4 py-2.5 rounded-md font-mono text-[11px] uppercase tracking-[0.15em] transition-all active:scale-95 shadow-glow"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </button>
        </div>

        {isAdding && (
          <div className="bg-espresso-800/72 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-clay-500/18 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-bold text-cream-200 mb-4">New Material</h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div>
                <label htmlFor="newMaterialName" className="block text-sm font-semibold text-cream-300 mb-1">Material Name</label>
                <input
                  id="newMaterialName"
                  type="text"
                  autoFocus
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="e.g. Carbon Fiber PLA"
                  className="w-full border border-espresso-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-clay-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="newMaterialDesc" className="block text-sm font-semibold text-cream-300 mb-1">Description (Optional)</label>
                <textarea
                  id="newMaterialDesc"
                  value={newMaterialDesc}
                  onChange={(e) => setNewMaterialDesc(e.target.value)}
                  placeholder="Short description of the material's properties..."
                  className="w-full border border-espresso-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-clay-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newTensileStrength" className="block text-sm font-semibold text-cream-300 mb-1">Tensile Strength (MPa)</label>
                  <input
                    id="newTensileStrength"
                    type="number"
                    step="any"
                    value={newTensileStrength}
                    onChange={(e) => setNewTensileStrength(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-clay-500"
                  />
                </div>
                <div>
                  <label htmlFor="newStiffness" className="block text-sm font-semibold text-cream-300 mb-1">Stiffness (MPa)</label>
                  <input
                    id="newStiffness"
                    type="number"
                    step="any"
                    value={newStiffness}
                    onChange={(e) => setNewStiffness(e.target.value)}
                    placeholder="e.g. 2400"
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-clay-500"
                  />
                </div>
                <div>
                  <label htmlFor="newHdt" className="block text-sm font-semibold text-cream-300 mb-1">Heat Deflection Temperature (°C)</label>
                  <input
                    id="newHdt"
                    type="number"
                    step="any"
                    value={newHdt}
                    onChange={(e) => setNewHdt(e.target.value)}
                    placeholder="e.g. 55"
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-clay-500"
                  />
                </div>
                <div>
                  <label htmlFor="newImpactResistance" className="block text-sm font-semibold text-cream-300 mb-1">Impact Resistance (KJ/m²)</label>
                  <input
                    id="newImpactResistance"
                    type="number"
                    step="any"
                    value={newImpactResistance}
                    onChange={(e) => setNewImpactResistance(e.target.value)}
                    placeholder="e.g. 0.025"
                    className="w-full border border-espresso-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-clay-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="newMaterialImage" className="block text-sm font-semibold text-cream-300 mb-1">Image (Optional, Max 5MB)</label>
                <input
                  id="newMaterialImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewMaterialImage(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-cream-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-clay-500/12 file:text-clay-300 hover:file:bg-clay-500/15 transition-colors file:cursor-pointer cursor-pointer border border-espresso-600 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-clay-600 hover:bg-clay-700 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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
                  className="bg-espresso-600 hover:bg-espresso-500 text-cream-400 px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-espresso-800/72 backdrop-blur-md rounded-2xl shadow-sm border border-clay-500/18 overflow-hidden">
          {materials.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Package className="w-12 h-12 text-cream-600 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-bold text-cream-200">No materials defined</h3>
              <p className="text-cream-500 mb-6">Add materials to populate the dropdown for users.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="bg-clay-500/12 text-clay-300 hover:bg-clay-500/25 px-4 py-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
              >
                + Add First Material
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-espresso-700">
              {materials.map((m) => (
                <li key={m.id} className="p-4 hover:bg-espresso-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
                  {editingId === m.id ? (
                    <div className="flex-1 flex flex-col gap-3 w-full">
                      <label htmlFor={`editMaterialName-${m.id}`} className="sr-only">Edit Material Name</label>
                      <input
                        id={`editMaterialName-${m.id}`}
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Material Name"
                        className="w-full border border-clay-500/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 bg-espresso-800"
                      />
                      <label htmlFor={`editMaterialDesc-${m.id}`} className="sr-only">Edit Description</label>
                      <textarea
                        id={`editMaterialDesc-${m.id}`}
                        value={editingDesc}
                        onChange={(e) => setEditingDesc(e.target.value)}
                        placeholder="Description (Optional)"
                        className="w-full border border-clay-500/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 bg-espresso-800 text-sm"
                        rows={2}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        <div>
                          <label htmlFor={`editTensileStrength-${m.id}`} className="block text-xs font-semibold text-cream-500 mb-1">Tensile Strength (MPa)</label>
                          <input
                            id={`editTensileStrength-${m.id}`}
                            type="number"
                            step="any"
                            value={editingTensileStrength}
                            onChange={(e) => setEditingTensileStrength(e.target.value)}
                            placeholder="e.g. 50"
                            className="w-full border border-clay-500/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 bg-espresso-800 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`editStiffness-${m.id}`} className="block text-xs font-semibold text-cream-500 mb-1">Stiffness (MPa)</label>
                          <input
                            id={`editStiffness-${m.id}`}
                            type="number"
                            step="any"
                            value={editingStiffness}
                            onChange={(e) => setEditingStiffness(e.target.value)}
                            placeholder="e.g. 2400"
                            className="w-full border border-clay-500/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 bg-espresso-800 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`editHdt-${m.id}`} className="block text-xs font-semibold text-cream-500 mb-1">Heat Deflection Temperature (°C)</label>
                          <input
                            id={`editHdt-${m.id}`}
                            type="number"
                            step="any"
                            value={editingHdt}
                            onChange={(e) => setEditingHdt(e.target.value)}
                            placeholder="e.g. 55"
                            className="w-full border border-clay-500/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 bg-espresso-800 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`editImpactResistance-${m.id}`} className="block text-xs font-semibold text-cream-500 mb-1">Impact Resistance (KJ/m²)</label>
                          <input
                            id={`editImpactResistance-${m.id}`}
                            type="number"
                            step="any"
                            value={editingImpactResistance}
                            onChange={(e) => setEditingImpactResistance(e.target.value)}
                            placeholder="e.g. 0.025"
                            className="w-full border border-clay-500/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay-500 bg-espresso-800 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div><label htmlFor={`editMaterialImage-${m.id}`} className="sr-only">Edit Image</label>
                        <input
                          id={`editMaterialImage-${m.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditingImage(e.target.files?.[0] || null)}
                          className="block w-full sm:w-auto text-xs text-cream-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-clay-500/12 file:text-clay-300 hover:file:bg-clay-500/15 cursor-pointer"
                        /></div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(m.id)}
                            disabled={isUpdating === m.id}
                            className="text-green-300 bg-green-500/15 hover:bg-green-500/25 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUpdating === m.id ? (
                               <>
                                 <svg className="animate-spin h-4 w-4 text-green-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
                            className="text-cream-400 bg-espresso-600 hover:bg-espresso-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
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
                            <div className="w-12 h-12 bg-espresso-600 rounded-lg overflow-hidden border border-espresso-600 flex-shrink-0">
                              <img src={`/api/download/${m.imageId}`} alt={m.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-espresso-700 to-espresso-600 rounded-lg border border-espresso-600 flex items-center justify-center flex-shrink-0">
                              <div className="w-3 h-3 bg-clay-300 rounded-full"></div>
                            </div>
                          )}
                          <div>
                            <span className="text-cream-200 font-bold block text-lg">{m.name}</span>
                            {m.description && <span className="text-cream-500 text-sm">{m.description}</span>}
                          </div>
                        </div>

                        {/* Progress Bars */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 pt-3 border-t border-espresso-700">
                          {/* Tensile Strength */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-cream-500">Tensile Strength</span>
                              <span className="text-cream-200">{m.tensileStrength !== null && m.tensileStrength !== undefined ? `${m.tensileStrength} MPa` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-espresso-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-clay-500 rounded-full transition-all duration-500" 
                                style={{ width: `${m.tensileStrength && maxTensile ? (m.tensileStrength / maxTensile) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Stiffness */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-cream-500">Stiffness</span>
                              <span className="text-cream-100">{(m.stiffness !== null && m.stiffness !== undefined) ? `${m.stiffness * 1000} MPa` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-espresso-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-ember-400 rounded-full transition-all duration-500" 
                                style={{ width: `${m.stiffness && maxStiffness ? (m.stiffness / maxStiffness) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* HDT */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-cream-500">Heat Deflection Temp (HDT)</span>
                              <span className="text-cream-200">{m.hdt !== null && m.hdt !== undefined ? `${m.hdt} °C` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-espresso-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                style={{ width: `${m.hdt && maxHdt ? (m.hdt / maxHdt) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Impact Resistance */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-cream-500">Impact Resistance</span>
                              <span className="text-cream-200">{m.impactResistance !== null && m.impactResistance !== undefined ? `${m.impactResistance / 1000} KJ/m²` : "N/A"}</span>
                            </div>
                            <div className="h-2 w-full bg-espresso-600 rounded-full overflow-hidden">
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
                          className="p-2 text-cream-500 hover:text-clay-300 hover:bg-clay-500/18 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                          title="Edit material"
                          aria-label="Edit material"
                        >
                          <Edit2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deletingId === m.id}
                          className="p-2 text-cream-500 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Delete material"
                          aria-label="Delete material"
                        >
                          {deletingId === m.id ? (
                            <span className="h-4 w-4 rounded-full border-2 border-red-300/40 border-t-red-300 animate-spin block" />
                          ) : (
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          )}
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
    </AppShell>
  );
}
