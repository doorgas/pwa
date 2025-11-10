'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface TagGroup {
  id: string;
  name: string;
  color?: string;
  allowCustomValues: boolean;
  isActive: boolean;
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
}

export default function EditTag() {
  const router = useRouter();
  const params = useParams();
  const tagId = params.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: '',
    icon: '',
    groupId: '',
    isCustom: false,
    customValue: '',
    sortOrder: 0,
    isActive: true,
  });
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (tagId) {
      fetchTag();
      fetchTagGroups();
    }
  }, [tagId]);

  const fetchTag = async () => {
    try {
      const response = await fetch(`/api/tags/${tagId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tag');
      }
      const tag: Tag = await response.json();
      
      setFormData({
        name: tag.name,
        slug: tag.slug,
        description: tag.description || '',
        color: tag.color || '',
        icon: tag.icon || '',
        groupId: tag.groupId,
        isCustom: tag.isCustom,
        customValue: tag.customValue || '',
        sortOrder: tag.sortOrder,
        isActive: tag.isActive,
      });
      setIsSlugManuallyEdited(true); // Since it's an existing tag
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTagGroups = async () => {
    try {
      const response = await fetch('/api/tag-groups');
      if (!response.ok) {
        throw new Error('Failed to fetch tag groups');
      }
      const data = await response.json();
      setTagGroups(data.filter((group: TagGroup) => group.isActive));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle slug field separately to track manual edits
    if (name === 'slug') {
      setIsSlugManuallyEdited(true);
      setFormData({
        ...formData,
        [name]: generateSlug(value)
      });
      return;
    }
    
    // Auto-generate slug from name if it hasn't been manually edited
    if (name === 'name' && !isSlugManuallyEdited) {
      setFormData({
        ...formData,
        [name]: value,
        slug: generateSlug(value)
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? parseInt(value) || 0 : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tag');
      }

      // Redirect back to tags list with the group filter
      router.push(`/tags?groupId=${formData.groupId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGroup = tagGroups.find(g => g.id === formData.groupId);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Tag</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Basic Information</h3>
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="groupId">
              Tag Group <span className="text-red-500">*</span>
            </label>
            <select
              id="groupId"
              name="groupId"
              value={formData.groupId}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">Select a tag group</option>
              {tagGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {selectedGroup && (
              <div className="mt-2 text-sm text-gray-600">
                {selectedGroup.allowCustomValues && (
                  <p className="text-blue-600">✓ This group allows custom values</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="name">
              Tag Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              required
              placeholder="e.g., Red, Large, Cotton"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="slug">
              Slug <span className="text-sm text-gray-500">(URL-friendly identifier)</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              placeholder="auto-generated-from-name"
            />
          </div>

          <div className="md:col-span-2">
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
              placeholder="Brief description of this tag"
            />
          </div>

          {/* Appearance */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Appearance (Optional)</h3>
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="color">
              Color <span className="text-sm text-gray-500">(Override group color)</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="colorPicker"
                value={formData.color || selectedGroup?.color || '#3B82F6'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                id="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
                placeholder="Inherits from group"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="icon">
              Icon <span className="text-sm text-gray-500">(CSS class or icon name)</span>
            </label>
            <input
              type="text"
              id="icon"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              placeholder="e.g., fas fa-circle, heroicon-swatch"
            />
          </div>

          {/* Custom Value Support */}
          {selectedGroup?.allowCustomValues && (
            <>
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Custom Value Support</h3>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isCustom"
                    checked={formData.isCustom}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    This is a custom tag
                    <div className="text-xs text-gray-500">Check this if this tag represents a custom value</div>
                  </span>
                </label>
              </div>

              {formData.isCustom && (
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="customValue">
                    Custom Value
                  </label>
                  <input
                    type="text"
                    id="customValue"
                    name="customValue"
                    value={formData.customValue}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    placeholder="The actual custom value if different from name"
                  />
                </div>
              )}
            </>
          )}

          {/* Settings */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Settings</h3>
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
              placeholder="0"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">
                Active
                <div className="text-xs text-gray-500">Tag is available for use</div>
              </span>
            </label>
          </div>
        </div>
        
        <div className="flex gap-4 mt-8">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Tag'}
          </button>
          <button
            type="button"
            onClick={() => router.push(formData.groupId ? `/tags?groupId=${formData.groupId}` : '/tags')}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}