'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AddonGroup {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AddonGroupsList() {
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/addon-groups');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingGroup ? `/api/addon-groups/${editingGroup.id}` : '/api/addon-groups';
      const method = editingGroup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save group');
      }

      // Reset form and refresh list
      setFormData({ title: '', description: '', sortOrder: 0, isActive: true });
      setShowCreateForm(false);
      setEditingGroup(null);
      fetchGroups();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (group: AddonGroup) => {
    setEditingGroup(group);
    setFormData({
      title: group.title,
      description: group.description || '',
      sortOrder: group.sortOrder,
      isActive: group.isActive,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this addon group? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/addon-groups/${id}`, { 
          method: 'DELETE' 
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete group');
        }
        
        fetchGroups();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ title: '', description: '', sortOrder: 0, isActive: true });
    setShowCreateForm(false);
    setEditingGroup(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Addon Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchGroups}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add New Group
          </button>
          <Link 
            href="/addons" 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Manage Addons
          </Link>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">
            {editingGroup ? 'Edit Addon Group' : 'Create New Addon Group'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="sortOrder">
                  Sort Order
                </label>
                <input
                  type="number"
                  id="sortOrder"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2"
                />
                Active Group
              </label>
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {editingGroup ? 'Update Group' : 'Create Group'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Groups Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-left">Sort Order</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.length > 0 ? (
              groups.map((group) => (
                <tr key={group.id}>
                  <td className="border p-2">
                    <div className="font-medium">{group.title}</div>
                  </td>
                  <td className="border p-2">
                    {group.description ? (
                      <div className="text-sm text-gray-600">
                        {group.description.length > 50 
                          ? group.description.substring(0, 50) + '...' 
                          : group.description
                        }
                      </div>
                    ) : (
                      <span className="text-gray-400">No description</span>
                    )}
                  </td>
                  <td className="border p-2">{group.sortOrder}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      group.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="border p-2">{new Date(group.createdAt).toLocaleString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(group)}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(group.id)}
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
                <td colSpan={6} className="border p-2 text-center">
                  No addon groups found. Create your first group to organize addons.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 