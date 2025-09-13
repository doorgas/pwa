'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RolesList() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        await fetch(`/api/roles/${id}`, { method: 'DELETE' });
        setRoles(roles.filter((role: any) => role.id !== id));
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Roles</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchRoles}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/roles/add" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add New Role
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Permissions</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.length > 0 ? (
              roles.map((role: any) => (
                <tr key={role.id}>
                  <td className="border p-2">{role.name}</td>
                  <td className="border p-2">
                    {role.permissions && typeof role.permissions === 'string' 
                      ? JSON.parse(role.permissions).join(', ') 
                      : Array.isArray(role.permissions) 
                        ? role.permissions.join(', ') 
                        : 'None'}
                  </td>
                  <td className="border p-2">{new Date(role.createdAt).toLocaleString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <Link 
                        href={`/roles/edit/${role.id}`}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(role.id)}
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
                <td colSpan={4} className="border p-2 text-center">No roles found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 