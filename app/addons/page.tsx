'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../components/CurrencySymbol';

export default function AddonsList() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAddons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/addons');
      const data = await res.json();
      setAddons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this addon?')) {
      try {
        await fetch(`/api/addons/${id}`, { method: 'DELETE' });
        setAddons(addons.filter((addon: any) => addon.id !== id));
      } catch (error) {
        console.error('Error deleting addon:', error);
      }
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price) || 0;
    return (
      <span className="flex items-center gap-1">
        <CurrencySymbol />{numPrice.toFixed(2)}
      </span>
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Addons</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchAddons}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/addon-groups" 
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Manage Groups
          </Link>
          <Link 
            href="/addons/add" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add New Addon
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Image</th>
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">Group</th>
              <th className="border p-2 text-left">Price</th>
              <th className="border p-2 text-left">Sort Order</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addons.length > 0 ? (
              addons.map((addon: any) => (
                <tr key={addon.id}>
                  <td className="border p-2">
                    {addon.image ? (
                      <img 
                        src={addon.image} 
                        alt={addon.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="border p-2">
                    <div className="font-medium">{addon.title}</div>
                    {addon.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {addon.description.length > 50 
                          ? addon.description.substring(0, 50) + '...' 
                          : addon.description
                        }
                      </div>
                    )}
                  </td>
                  <td className="border p-2">
                    {addon.groupTitle ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {addon.groupTitle}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Ungrouped</span>
                    )}
                  </td>
                  <td className="border p-2">{formatPrice(addon.price)}</td>
                  <td className="border p-2">{addon.sortOrder}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      addon.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {addon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="border p-2">{new Date(addon.createdAt).toLocaleString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <Link 
                        href={`/addons/edit/${addon.id}`}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(addon.id)}
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
                <td colSpan={8} className="border p-2 text-center">No addons found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 