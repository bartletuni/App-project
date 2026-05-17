"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Edit2, Check, X, Package } from "lucide-react";

export default function AdminMaterialsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

    try {
      const res = await fetch("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMaterialName }),
      });

      if (res.ok) {
        setNewMaterialName("");
        setIsAdding(false);
        fetchMaterials();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add material");
      }
    } catch (err) {
      alert("Error adding material");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const res = await fetch(`/api/admin/materials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditingName("");
        fetchMaterials();
      } else {
        alert("Failed to update material");
      }
    } catch (err) {
      alert("Error updating material");
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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading materials...</div>;
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
              <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                Requests
              </Link>
              <Link href="/admin/users" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                Users
              </Link>
              <Link href="/admin/materials" className="text-sm font-bold text-indigo-600 transition-colors">
                Materials
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Material</h2>
            <form onSubmit={handleAdd} className="flex gap-4">
              <input
                type="text"
                autoFocus
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="e.g. Carbon Fiber PLA"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewMaterialName("");
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {materials.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Package className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No materials defined</h3>
              <p className="text-gray-500">Add materials to populate the dropdown for users.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {materials.map((m) => (
                <li key={m.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                  {editingId === m.id ? (
                    <div className="flex-1 flex gap-3 mr-4">
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <button
                        onClick={() => handleUpdate(m.id)}
                        className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                        title="Save changes"
                          aria-label="Save changes"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                        className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        title="Cancel editing"
                          aria-label="Cancel editing"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                        <span className="text-gray-900 font-semibold">{m.name}</span>
                      </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingId(m.id);
                            setEditingName(m.name);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Edit name"
                            aria-label="Edit name"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete material"
                            aria-label="Delete material"
                        >
                          <Trash2 className="w-4 h-4" />
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
