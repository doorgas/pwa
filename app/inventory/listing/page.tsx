'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  formatWeightAuto, 
  isWeightBasedProduct, 
  convertToGrams,
  getWeightStockStatus
} from '@/utils/weightUtils';

interface ProductInventory {
  productId: string;
  productName: string;
  productSku: string;
  productType: string;
  categoryName: string;
  isActive: boolean;
  // Weight-based stock management fields
  stockManagementType?: string;
  pricePerUnit?: number;
  baseWeightUnit?: string;
  variants?: {
    variantId: string;
    variantTitle: string;
    variantSku: string;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    reorderPoint: number;
    // Weight-based fields
    currentWeight: number;
    reservedWeight: number;
    availableWeight: number;
    reorderWeightPoint: number;
    lastRestocked: string | null;
    isActive: boolean;
  }[];
  simpleStock?: {
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    reorderPoint: number;
    // Weight-based fields
    currentWeight: number;
    reservedWeight: number;
    availableWeight: number;
    reorderWeightPoint: number;
    lastRestocked: string | null;
  };
}

interface QuickStockUpdate {
  productId: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  currentStock: number;
  // Weight-based fields
  isWeightBased: boolean;
  currentWeight?: number;
  stockManagementType?: string;
}

export default function InventoryListing() {
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<ProductInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  
  // Quick add stock modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddData, setQuickAddData] = useState<QuickStockUpdate | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({
    quantity: 0,
    reason: 'Purchase Order',
    reference: '',
    location: '',
    // Weight-based fields
    weightQuantity: '',
    weightUnit: 'grams' as 'grams' | 'kg'
  });
  const [submitting, setSubmitting] = useState(false);

  const stockReasons = [
    'Purchase Order',
    'Stock Return',
    'Initial Stock',
    'Transfer In',
    'Supplier Return',
    'Production Complete',
    'Stock Count Correction',
    'Other'
  ];

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchTerm, categoryFilter, stockFilter, productTypeFilter]);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      // Use the new inventory listing API endpoint
      const response = await fetch('/api/inventory/listing');
      const inventoryData = await response.json();
      
      if (!response.ok) {
        throw new Error(inventoryData.error || 'Failed to fetch inventory data');
      }

      setInventory(inventoryData);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    let filtered = inventory;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.variants && item.variants.some(v => 
          v.variantTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.variantSku.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.categoryName === categoryFilter);
    }

    // Product type filter
    if (productTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.productType === productTypeFilter);
    }

    // Stock status filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (item.productType === 'simple' && item.simpleStock) {
          const status = getStockStatus(item.simpleStock.availableStock, item.simpleStock.reorderPoint);
          const statusText = typeof status === 'string' ? status : status.status;
          return statusText.toLowerCase().replace(' ', '') === stockFilter;
        } else if (item.variants) {
          return item.variants.some(variant => {
            const status = getStockStatus(variant.availableStock, variant.reorderPoint);
            const statusText = typeof status === 'string' ? status : status.status;
            return statusText.toLowerCase().replace(' ', '') === stockFilter;
          });
        }
        return false;
      });
    }

    setFilteredInventory(filtered);
  };

  const getStockStatus = (availableStock: number, reorderPoint: number, isWeightBased: boolean = false, availableWeight?: number, reorderWeightPoint?: number) => {
    if (isWeightBased && availableWeight !== undefined && reorderWeightPoint !== undefined) {
      return getWeightStockStatus(availableWeight, reorderWeightPoint);
    }
    if (availableStock <= 0) return 'Out of Stock';
    if (availableStock <= reorderPoint) return 'Low Stock';
    return 'In Stock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'In Stock': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openQuickAdd = (productId: string, productName: string, variantId?: string, variantTitle?: string, currentStock?: number, stockManagementType?: string, currentWeight?: number) => {
    const isWeightBased = isWeightBasedProduct(stockManagementType || 'quantity');
    
    setQuickAddData({
      productId,
      variantId,
      productName,
      variantTitle,
      currentStock: currentStock || 0,
      isWeightBased,
      currentWeight: currentWeight || 0,
      stockManagementType
    });
    setQuickAddForm({
      quantity: 0,
      reason: 'Purchase Order',
      reference: '',
      location: '',
      weightQuantity: '',
      weightUnit: 'grams'
    });
    setShowQuickAdd(true);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddData) return;

    // Validate based on stock management type
    if (quickAddData.isWeightBased) {
      if (!quickAddForm.weightQuantity || parseFloat(quickAddForm.weightQuantity) <= 0) {
        alert('Please enter a valid weight quantity');
        return;
      }
    } else {
      if (quickAddForm.quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
      }
    }

    setSubmitting(true);
    try {
      const submitData: any = {
        productId: quickAddData.productId,
        variantId: quickAddData.variantId || null,
        movementType: 'in',
        reason: quickAddForm.reason,
        location: quickAddForm.location,
        reference: quickAddForm.reference
      };

      if (quickAddData.isWeightBased) {
        submitData.weightQuantity = parseFloat(quickAddForm.weightQuantity);
        submitData.weightUnit = quickAddForm.weightUnit;
        submitData.quantity = 0; // Set to 0 for weight-based products
      } else {
        submitData.quantity = quickAddForm.quantity;
      }

      const response = await fetch('/api/inventory/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add stock');
      }

      // Refresh inventory data
      await fetchInventoryData();
      setShowQuickAdd(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getUniqueCategories = () => {
    const categories = inventory.map(item => item.categoryName);
    return [...new Set(categories)].sort();
  };

  const getInventoryStats = () => {
    let totalItems = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let inStock = 0;

    inventory.forEach(item => {
      if (item.productType === 'simple' && item.simpleStock) {
        totalItems++;
        const statusResult = getStockStatus(item.simpleStock.availableStock, item.simpleStock.reorderPoint);
        const status = typeof statusResult === 'string' ? statusResult : statusResult.status;
        if (status === 'Out of Stock') outOfStock++;
        else if (status === 'Low Stock') lowStock++;
        else inStock++;
      } else if (item.variants) {
        totalItems += item.variants.length;
        item.variants.forEach(variant => {
          const statusResult = getStockStatus(variant.availableStock, variant.reorderPoint);
          const status = typeof statusResult === 'string' ? statusResult : statusResult.status;
          if (status === 'Out of Stock') outOfStock++;
          else if (status === 'Low Stock') lowStock++;
          else inStock++;
        });
      }
    });

    return { totalItems, outOfStock, lowStock, inStock };
  };

  if (loading) return <div className="p-8 text-center">Loading inventory...</div>;

  const stats = getInventoryStats();
  const categories = getUniqueCategories();

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📦 Inventory Listing</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchInventoryData}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/inventory/stock-movements/add" 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            ➕ Add Stock Movement
          </Link>
          <Link 
            href="/inventory" 
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            ← Back to Inventory
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">{stats.totalItems}</div>
          <div className="text-blue-600">Total Items</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-800">{stats.inStock}</div>
          <div className="text-green-600">In Stock</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-800">{stats.lowStock}</div>
          <div className="text-yellow-600">Low Stock</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-800">{stats.outOfStock}</div>
          <div className="text-red-600">Out of Stock</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search products, SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
            <select
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="simple">Simple Products</option>
              <option value="variable">Variable Products</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="instock">In Stock</option>
              <option value="lowstock">Low Stock</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setProductTypeFilter('all');
                setStockFilter('all');
              }}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b p-3 text-left font-semibold">Product</th>
                <th className="border-b p-3 text-left font-semibold">Type</th>
                <th className="border-b p-3 text-left font-semibold">Category</th>
                <th className="border-b p-3 text-left font-semibold">Variant/Details</th>
                <th className="border-b p-3 text-left font-semibold">Stock Type</th>
                <th className="border-b p-3 text-left font-semibold">Current Stock</th>
                <th className="border-b p-3 text-left font-semibold">Available</th>
                <th className="border-b p-3 text-left font-semibold">Status</th>
                <th className="border-b p-3 text-left font-semibold">Last Restocked</th>
                <th className="border-b p-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => {
                  const isWeightBased = isWeightBasedProduct(item.stockManagementType || 'quantity');
                  
                  if (item.productType === 'simple' && item.simpleStock) {
                    const statusResult = getStockStatus(
                      item.simpleStock.availableStock, 
                      item.simpleStock.reorderPoint,
                      isWeightBased,
                      item.simpleStock.availableWeight,
                      item.simpleStock.reorderWeightPoint
                    );
                    const status = typeof statusResult === 'string' ? statusResult : statusResult.status;
                    const statusColor = typeof statusResult === 'string' ? getStockStatusColor(statusResult) : statusResult.color;
                    return (
                      <tr key={item.productId} className="hover:bg-gray-50">
                        <td className="border-b p-3">
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            {item.productSku && (
                              <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                            )}
                          </div>
                        </td>
                        <td className="border-b p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Simple
                          </span>
                        </td>
                        <td className="border-b p-3">{item.categoryName}</td>
                        <td className="border-b p-3">
                          <span className="text-gray-500">Base Product</span>
                        </td>
                        <td className="border-b p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isWeightBased ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isWeightBased ? '⚖️ Weight' : '📦 Quantity'}
                          </span>
                        </td>
                        <td className="border-b p-3">
                          {isWeightBased ? (
                            <div>
                              <span className="font-semibold">{formatWeightAuto(item.simpleStock.currentWeight || 0).formattedString}</span>
                              {(item.simpleStock.reservedWeight || 0) > 0 && (
                                <span className="text-sm text-orange-600 ml-1">
                                  ({formatWeightAuto(item.simpleStock.reservedWeight || 0).formattedString} reserved)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold">{item.simpleStock.currentStock}</span>
                              {item.simpleStock.reservedStock > 0 && (
                                <span className="text-sm text-orange-600 ml-1">
                                  ({item.simpleStock.reservedStock} reserved)
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="border-b p-3">
                          <span className="font-semibold text-green-600">
                            {isWeightBased 
                              ? formatWeightAuto(item.simpleStock.availableWeight || 0).formattedString
                              : item.simpleStock.availableStock
                            }
                          </span>
                        </td>
                        <td className="border-b p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                        <td className="border-b p-3 text-sm">
                          {item.simpleStock.lastRestocked 
                            ? new Date(item.simpleStock.lastRestocked).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="border-b p-3">
                          <button
                            onClick={() => openQuickAdd(
                              item.productId,
                              item.productName,
                              undefined,
                              undefined,
                              item.simpleStock?.currentStock,
                              item.stockManagementType,
                              item.simpleStock?.currentWeight
                            )}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            ➕ Add Stock
                          </button>
                        </td>
                      </tr>
                    );
                  } else if (item.variants) {
                    return item.variants.map((variant, index) => {
                      const statusResult = getStockStatus(
                        variant.availableStock, 
                        variant.reorderPoint,
                        isWeightBased,
                        variant.availableWeight,
                        variant.reorderWeightPoint
                      );
                      const status = typeof statusResult === 'string' ? statusResult : statusResult.status;
                      const statusColor = typeof statusResult === 'string' ? getStockStatusColor(statusResult) : statusResult.color;
                      return (
                        <tr key={`${item.productId}-${variant.variantId}`} className="hover:bg-gray-50">
                          {index === 0 && (
                            <td className="border-b p-3" rowSpan={item.variants!.length}>
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                {item.productSku && (
                                  <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                                )}
                              </div>
                            </td>
                          )}
                          {index === 0 && (
                            <td className="border-b p-3" rowSpan={item.variants!.length}>
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                Variable
                              </span>
                            </td>
                          )}
                          {index === 0 && (
                            <td className="border-b p-3" rowSpan={item.variants!.length}>
                              {item.categoryName}
                            </td>
                          )}
                          <td className="border-b p-3">
                            <div>
                              <div className="font-medium">{variant.variantTitle}</div>
                              {variant.variantSku && (
                                <div className="text-sm text-gray-500">SKU: {variant.variantSku}</div>
                              )}
                            </div>
                          </td>
                          {index === 0 && (
                            <td className="border-b p-3" rowSpan={item.variants!.length}>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isWeightBased ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {isWeightBased ? '⚖️ Weight' : '📦 Quantity'}
                              </span>
                            </td>
                          )}
                          <td className="border-b p-3">
                            {isWeightBased ? (
                              <div>
                                <span className="font-semibold">{formatWeightAuto(variant.currentWeight || 0).formattedString}</span>
                                {(variant.reservedWeight || 0) > 0 && (
                                  <span className="text-sm text-orange-600 ml-1">
                                    ({formatWeightAuto(variant.reservedWeight || 0).formattedString} reserved)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold">{variant.currentStock}</span>
                                {variant.reservedStock > 0 && (
                                  <span className="text-sm text-orange-600 ml-1">
                                    ({variant.reservedStock} reserved)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="border-b p-3">
                            <span className="font-semibold text-green-600">
                              {isWeightBased 
                                ? formatWeightAuto(variant.availableWeight || 0).formattedString
                                : variant.availableStock
                              }
                            </span>
                          </td>
                          <td className="border-b p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                          <td className="border-b p-3 text-sm">
                            {variant.lastRestocked 
                              ? new Date(variant.lastRestocked).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="border-b p-3">
                            <button
                              onClick={() => openQuickAdd(
                                item.productId,
                                item.productName,
                                variant.variantId,
                                variant.variantTitle,
                                variant.currentStock,
                                item.stockManagementType,
                                variant.currentWeight
                              )}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                            >
                              ➕ Add Stock
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  }
                  return null;
                })
              ) : (
                <tr>
                  <td colSpan={10} className="border-b p-8 text-center text-gray-500">
                    {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' || productTypeFilter !== 'all'
                      ? 'No inventory items match your filters' 
                      : 'No inventory items found'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add Stock Modal */}
      {showQuickAdd && quickAddData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Quick Add Stock</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-medium">{quickAddData.productName}</div>
              {quickAddData.variantTitle && (
                <div className="text-sm text-gray-600">{quickAddData.variantTitle}</div>
              )}
              <div className="text-sm text-gray-500">
                Stock Type: {quickAddData.isWeightBased ? '⚖️ Weight-based' : '📦 Quantity-based'}
              </div>
              <div className="text-sm text-gray-500">
                Current Stock: {quickAddData.isWeightBased 
                  ? formatWeightAuto(quickAddData.currentWeight || 0).formattedString
                  : quickAddData.currentStock
                }
              </div>
            </div>

            <form onSubmit={handleQuickAddSubmit}>
              {quickAddData.isWeightBased ? (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">
                    Weight to Add <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={quickAddForm.weightQuantity}
                      onChange={(e) => setQuickAddForm({...quickAddForm, weightQuantity: e.target.value})}
                      className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
                      min="0"
                      step="0.001"
                      placeholder="Enter weight"
                      required
                    />
                    <select
                      value={quickAddForm.weightUnit}
                      onChange={(e) => setQuickAddForm({...quickAddForm, weightUnit: e.target.value as 'grams' | 'kg'})}
                      className="p-2 border rounded focus:border-blue-500 focus:outline-none"
                    >
                      <option value="grams">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">
                    Quantity to Add <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={quickAddForm.quantity}
                    onChange={(e) => setQuickAddForm({...quickAddForm, quantity: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="1"
                    required
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={quickAddForm.reason}
                  onChange={(e) => setQuickAddForm({...quickAddForm, reason: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  required
                >
                  {stockReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Reference</label>
                <input
                  type="text"
                  value={quickAddForm.reference}
                  onChange={(e) => setQuickAddForm({...quickAddForm, reference: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  placeholder="PO number, invoice, etc."
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={quickAddForm.location}
                  onChange={(e) => setQuickAddForm({...quickAddForm, location: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  placeholder="Warehouse, shelf, etc."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || (quickAddData.isWeightBased ? (!quickAddForm.weightQuantity || parseFloat(quickAddForm.weightQuantity) <= 0) : quickAddForm.quantity <= 0)}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : quickAddData.isWeightBased 
                    ? `Add ${quickAddForm.weightQuantity || 0}${quickAddForm.weightUnit === 'kg' ? 'kg' : 'g'} Stock`
                    : `Add ${quickAddForm.quantity} Stock`
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 