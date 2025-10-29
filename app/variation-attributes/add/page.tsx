'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddVariationAttribute() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'select',
    sortOrder: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });

    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setFormData(prev => ({
        ...prev,
        name: value,
        slug: slug
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        sortOrder: parseInt(formData.sortOrder.toString()),
      };

      const response = await fetch('/api/variation-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create variation attribute');
      }

      router.push('/variation-attributes');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const attributeTypes = [
    { value: 'select', label: 'Dropdown Select', description: 'Standard dropdown selection' },
    { value: 'color', label: 'Color Picker', description: 'Color swatches with hex codes' },
    { value: 'image', label: 'Image Swatch', description: 'Image-based selection' },
    { value: 'button', label: 'Button Style', description: 'Button-style selection' },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Add New Variation Attribute</h1>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="text-blue-500 mr-3 text-xl">💡</div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">Creating Variation Attributes</h3>
            <p className="text-blue-700 text-sm">
              Variation attributes define the different ways products can vary (e.g., Color, Size, Material). 
              After creating an attribute, you'll be able to add specific values to it (e.g., Red, Blue for Color).
            </p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white border rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
                Attribute Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="e.g., Color, Size, Material"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="auto-generated-from-name"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Used in URLs and code (lowercase, no spaces)</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              rows={3}
              placeholder="Describe what this attribute represents..."
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="type">
              Attribute Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              required
            >
              {attributeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div className="mt-2">
              {attributeTypes.map((type) => (
                formData.type === type.value && (
                  <p key={type.value} className="text-sm text-gray-600">
                    {type.description}
                  </p>
                )
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="sortOrder">
                Sort Order
              </label>
              <input
                type="number"
                id="sortOrder"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                min="0"
              />
              <p className="text-sm text-gray-500 mt-1">Lower numbers appear first</p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700 font-medium">Active Attribute</span>
              </label>
              <p className="text-sm text-gray-500 ml-6">Only active attributes can be used in products</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Attribute'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/variation-attributes')}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 