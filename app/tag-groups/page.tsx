'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TagGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  allowCustomValues: boolean;
  isRequired: boolean;
  maxSelections: number;
  sortOrder: number;
  isActive: boolean;
  tags?: any[];
  createdAt: string;
  updatedAt: string;
}

export default function TagGroupsPage() {
  const router = useRouter();
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTagGroups();
  }, []);

  const fetchTagGroups = async () => {
    try {
      const response = await fetch('/api/tag-groups');
      if (!response.ok) {
        throw new Error('Failed to fetch tag groups');
      }
      const data = await response.json();
      setTagGroups(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tag group "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tag-groups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag group');
      }

      // Refresh the list
      fetchTagGroups();
    } catch (err: any) {
      alert(`Error deleting tag group: ${err.message}`);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/tag-groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tag group status');
      }

      // Refresh the list
      fetchTagGroups();
    } catch (err: any) {
      alert(`Error updating tag group: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tag Groups</h1>
        <button
          onClick={() => router.push('/tag-groups/add')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Tag Group
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Group Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Settings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tagGroups.map((group) => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {group.color && (
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: group.color }}
                      ></div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {group.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {group.slug}
                      </div>
                      {group.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {group.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm space-y-1">
                    {group.allowCustomValues && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Custom Values
                      </span>
                    )}
                    {group.isRequired && (
                      <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        Required
                      </span>
                    )}
                    {group.maxSelections > 0 && (
                      <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Max: {group.maxSelections}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {group.tags?.length || 0} tags
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(group.id, group.isActive)}
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      group.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {group.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => router.push(`/tags?groupId=${group.id}`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Manage Tags
                  </button>
                  <button
                    onClick={() => router.push(`/tag-groups/edit/${group.id}`)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(group.id, group.name)}
                    className="text-red-600 hover:text-red-900"
                    disabled={group.tags && group.tags.length > 0}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tagGroups.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No tag groups found</p>
              <p className="text-sm">Create your first tag group to organize product tags.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}