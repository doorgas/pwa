'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '../../components/ImageUploader';
import RichTextEditor from '../../components/RichTextEditor';
import { generateSlug, isValidSlug } from '../../../utils/priceUtils';

export default function AddCategory() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    iconName: '',
    isFeatured: false,
    parentId: '',
    sortOrder: 0,
    isActive: true,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle slug field separately to track manual edits
    if (name === 'slug') {
      setIsSlugManuallyEdited(true);
      setFormData({
        ...formData,
        [name]: generateSlug(value) // Always generate valid slug even when manually edited
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
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
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
        sortOrder: parseInt(formData.sortOrder.toString()),
        parentId: formData.parentId || null,
      };

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create category');
      }

      router.push('/categories');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Category</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="name">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="slug">
            Slug <span className="text-sm text-gray-500">(SEO-friendly URL)</span>
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            className={`w-full p-2 border rounded focus:outline-none transition-colors ${
              formData.slug && !isValidSlug(formData.slug) 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder="auto-generated-from-category-name"
          />
          {formData.slug && (
            <div className="mt-1">
              {isValidSlug(formData.slug) ? (
                <p className="text-sm text-green-600 flex items-center">
                  <span className="mr-1">✓</span>
                  Preview URL: /categories/{formData.slug}
                </p>
              ) : (
                <p className="text-sm text-red-600 flex items-center">
                  <span className="mr-1">✗</span>
                  Invalid slug. Only lowercase letters, numbers, and hyphens allowed.
                </p>
              )}
            </div>
          )}
          {!isSlugManuallyEdited && (
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated from category name. You can edit it manually.
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="iconName">
            Category Icon Name <span className="text-sm text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            id="iconName"
            name="iconName"
            value={formData.iconName}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
            placeholder="e.g., shopping-cart, laptop, shirt, etc."
          />
          <p className="text-xs text-gray-500 mt-1">
            Icon name for displaying category icons (e.g., FontAwesome or similar icon library names)
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="description">
            Description
          </label>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Enter a description for this category..."
            height="200px"
          />
        </div>

        <div className="mb-4">
          <ImageUploader
            currentImage={formData.image}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            label="Category Image"
            disabled={submitting}
            directory="products"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="parentId">
            Parent Category (Optional)
          </label>
          <select
            id="parentId"
            name="parentId"
            value={formData.parentId}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
          >
            <option value="">No Parent Category</option>
            {categories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
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

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isFeatured"
              checked={formData.isFeatured}
              onChange={handleChange}
              className="mr-2"
            />
            Featured Category
          </label>
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="mr-2"
            />
            Active Category
          </label>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Category'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/categories')}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 