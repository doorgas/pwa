'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface TagGroup {
  id: string;
  name: string;
  color?: string;
  allowCustomValues: boolean;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  groupId: string;
  isCustom: boolean;
  customValue?: string;
  sortOrder: number;
  isActive: boolean;
  group: TagGroup;
  createdAt: string;
  updatedAt: string;
}

export default function TagsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTagGroups();
    fetchTags();
  }, [selectedGroupId]);

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
    }
  };

  const fetchTags = async () => {
    try {
      const url = selectedGroupId === 'all' 
        ? '/api/tags?includeInactive=true'
        : `/api/tags?groupId=${selectedGroupId}&includeInactive=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setTags(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag');
      }

      // Refresh the list
      fetchTags();
    } catch (err: any) {
      alert(`Error deleting tag: ${err.message}`);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tag status');
      }

      // Refresh the list
      fetchTags();
    } catch (err: any) {
      alert(`Error updating tag: ${err.message}`);
    }
  };

  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    if (newGroupId === 'all') {
      router.push('/tags');
    } else {
      router.push(`/tags?groupId=${newGroupId}`);
    }
  };

  const canAddTag = selectedGroupId !== 'all';
  const selectedGroup = tagGroups.find(g => g.id === selectedGroupId);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tags Management</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/tag-groups')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Manage Groups
          </button>
          {canAddTag && (
            <button
              onClick={() => router.push(`/tags/add?groupId=${selectedGroupId}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Tag
            </button>
          )}
        </div>
      </div>

      {/* Group Filter */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <label className="block text-gray-700 mb-2">Filter by Tag Group:</label>
        <select
          value={selectedGroupId}
          onChange={(e) => handleGroupChange(e.target.value)}
          className="w-full md:w-64 p-2 border rounded focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Groups</option>
          {tagGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        
        {selectedGroup && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Group: <strong>{selectedGroup.name}</strong></p>
            {selectedGroup.allowCustomValues && (
              <p className="text-blue-600">✓ Allows custom values</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {!canAddTag && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded">
          Select a specific tag group to add new tags.
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tag Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
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
            {tags.map((tag) => (
              <tr key={tag.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ 
                        backgroundColor: tag.color || tag.group.color || '#3B82F6' 
                      }}
                    ></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {tag.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tag.slug}
                      </div>
                      {tag.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {tag.description}
                        </div>
                      )}
                      {tag.customValue && (
                        <div className="text-xs text-blue-600 mt-1">
                          Custom: {tag.customValue}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {tag.group.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    tag.isCustom
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tag.isCustom ? 'Custom' : 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(tag.id, tag.isActive)}
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      tag.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {tag.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => router.push(`/tags/edit/${tag.id}`)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id, tag.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tags.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg mb-2">
                {selectedGroupId === 'all' 
                  ? 'No tags found' 
                  : `No tags found in ${selectedGroup?.name || 'selected group'}`
                }
              </p>
              <p className="text-sm">
                {canAddTag 
                  ? 'Create your first tag for this group.'
                  : 'Select a tag group to view and manage its tags.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}