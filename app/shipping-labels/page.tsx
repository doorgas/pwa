'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../components/CurrencySymbol';

export default function ShippingLabelsList() {
  const [shippingLabels, setShippingLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShippingLabels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shipping-labels');
      const data = await res.json();
      setShippingLabels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingLabels();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      created: 'bg-blue-100 text-blue-800',
      printed: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-green-100 text-green-800',
      delivered: 'bg-purple-100 text-purple-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCost = (cost: string | null) => {
    return cost ? (
      <span className="flex items-center gap-1">
        <CurrencySymbol />
        {parseFloat(cost).toFixed(2)}
      </span>
    ) : 'N/A';
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/shipping-labels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchShippingLabels(); // Refresh the list
      } else {
        console.error('Failed to update shipping label status');
      }
    } catch (error) {
      console.error('Error updating shipping label status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this shipping label?')) {
      try {
        await fetch(`/api/shipping-labels/${id}`, { method: 'DELETE' });
        setShippingLabels(shippingLabels.filter((label: any) => label.shippingLabel.id !== id));
      } catch (error) {
        console.error('Error deleting shipping label:', error);
      }
    }
  };

  const openTrackingUrl = (carrier: string, trackingNumber: string) => {
    let url = '';
    switch (carrier.toLowerCase()) {
      case 'ups':
        url = `https://www.ups.com/track?tracknum=${trackingNumber}`;
        break;
      case 'fedex':
        url = `https://www.fedex.com/fedextrack/?tracknumber=${trackingNumber}`;
        break;
      case 'usps':
        url = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`;
        break;
      case 'dhl':
        url = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
        break;
      default:
        alert('Tracking URL not available for this carrier');
        return;
    }
    window.open(url, '_blank');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shipping Labels Management</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchShippingLabels}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/shipping-labels/add" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create New Label
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">
            {shippingLabels.filter((l: any) => l.shippingLabel.status === 'created').length}
          </div>
          <div className="text-blue-600">Created</div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-800">
            {shippingLabels.filter((l: any) => l.shippingLabel.status === 'printed').length}
          </div>
          <div className="text-yellow-600">Printed</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-800">
            {shippingLabels.filter((l: any) => l.shippingLabel.status === 'shipped').length}
          </div>
          <div className="text-green-600">Shipped</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-800">
            {shippingLabels.filter((l: any) => l.shippingLabel.status === 'delivered').length}
          </div>
          <div className="text-purple-600">Delivered</div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Label ID</th>
              <th className="border p-2 text-left">Order Number</th>
              <th className="border p-2 text-left">Customer Email</th>
              <th className="border p-2 text-left">Carrier</th>
              <th className="border p-2 text-left">Service</th>
              <th className="border p-2 text-left">Tracking Number</th>
              <th className="border p-2 text-left">Cost</th>
              <th className="border p-2 text-left">Weight</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shippingLabels.length > 0 ? (
              shippingLabels.map((item: any) => (
                <tr key={item.shippingLabel.id}>
                  <td className="border p-2 font-mono text-sm">{item.shippingLabel.id.slice(-8)}</td>
                  <td className="border p-2">{item.order?.orderNumber || 'N/A'}</td>
                  <td className="border p-2">{item.order?.email || 'N/A'}</td>
                  <td className="border p-2 uppercase font-semibold">{item.shippingLabel.carrier}</td>
                  <td className="border p-2 capitalize">{item.shippingLabel.service || 'Standard'}</td>
                  <td className="border p-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{item.shippingLabel.trackingNumber}</span>
                      <button
                        onClick={() => openTrackingUrl(item.shippingLabel.carrier, item.shippingLabel.trackingNumber)}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        title="Track Package"
                      >
                        Track
                      </button>
                    </div>
                  </td>
                  <td className="border p-2">{formatCost(item.shippingLabel.cost)}</td>
                  <td className="border p-2">{item.shippingLabel.weight ? `${item.shippingLabel.weight} kg` : 'N/A'}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(item.shippingLabel.status)}`}>
                      {item.shippingLabel.status}
                    </span>
                  </td>
                  <td className="border p-2">{new Date(item.shippingLabel.createdAt).toLocaleString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-1 flex-wrap">
                      {item.shippingLabel.status === 'created' && (
                        <button 
                          onClick={() => handleStatusUpdate(item.shippingLabel.id, 'printed')}
                          className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                        >
                          Mark Printed
                        </button>
                      )}
                      {item.shippingLabel.status === 'printed' && (
                        <button 
                          onClick={() => handleStatusUpdate(item.shippingLabel.id, 'shipped')}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Mark Shipped
                        </button>
                      )}
                      {item.shippingLabel.status === 'shipped' && (
                        <button 
                          onClick={() => handleStatusUpdate(item.shippingLabel.id, 'delivered')}
                          className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {item.shippingLabel.labelUrl && (
                        <a 
                          href={item.shippingLabel.labelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600"
                        >
                          View Label
                        </a>
                      )}
                      <Link 
                        href={`/shipping-labels/edit/${item.shippingLabel.id}`}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(item.shippingLabel.id)}
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
                <td colSpan={11} className="border p-2 text-center">No shipping labels found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 