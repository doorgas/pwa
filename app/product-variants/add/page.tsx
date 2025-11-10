'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '../../components/ImageUploader';

export default function AddProductVariant() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    productId: '',
    sku: '',
    title: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    weight: '',
    image: '',
    position: 0,
    inventoryQuantity: 0,
    inventoryManagement: true,
    allowBackorder: false,
    isActive: true,
  });
  const [variantOptions, setVariantOptions] = useState<{[key: string]: string}>({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleVariantOptionChange = (key: string, value: string) => {
    setVariantOptions({
      ...variantOptions,
      [key]: value
    });
  };

  const addVariantOption = () => {
    const newKey = `option_${Object.keys(variantOptions).length + 1}`;
    setVariantOptions({
      ...variantOptions,
      [newKey]: ''
    });
  };

  const removeVariantOption = (key: string) => {
    const newOptions = { ...variantOptions };
    delete newOptions[key];
    setVariantOptions(newOptions);
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
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        position: parseInt(formData.position.toString()),
        inventoryQuantity: parseInt(formData.inventoryQuantity.toString()),
        variantOptions: Object.keys(variantOptions).length > 0 ? variantOptions : null,
      };

      const response = await fetch('/api/product-variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create product variant');
      }

      router.push('/product-variants');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Product Variant</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="productId">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select a product</option>
                {products.map((product: any) => (
                  <option key={product.product.id} value={product.product.id}>
                    {product.product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="title">
                Variant Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Red / Large"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="sku">
                SKU
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="position">
                Position
              </label>
              <input
                type="number"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing & Inventory</h3>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="price">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="comparePrice">
                Compare Price
              </label>
              <input
                type="number"
                id="comparePrice"
                name="comparePrice"
                value={formData.comparePrice}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="costPrice">
                Cost Price
              </label>
              <input
                type="number"
                id="costPrice"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="inventoryQuantity">
                Inventory Quantity
              </label>
              <input
                type="number"
                id="inventoryQuantity"
                name="inventoryQuantity"
                value={formData.inventoryQuantity}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                min="0"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="weight">
                Weight (kg)
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Variant Image */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Variant Image</h3>
          <ImageUploader
            currentImage={formData.image}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            label="Variant Image"
            disabled={submitting}
            directory="products"
          />
        </div>

        {/* Variant Options */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Variant Options</h3>
          <div className="space-y-3">
            {Object.entries(variantOptions).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Option name (e.g., Color)"
                  value={key.replace('option_', '')}
                  onChange={(e) => {
                    const newOptions = { ...variantOptions };
                    delete newOptions[key];
                    newOptions[`option_${e.target.value}`] = value;
                    setVariantOptions(newOptions);
                  }}
                  className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Option value (e.g., Red)"
                  value={value}
                  onChange={(e) => handleVariantOptionChange(key, e.target.value)}
                  className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeVariantOption(key)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addVariantOption}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Option
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="inventoryManagement"
                checked={formData.inventoryManagement}
                onChange={handleChange}
                className="mr-2"
              />
              Track Inventory
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="allowBackorder"
                checked={formData.allowBackorder}
                onChange={handleChange}
                className="mr-2"
              />
              Allow Backorder
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="mr-2"
              />
              Active
            </label>
          </div>
        </div>
        
        <div className="flex gap-4 mt-8">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Variant'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/product-variants')}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 