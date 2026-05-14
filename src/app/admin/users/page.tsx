"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-indigo-600 font-semibold animate-pulse">Loading users...</div>;
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
               <Link href="/admin/users" className="text-sm font-bold text-indigo-600 transition-colors">
                 Users
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex justify-between items-end mb-8">
            <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
               <p className="text-gray-500 mt-1">View and manage registered users.</p>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
                <h3 className="text-lg font-bold text-gray-900">No users found</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                           {user.isAdmin ? 'Admin' : 'User'}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!user.isAdmin && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                              >
                                Delete
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
    </div>
  );
}
