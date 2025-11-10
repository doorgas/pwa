'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminsList() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admins');
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this admin user?')) {
      try {
        await fetch(`/api/admins/${id}`, { method: 'DELETE' });
        setAdmins(admins.filter((admin: any) => admin.admin.id !== id));
      } catch (error) {
        console.error('Error deleting admin user:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/admins/add" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add New Admin
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Email</th>
              <th className="border p-2 text-left">Role</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length > 0 ? (
              admins.map((admin: any) => (
                <tr key={admin.admin.id}>
                  <td className="border p-2">{admin.admin.name}</td>
                  <td className="border p-2">{admin.admin.email}</td>
                  <td className="border p-2">{admin.role?.name || 'Unknown'}</td>
                  <td className="border p-2">{new Date(admin.admin.createdAt).toLocaleString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <Link 
                        href={`/admins/edit/${admin.admin.id}`}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(admin.admin.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border p-2 text-center">No admin users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 