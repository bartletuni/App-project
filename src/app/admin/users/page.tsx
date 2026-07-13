"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import AppShell from "@/components/AppShell";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = () => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
           setUsers(data);
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
      fetchUsers();
    }
  }, [status, router, session]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This will also delete all of their requests and phone numbers. This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting user");
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-transparent flex items-center justify-center text-clay-300 font-semibold animate-pulse">Loading users...</div>;
  }

  return (
    <AppShell variant="admin">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10 w-full">
        <div className="mb-8">
          <span className="eyebrow">CONSOLE ⁄ CLIENTS</span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-cream-100">Client <span className="italic text-clay-300">registry</span></h1>
          <p className="mt-2 text-cream-400">View and manage registered users.</p>
        </div>

        <div className="panel rounded-md overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
                <svg className="w-12 h-12 text-cream-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <h3 className="text-lg font-bold text-cream-200">No users found</h3>
                <p className="text-cream-500 mt-1">There are currently no registered users in the system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-espresso-700/50">
                <caption className="sr-only">Registered users</caption>
                <thead className="bg-espresso-700/50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Phone</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-cream-500 uppercase tracking-wider">Joined</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-cream-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-espresso-700/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-espresso-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-cream-200">{user.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-cream-200">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-cream-500">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isAdmin ? 'bg-clay-500/12 text-clay-300 border border-clay-500/30' : 'bg-espresso-700 text-cream-300 border border-espresso-600'}`}>
                           {user.isAdmin ? 'Admin' : 'User'}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-cream-500">
                         {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3 items-center">
                          <button
                            onClick={() => openModal(user)}
                            className="text-clay-300 hover:text-clay-200 bg-clay-500/12 hover:bg-clay-500/25 px-3 py-1.5 rounded-lg transition-colors font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                          >
                            Display Information
                          </button>
                          {!user.isAdmin && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                disabled={deletingId === user.id}
                                className="inline-flex items-center gap-1.5 text-red-300 hover:text-red-200 bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 rounded-lg transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              >
                                {deletingId === user.id ? (
                                  <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-red-300/40 border-t-red-300 animate-spin" />
                                    Deleting
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Info Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
          <div className="bg-espresso-800/90 backdrop-blur-xl border border-clay-500/20 rounded-2xl shadow-xl overflow-hidden w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-espresso-600/50 bg-espresso-800/45 flex justify-between items-center sticky top-0 z-10">
                <h3 id="user-modal-title" className="text-xl leading-6 font-bold text-cream-200">
                  User Account Information
                </h3>
                <button
                  onClick={closeModal}
                  className="text-cream-500 hover:text-cream-400 hover:bg-espresso-600 p-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                  aria-label="Close user details"
                  title="Close user details"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="px-6 py-6 sm:p-8">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                    <div>
                        <dt className="text-sm font-medium text-cream-500">Full Name</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedUser.name}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-cream-500">Email Address</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedUser.email}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-cream-500">Phone Number</dt>
                        <dd className="mt-1 text-sm text-cream-200 font-semibold">{selectedUser.phone || "N/A"}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-cream-500">Shipping Address</dt>
                        <dd className="mt-1 text-sm text-cream-200 bg-espresso-700 p-3 rounded-lg border border-espresso-700">{selectedUser.shippingAddress || "N/A"}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-cream-500">Billing Address</dt>
                        <dd className="mt-1 text-sm text-cream-200 bg-espresso-700 p-3 rounded-lg border border-espresso-700">{selectedUser.billingAddress || "N/A"}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-cream-500">Role</dt>
                            <dd className="mt-1">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedUser.isAdmin ? 'bg-clay-500/12 text-clay-300 border border-clay-500/30' : 'bg-espresso-700 text-cream-300 border border-espresso-600'}`}>
                                    {selectedUser.isAdmin ? 'Admin' : 'User'}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-cream-500">Joined On</dt>
                            <dd className="mt-1 text-sm text-cream-200 font-semibold">{format(new Date(selectedUser.createdAt), "MMM d, yyyy")}</dd>
                        </div>
                    </div>
                </dl>
            </div>

            <div className="px-6 py-5 border-t border-espresso-600/50 bg-espresso-800/45 text-right">
                <button
                  onClick={closeModal}
                  className="bg-espresso-950 hover:bg-espresso-900 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
                >
                  Close
                </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
