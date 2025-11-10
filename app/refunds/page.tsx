'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../components/CurrencySymbol';

export default function RefundsList() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/refunds');
      const data = await res.json();
      setRefunds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatAmount = (amount: string) => {
    return (
      <span className="flex items-center gap-1">
        <CurrencySymbol />
        {parseFloat(amount).toFixed(2)}
      </span>
    );
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/refunds/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchRefunds(); // Refresh the list
      } else {
        console.error('Failed to update refund status');
      }
    } catch (error) {
      console.error('Error updating refund status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this refund record?')) {
      try {
        await fetch(`/api/refunds/${id}`, { method: 'DELETE' });
        setRefunds(refunds.filter((refund: any) => refund.refund.id !== id));
      } catch (error) {
        console.error('Error deleting refund:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Refunds Management</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchRefunds}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/refunds/add" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Process New Refund
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-800">
            {refunds.filter((r: any) => r.refund.status === 'pending').length}
          </div>
          <div className="text-yellow-600">Pending Refunds</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-800">
            {refunds.filter((r: any) => r.refund.status === 'completed').length}
          </div>
          <div className="text-green-600">Completed</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-800">
            {refunds.filter((r: any) => r.refund.status === 'failed').length}
          </div>
          <div className="text-red-600">Failed</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">
            ${refunds.reduce((sum: number, r: any) => 
              r.refund.status === 'completed' ? sum + parseFloat(r.refund.amount) : sum, 0
            ).toFixed(2)}
          </div>
          <div className="text-blue-600">Total Refunded</div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Refund ID</th>
              <th className="border p-2 text-left">Order Number</th>
              <th className="border p-2 text-left">Return Number</th>
              <th className="border p-2 text-left">Amount</th>
              <th className="border p-2 text-left">Reason</th>
              <th className="border p-2 text-left">Method</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Transaction ID</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length > 0 ? (
              refunds.map((item: any) => (
                <tr key={item.refund.id}>
                  <td className="border p-2 font-mono text-sm">{item.refund.id.slice(-8)}</td>
                  <td className="border p-2">{item.order?.orderNumber || 'N/A'}</td>
                  <td className="border p-2">{item.return?.returnNumber || 'N/A'}</td>
                  <td className="border p-2 font-semibold">{formatAmount(item.refund.amount)}</td>
                  <td className="border p-2">{item.refund.reason || 'No reason provided'}</td>
                  <td className="border p-2 capitalize">{item.refund.method || 'original_payment'}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(item.refund.status)}`}>
                      {item.refund.status}
                    </span>
                  </td>
                  <td className="border p-2 font-mono text-xs">{item.refund.transactionId || 'N/A'}</td>
                  <td className="border p-2">{new Date(item.refund.createdAt).toLocaleString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-1 flex-wrap">
                      {item.refund.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(item.refund.id, 'completed')}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            Complete
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(item.refund.id, 'failed')}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Mark Failed
                          </button>
                        </>
                      )}
                      <Link 
                        href={`/refunds/edit/${item.refund.id}`}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(item.refund.id)}
                        className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="border p-2 text-center">No refunds found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 