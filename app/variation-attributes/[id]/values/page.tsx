'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ImageUploader from '../../../components/ImageUploader';

export default function ManageAttributeValues() {
  const params = useParams();
  const router = useRouter();
  const attributeId = params.id as string;
  
  const [attribute, setAttribute] = useState<any>(null);
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    value: '',
    slug: '',
    colorCode: '',
    image: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttributeAndValues();
  }, [attributeId]);

  const fetchAttributeAndValues = async () => {
    setLoading(true);
    try {
      const [attrRes, valuesRes] = await Promise.all([
        fetch(`/api/variation-attributes/${attributeId}`),
        fetch(`/api/variation-attribute-values?attributeId=${attributeId}`)
      ]);
      
      const attrData = await attrRes.json();
      const valuesData = await valuesRes.json();
      
      setAttribute(attrData);
      setValues(valuesData);
    } catch (err) {
      console.error(err);
      setError('Failed to load attribute data');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });

    // Auto-generate slug from value
    if (name === 'value') {
      const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setFormData(prev => ({
        ...prev,
        value: value,
        slug: slug
      }));
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setFormData({ ...formData, image: imageUrl });
  };

  const handleImageRemove = () => {
    setFormData({ ...formData, image: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        attributeId,
        sortOrder: parseInt(formData.sortOrder.toString()),
      };

      const response = await fetch('/api/variation-attribute-values', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create attribute value');
      }

      // Reset form and refresh data
      setFormData({
        value: '',
        slug: '',
        colorCode: '',
        image: '',
        description: '',
        sortOrder: 0,
        isActive: true,
      });
      setShowAddForm(false);
      fetchAttributeAndValues();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (valueId: string) => {
    if (confirm('Are you sure you want to delete this attribute value?')) {
      try {
        await fetch(`/api/variation-attribute-values/${valueId}`, { method: 'DELETE' });
        setValues(values.filter((val: any) => val.value.id !== valueId));
      } catch (error) {
        console.error('Error deleting attribute value:', error);
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Loading attribute values...</div>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => router.push('/variation-attributes')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back to Attributes
        </button>
        <h1 className="text-2xl font-bold">
          Manage Values for "{attribute?.name}"
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Attribute Info */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{attribute?.name}</h3>
            <p className="text-gray-600">Type: {attribute?.type} • Slug: {attribute?.slug}</p>
            {attribute?.description && (
              <p className="text-gray-600 mt-1">{attribute.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Value'}
          </button>
        </div>
      </div>

      {/* Add Value Form */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Value</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2" htmlFor="value">
                  Value Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleFormChange}
                  className="w-full p-3 border rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Red, Large, Cotton"
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
                  onChange={handleFormChange}
                  className="w-full p-3 border rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {attribute?.type === 'color' && (
              <div>
                <label className="block text-gray-700 font-medium mb-2" htmlFor="colorCode">
                  Color Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="colorCode"
                    name="colorCode"
                    value={formData.colorCode}
                    onChange={handleFormChange}
                    className="w-16 h-10 border rounded"
                  />
                  <input
                    type="text"
                    name="colorCode"
                    value={formData.colorCode}
                    onChange={handleFormChange}
                    className="flex-1 p-3 border rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="#FF0000"
                  />
                </div>
              </div>
            )}

            {attribute?.type === 'image' && (
              <div>
                <ImageUploader
                  currentImage={formData.image}
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  label="Value Image"
                  disabled={submitting}
                  directory="products"
                />
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                className="w-full p-3 border rounded-lg focus:border-blue-500 focus:outline-none"
                rows={2}
              />
            </div>

            <div className="flex gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2" htmlFor="sortOrder">
                  Sort Order
                </label>
                <input
                  type="number"
                  id="sortOrder"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleFormChange}
                  className="w-32 p-3 border rounded-lg focus:border-blue-500 focus:outline-none"
                  min="0"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Value'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Values List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">
            Attribute Values ({values.length})
          </h3>
        </div>

        {values.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Preview</th>
                  <th className="text-left p-3">Value</th>
                  <th className="text-left p-3">Slug</th>
                  {attribute?.type === 'color' && <th className="text-left p-3">Color Code</th>}
                  <th className="text-left p-3">Sort Order</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {values.map((item: any) => (
                  <tr key={item.value.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      {attribute?.type === 'color' && item.value.colorCode ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-8 h-8 rounded border border-gray-300"
                            style={{ backgroundColor: item.value.colorCode }}
                          />
                          <span className="text-sm text-gray-600">{item.value.colorCode}</span>
                        </div>
                      ) : attribute?.type === 'image' && item.value.image ? (
                        <img 
                          src={item.value.image} 
                          alt={item.value.value}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 font-medium">{item.value.value}</td>
                    <td className="p-3 text-gray-600 font-mono text-sm">{item.value.slug}</td>
                    {attribute?.type === 'color' && (
                      <td className="p-3 text-gray-600 font-mono text-sm">
                        {item.value.colorCode || '-'}
                      </td>
                    )}
                    <td className="p-3">{item.value.sortOrder}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.value.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.value.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete(item.value.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No values found for this attribute. Add your first value to get started!
          </div>
        )}
      </div>
    </div>
  );
} 