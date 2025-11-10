'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReturnsList() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/returns');
      const data = await res.json();
      setReturns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this return?')) {
      try {
        await fetch(`/api/returns/${id}`, { method: 'DELETE' });
        setReturns(returns.filter((ret: any) => ret.return.id !== id));
      } catch (error) {
        console.error('Error deleting return:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Returns Management</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchReturns}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Return #</th>
              <th className="border p-2 text-left">Order #</th>
              <th className="border p-2 text-left">Customer</th>
              <th className="border p-2 text-left">Reason</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Created</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.length > 0 ? (
              returns.map((item: any) => (
                <tr key={item.return.id}>
                  <td className="border p-2 font-mono text-sm">{item.return.returnNumber}</td>
                  <td className="border p-2 font-mono text-sm">{item.order?.orderNumber || 'N/A'}</td>
                  <td className="border p-2">
                    <div>
                      <div className="font-medium">{item.user?.name || 'Guest'}</div>
                      <div className="text-sm text-gray-500">{item.user?.email}</div>
                    </div>
                  </td>
                  <td className="border p-2">{item.return.reason}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(item.return.status)}`}>
                      {item.return.status.charAt(0).toUpperCase() + item.return.status.slice(1)}
                    </span>
                  </td>
                  <td className="border p-2">{new Date(item.return.createdAt).toLocaleDateString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <Link 
                        href={`/returns/edit/${item.return.id}`}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(item.return.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="border p-2 text-center">No returns found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 