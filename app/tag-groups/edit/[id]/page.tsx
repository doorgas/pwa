'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
}

export default function EditTagGroup() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: '',
    icon: '',
    allowCustomValues: false,
    isRequired: false,
    maxSelections: 0,
    sortOrder: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchTagGroup();
    }
  }, [groupId]);

  const fetchTagGroup = async () => {
    try {
      const response = await fetch(`/api/tag-groups/${groupId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tag group');
      }
      const group: TagGroup = await response.json();
      
      setFormData({
        name: group.name,
        slug: group.slug,
        description: group.description || '',
        color: group.color || '',
        icon: group.icon || '',
        allowCustomValues: group.allowCustomValues,
        isRequired: group.isRequired,
        maxSelections: group.maxSelections,
        sortOrder: group.sortOrder,
        isActive: group.isActive,
      });
      setIsSlugManuallyEdited(true); // Since it's an existing group
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      const response = await fetch(`/api/tag-groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tag group');
      }

      router.push('/tag-groups');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Tag Group</h1>
      
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
            <label className="block text-gray-700 mb-2" htmlFor="name">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              required
              placeholder="e.g., Colors, Sizes, Materials"
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
              placeholder="Brief description of this tag group and its purpose"
            />
          </div>

          {/* Appearance */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Appearance</h3>
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="color">
              Color <span className="text-sm text-gray-500">(Hex code)</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="colorPicker"
                value={formData.color || '#3B82F6'}
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
                placeholder="#3B82F6"
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
              placeholder="e.g., fas fa-palette, heroicon-color-swatch"
            />
          </div>

          {/* Behavior Settings */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Behavior Settings</h3>
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="maxSelections">
              Maximum Selections <span className="text-sm text-gray-500">(0 = unlimited)</span>
            </label>
            <input
              type="number"
              id="maxSelections"
              name="maxSelections"
              value={formData.maxSelections}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              min="0"
              placeholder="0"
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
              placeholder="0"
            />
          </div>

          {/* Checkboxes */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="allowCustomValues"
                checked={formData.allowCustomValues}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">
                Allow Custom Values
                <div className="text-xs text-gray-500">Users can enter custom tag values</div>
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isRequired"
                checked={formData.isRequired}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">
                Required Group
                <div className="text-xs text-gray-500">Products must have at least one tag from this group</div>
              </span>
            </label>

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
                <div className="text-xs text-gray-500">Group is available for use</div>
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
            {submitting ? 'Updating...' : 'Update Tag Group'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/tag-groups')}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}