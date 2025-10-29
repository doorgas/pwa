'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface VariationAttribute {
  id: string;
  name: string;
  slug: string;
  type: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EditVariationAttribute() {
  const router = useRouter();
  const params = useParams();
  const attributeId = params.id as string;

  const [attribute, setAttribute] = useState<VariationAttribute | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'text',
    description: '',
    isActive: true
  });

  const attributeTypes = [
    { value: 'text', label: 'Text', description: 'Simple text values (e.g., Small, Medium, Large)' },
    { value: 'color', label: 'Color', description: 'Color swatches with hex codes' },
    { value: 'image', label: 'Image', description: 'Image-based selection' },
    { value: 'size', label: 'Size', description: 'Size variations (e.g., XS, S, M, L, XL)' },
    { value: 'material', label: 'Material', description: 'Material types (e.g., Cotton, Silk, Wool)' },
    { value: 'style', label: 'Style', description: 'Style variations' },
    { value: 'pattern', label: 'Pattern', description: 'Pattern types (e.g., Solid, Striped, Floral)' },
    { value: 'finish', label: 'Finish', description: 'Surface finish (e.g., Matte, Glossy, Satin)' }
  ];

  useEffect(() => {
    if (attributeId) {
      fetchAttribute();
    }
  }, [attributeId]);

  const fetchAttribute = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/variation-attributes/${attributeId}`);
      if (!response.ok) {
        throw new Error('Attribute not found');
      }
      const data = await response.json();
      setAttribute(data);
      setFormData({
        name: data.name,
        slug: data.slug,
        type: data.type,
        description: data.description || '',
        isActive: data.isActive
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Auto-generate slug from name
      if (name === 'name') {
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        setFormData(prev => ({ ...prev, slug }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/variation-attributes/${attributeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update attribute');
      }

      router.push('/variation-attributes');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading attribute...</div>;
  if (error && !attribute) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  if (!attribute) return <div className="p-8 text-center">Attribute not found</div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">✏️ Edit Variation Attribute</h1>
        <button
          onClick={() => router.push('/variation-attributes')}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          ← Back to Attributes
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2">
                Attribute Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Color, Size, Material"
                required
              />
              <div className="text-sm text-gray-500 mt-1">
                The display name for this attribute
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                placeholder="e.g., color, size, material"
                required
              />
              <div className="text-sm text-gray-500 mt-1">
                URL-friendly version (auto-generated from name)
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">
                Attribute Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                required
              >
                {attributeTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="text-sm text-gray-500 mt-1">
                {attributeTypes.find(t => t.value === formData.type)?.description}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Status</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700">Active</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Inactive attributes won't be available for product creation
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Optional description for this attribute..."
            />
          </div>

          {/* Attribute Type Preview */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Frontend UI Preview:</h3>
            <div className="text-sm text-blue-700">
              {formData.type === 'color' && (
                <div>
                  <span className="font-medium">Color Swatches:</span> Values will display as clickable color circles with hex codes
                </div>
              )}
              {formData.type === 'image' && (
                <div>
                  <span className="font-medium">Image Selection:</span> Values will display as clickable image thumbnails
                </div>
              )}
              {(formData.type === 'text' || formData.type === 'size' || formData.type === 'material' || formData.type === 'style' || formData.type === 'pattern' || formData.type === 'finish') && (
                <div>
                  <span className="font-medium">
                    {attributeTypes.find(t => t.value === formData.type)?.label} Selection:
                  </span> Values with ≤5 options show as radio buttons, &gt;5 options show as dropdown
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Attribute'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/variation-attributes')}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => router.push(`/variation-attributes/${attributeId}/values`)}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Manage Values →
            </button>
          </div>
        </form>
      </div>

      {/* Current Values Preview */}
      <div className="mt-6 bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Current Attribute Values</h3>
          <button
            onClick={() => router.push(`/variation-attributes/${attributeId}/values`)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            Manage Values
          </button>
        </div>
        <div className="text-sm text-gray-600">
          Click "Manage Values" to add, edit, or remove values for this attribute.
        </div>
      </div>
    </div>
  );
} 