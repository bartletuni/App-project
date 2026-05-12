"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      if (!(session?.user as any)?.isAdmin) {
          router.push("/dashboard");
          return;
      }

      fetch("/api/requests")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
             setRequests(data);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, router, session]);

  if (status === "loading" || loading) {
    return <div className="p-8 text-center">Loading admin dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard - Request Management</h1>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-6 text-gray-500">No requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User / Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File & Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{req.user.email}</div>
                      <div className="text-sm text-gray-500">{req.phoneNumber.number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{req.fileName}</div>
                      {req.notes && <div className="text-sm text-gray-500 max-w-xs truncate" title={req.notes}>Notes: {req.notes}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">Needed: {format(new Date(req.dateNeeded), "MMM d, yyyy")}</div>
                      <div className="text-xs text-gray-500">Submitted: {format(new Date(req.createdAt), "MMM d")}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            req.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {req.status}
                          </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* We construct a Google Drive download link assuming the file is accessible or shared */}
                        <a
                            href={`https://drive.google.com/uc?export=download&id=${req.fileId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded"
                        >
                            Download .STL
                        </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
