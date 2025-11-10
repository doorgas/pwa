'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CurrencySymbol from '../../components/CurrencySymbol';

export default function AddInventory() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    productId: '',
    variantId: '',
    quantity: 0,
    reservedQuantity: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
    location: '',
    supplier: '',
    lastRestockDate: '',
    costPrice: 0,
    notes: ''
  });
  
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.productId) {
      fetchProductVariants(formData.productId);
      const product = products.find((p: any) => p.product.id === formData.productId);
      setSelectedProduct(product);
    } else {
      setVariants([]);
      setSelectedProduct(null);
    }
  }, [formData.productId, products]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductVariants = async (productId: string) => {
    try {
      const response = await fetch(`/api/product-variants?productId=${productId}`);
      const data = await response.json();
      setVariants(data);
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    });
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    setFormData({
      ...formData,
      productId,
      variantId: '', // Reset variant when product changes
    });
  };

  const calculateAvailableQuantity = () => {
    return Math.max(0, formData.quantity - formData.reservedQuantity);
  };

  const getStockStatus = () => {
    const available = calculateAvailableQuantity();
    if (available <= 0) {
      return { status: 'Out of Stock', color: 'text-red-600' };
    } else if (available <= formData.reorderPoint) {
      return { status: 'Low Stock', color: 'text-yellow-600' };
    } else {
      return { status: 'In Stock', color: 'text-green-600' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Validation
    if (!formData.productId) {
      setError('Please select a product');
      setSubmitting(false);
      return;
    }

    // If the product has variants, require variant selection
    if (variants.length > 0 && !formData.variantId) {
      setError('Please select a variant for this variable product');
      setSubmitting(false);
      return;
    }

    try {
      const submitData = {
        ...formData,
        variantId: formData.variantId || null,
        lastRestockDate: formData.lastRestockDate || null,
      };

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create inventory record');
      }

      router.push('/inventory');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const stockStatus = getStockStatus();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📦 Add Inventory Record</h1>
        <button
          onClick={() => router.push('/inventory')}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          ← Back to Inventory
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6">
            {/* Product Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Product Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="productId">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="productId"
                    name="productId"
                    value={formData.productId}
                    onChange={handleProductChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a product...</option>
                    {products.map((product: any) => (
                      <option key={product.product.id} value={product.product.id}>
                        {product.product.name} {product.product.sku && `(${product.product.sku})`}
                      </option>
                    ))}
                  </select>
                </div>

                {variants.length > 0 && (
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="variantId">
                      Variant <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="variantId"
                      name="variantId"
                      value={formData.variantId}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                      required={variants.length > 0}
                    >
                      <option value="">Select a variant...</option>
                      {variants.map((variant: any) => (
                        <option key={variant.variant.id} value={variant.variant.id}>
                          {variant.variant.title} {variant.variant.sku && `(${variant.variant.sku})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium text-gray-700 mb-2">Product Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium">{selectedProduct.product.productType || 'Simple'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <span className="ml-2 font-medium">${selectedProduct.product.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-2 font-medium">{selectedProduct.category?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className={`ml-2 font-medium ${selectedProduct.product.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedProduct.product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Inventory Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Inventory Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="quantity">
                    Total Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="reservedQuantity">
                    Reserved Quantity
                  </label>
                  <input
                    type="number"
                    id="reservedQuantity"
                    name="reservedQuantity"
                    value={formData.reservedQuantity}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Quantity reserved for orders</p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="reorderPoint">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    id="reorderPoint"
                    name="reorderPoint"
                    value={formData.reorderPoint}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert when stock reaches this level</p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="reorderQuantity">
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    id="reorderQuantity"
                    name="reorderQuantity"
                    value={formData.reorderQuantity}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Suggested quantity to reorder</p>
                </div>
              </div>
            </div>

            {/* Location and Supplier */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Location & Supplier</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="location">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Warehouse A, Shelf 3"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="supplier">
                    Supplier
                  </label>
                  <input
                    type="text"
                    id="supplier"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="lastRestockDate">
                    Last Restock Date
                  </label>
                  <input
                    type="date"
                    id="lastRestockDate"
                    name="lastRestockDate"
                    value={formData.lastRestockDate}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="costPrice">
                    Cost Price per Unit
                  </label>
                  <input
                    type="number"
                    id="costPrice"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Additional notes about this inventory record..."
              />
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Inventory Record'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/inventory')}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Summary Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">📊 Inventory Summary</h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-sm text-gray-600">Total Quantity</div>
                <div className="text-2xl font-bold text-blue-800">{formData.quantity}</div>
              </div>

              <div className="p-3 bg-orange-50 rounded">
                <div className="text-sm text-gray-600">Reserved</div>
                <div className="text-2xl font-bold text-orange-800">{formData.reservedQuantity}</div>
              </div>

              <div className="p-3 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Available</div>
                <div className="text-2xl font-bold text-green-800">{calculateAvailableQuantity()}</div>
              </div>

              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Status</div>
                <div className={`text-lg font-bold ${stockStatus.color}`}>{stockStatus.status}</div>
              </div>

              {formData.costPrice > 0 && (
                <div className="p-3 bg-purple-50 rounded">
                  <div className="text-sm text-gray-600">Total Value</div>
                  <div className="text-2xl font-bold text-purple-800">
                    <span className="flex items-center gap-1"><CurrencySymbol />{(formData.quantity * formData.costPrice).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {formData.reorderPoint > 0 && calculateAvailableQuantity() <= formData.reorderPoint && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400">
                  <div className="text-yellow-800">
                    <strong>⚠️ Reorder Alert</strong>
                    <div className="text-sm mt-1">
                      Stock is at or below reorder point ({formData.reorderPoint})
                    </div>
                    {formData.reorderQuantity > 0 && (
                      <div className="text-sm">
                        Suggested reorder: {formData.reorderQuantity} units
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 