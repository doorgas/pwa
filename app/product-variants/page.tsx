'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../components/CurrencySymbol';

export default function ProductVariantsList() {
  const [variants, setVariants] = useState([]);
  const [filteredVariants, setFilteredVariants] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [groupByProduct, setGroupByProduct] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Check for productId in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');
    if (productId) {
      setProductFilter(productId);
      setGroupByProduct(true); // Default to grouped view when filtering by product
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [variantsRes, productsRes] = await Promise.all([
        fetch('/api/product-variants'),
        fetch('/api/products')
      ]);
      
      const variantsData = await variantsRes.json();
      const productsData = await productsRes.json();
      
      setVariants(variantsData);
      setFilteredVariants(variantsData);
      setProducts(productsData);
      setSelectedVariants(new Set()); // Clear selections on refresh
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterVariants();
    // Clear selections when filters change
    setSelectedVariants(new Set());
  }, [variants, searchTerm, productFilter, stockFilter]);

  const filterVariants = () => {
    let filtered = variants;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((item: any) =>
        item.variant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variant.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Product filter
    if (productFilter) {
      filtered = filtered.filter((item: any) => item.variant.productId === productFilter);
    }

    // Stock status filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter((item: any) => {
        const stockStatus = getStockStatus(item.variant.inventoryQuantity);
        return stockStatus.status.toLowerCase().replace(' ', '') === stockFilter;
      });
    }

    setFilteredVariants(filtered);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product variant?')) {
      try {
        await fetch(`/api/product-variants/${id}`, { method: 'DELETE' });
        setVariants(variants.filter((variant: any) => variant.variant.id !== id));
      } catch (error) {
        console.error('Error deleting product variant:', error);
      }
    }
  };

  const handleSelectVariant = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedVariants.size === filteredVariants.length) {
      // If all are selected, deselect all
      setSelectedVariants(new Set());
    } else {
      // Select all filtered variants
      const allIds = new Set(filteredVariants.map((item: any) => item.variant.id));
      setSelectedVariants(allIds);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVariants.size === 0) {
      alert('Please select variants to delete');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedVariants.size} selected variant(s)?`)) {
      setIsDeleting(true);
      try {
        const response = await fetch('/api/product-variants', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: Array.from(selectedVariants) }),
        });

        if (response.ok) {
          // Remove deleted variants from state
          setVariants(variants.filter((variant: any) => !selectedVariants.has(variant.variant.id)));
          setSelectedVariants(new Set());
        } else {
          const error = await response.json();
          alert(`Error deleting variants: ${error.error}`);
        }
      } catch (error) {
        console.error('Error deleting variants:', error);
        alert('Error deleting variants');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatPrice = (price: string) => {
    return (
      <span className="flex items-center gap-1">
        <CurrencySymbol />
        {parseFloat(price).toFixed(2)}
      </span>
    );
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= 10) return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const getVariantsByProduct = () => {
    const grouped = filteredVariants.reduce((acc: any, item: any) => {
      const productId = item.variant.productId;
      const productName = item.product?.name || 'Unknown Product';
      
      if (!acc[productId]) {
        acc[productId] = {
          productName,
          productType: item.product?.productType || 'simple',
          variants: []
        };
      }
      acc[productId].variants.push(item);
      return acc;
    }, {});

    return Object.entries(grouped);
  };

  const getTotalValue = () => {
    return filteredVariants.reduce((total: number, item: any) => {
      const price = parseFloat(item.variant.price || '0');
      return total + (item.variant.inventoryQuantity * price);
    }, 0);
  };

  if (loading) return <div className="p-8 text-center">Loading variants...</div>;

  const groupedVariants = groupByProduct ? getVariantsByProduct() : null;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🔧 Product Variants</h1>
        <div className="flex gap-2">
          {selectedVariants.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? 'Deleting...' : `🗑️ Delete Selected (${selectedVariants.size})`}
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/product-variants/add" 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            ➕ Add Variant
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">{variants.length}</div>
          <div className="text-blue-600">Total Variants</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-800">
            {variants.filter((item: any) => item.variant.inventoryQuantity > 10).length}
          </div>
          <div className="text-green-600">In Stock</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-800">
            {variants.filter((item: any) => 
              item.variant.inventoryQuantity > 0 && item.variant.inventoryQuantity <= 10
            ).length}
          </div>
          <div className="text-yellow-600">Low Stock</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-800"><CurrencySymbol />{getTotalValue().toFixed(2)}</div>
          <div className="text-purple-600">Total Value</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search variants, SKUs, or products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Products</option>
              {products.map((product: any) => (
                <option key={product.product.id} value={product.product.id}>
                  {product.product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="instock">In Stock</option>
              <option value="lowstock">Low Stock</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setGroupByProduct(!groupByProduct)}
                className={`px-3 py-2 rounded text-sm ${
                  groupByProduct 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {groupByProduct ? '📋 List View' : '📦 Group by Product'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Variants Display */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {groupByProduct && groupedVariants ? (
          // Grouped view
          <div className="divide-y">
            {groupedVariants.map(([productId, group]: [string, any]) => (
              <div key={productId} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    📦 {group.productName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      group.productType === 'variable' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.productType}
                    </span>
                    <span className="text-sm text-gray-500">
                      {group.variants.length} variants
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.variants.map((item: any) => {
                    const stockStatus = getStockStatus(item.variant.inventoryQuantity);
                    return (
                      <div key={item.variant.id} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedVariants.has(item.variant.id)}
                              onChange={() => handleSelectVariant(item.variant.id)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.variant.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {item.variant.sku || 'N/A'}
                            </div>
                            <div className="text-sm font-semibold text-green-600 mt-1">
                              {formatPrice(item.variant.price)}
                            </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${stockStatus.color}`}>
                                  {item.variant.inventoryQuantity} in stock
                                </span>
                              </div>
                            </div>
                          </div>
                          {item.variant.image && (
                            <img 
                              src={item.variant.image} 
                              alt={item.variant.title}
                              className="w-12 h-12 object-cover rounded ml-2"
                            />
                          )}
                        </div>
                        <div className="flex gap-1 mt-3">
                          <Link 
                            href={`/product-variants/edit/${item.variant.id}`}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            Edit
                          </Link>
                          <button 
                            onClick={() => handleDelete(item.variant.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Table view
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border-b p-3 text-left font-semibold">
                    <input
                      type="checkbox"
                      checked={filteredVariants.length > 0 && selectedVariants.size === filteredVariants.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="border-b p-3 text-left font-semibold">Image</th>
                  <th className="border-b p-3 text-left font-semibold">Product</th>
                  <th className="border-b p-3 text-left font-semibold">Variant Title</th>
                  <th className="border-b p-3 text-left font-semibold">SKU</th>
                  <th className="border-b p-3 text-left font-semibold">Price</th>
                  <th className="border-b p-3 text-left font-semibold">Inventory</th>
                  <th className="border-b p-3 text-left font-semibold">Stock Status</th>
                  <th className="border-b p-3 text-left font-semibold">Status</th>
                  <th className="border-b p-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVariants.length > 0 ? (
                  filteredVariants.map((item: any) => {
                    const stockStatus = getStockStatus(item.variant.inventoryQuantity);
                    
                    return (
                      <tr key={item.variant.id} className="hover:bg-gray-50">
                        <td className="border-b p-3">
                          <input
                            type="checkbox"
                            checked={selectedVariants.has(item.variant.id)}
                            onChange={() => handleSelectVariant(item.variant.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="border-b p-3">
                          {item.variant.image ? (
                            <img 
                              src={item.variant.image} 
                              alt={item.variant.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                              No Image
                            </div>
                          )}
                        </td>
                        <td className="border-b p-3">
                          <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                          <div className="text-sm text-gray-500">
                            {item.product?.productType === 'variable' ? 'Variable Product' : 'Simple Product'}
                          </div>
                        </td>
                        <td className="border-b p-3">
                          <div className="font-medium">{item.variant.title}</div>
                          {item.variant.variantOptions && (
                            <div className="text-xs text-gray-500 mt-1">
                              {Object.entries(JSON.parse(item.variant.variantOptions)).map(([key, value]) => 
                                `${key}: ${value}`
                              ).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="border-b p-3 font-mono text-sm">{item.variant.sku || 'N/A'}</td>
                        <td className="border-b p-3 font-semibold">{formatPrice(item.variant.price)}</td>
                        <td className="border-b p-3">
                          <span className="font-semibold">{item.variant.inventoryQuantity}</span>
                        </td>
                        <td className="border-b p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.status}
                          </span>
                        </td>
                        <td className="border-b p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.variant.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.variant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="border-b p-3">
                          <div className="flex gap-1">
                            <Link 
                              href={`/product-variants/edit/${item.variant.id}`}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                            >
                              Edit
                            </Link>
                            <button 
                              onClick={() => handleDelete(item.variant.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="border-b p-8 text-center text-gray-500">
                      {searchTerm || productFilter || stockFilter !== 'all'
                        ? 'No variants match your filters'
                        : 'No product variants found'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {filteredVariants.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-semibold text-blue-800">Variable Products</div>
            <div className="text-sm text-blue-600">
              {new Set(filteredVariants.filter((item: any) => 
                item.product?.productType === 'variable'
              ).map((item: any) => item.variant.productId)).size} products with variants
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-semibold text-green-800">Average Price</div>
            <div className="text-sm text-green-600">
              ${(filteredVariants.reduce((sum: number, item: any) => 
                sum + parseFloat(item.variant.price), 0) / filteredVariants.length || 0
              ).toFixed(2)}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="font-semibold text-purple-800">Total Inventory</div>
            <div className="text-sm text-purple-600">
              {filteredVariants.reduce((sum: number, item: any) => 
                sum + item.variant.inventoryQuantity, 0
              )} units across all variants
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 