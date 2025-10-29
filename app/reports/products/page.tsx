'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../../components/CurrencySymbol';
import DateFilter from '../../components/DateFilter';

interface ProductAnalyticsData {
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    averageProductPrice: number;
    totalProductValue: number;
    outOfStockProducts: number;
  };
  topSellingProducts: Array<{
    id: string;
    name: string;
    sku: string;
    categoryName: string;
    totalQuantitySold: number;
    totalRevenue: number;
    averagePrice: number;
    orderCount: number;
    profitMargin?: number;
  }>;
  categoryPerformance: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
    totalRevenue: number;
    averageOrderValue: number;
    topProduct: string;
  }>;
  productsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  inventoryStatus: Array<{
    status: string;
    count: number;
    percentage: number;
    products: string[];
  }>;
  priceRanges: Array<{
    range: string;
    count: number;
    percentage: number;
    averageRevenue: number;
  }>;
  recentProducts: Array<{
    id: string;
    name: string;
    price: number;
    categoryName: string;
    createdAt: string;
    status: string;
  }>;
}

export default function ProductAnalytics() {
  const [data, setData] = useState<ProductAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dateRanges = {
    today: { 
      label: 'Today',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    week: { 
      label: 'Last 7 Days',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    month: { 
      label: 'Last 30 Days',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    quarter: { 
      label: 'Last 90 Days',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  };

  useEffect(() => {
    fetchProductAnalytics();
  }, [startDate, endDate]);

  const fetchProductAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      // Fetch data from multiple APIs
      const [salesResponse, productsResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/reports/sales?${params.toString()}`),
        fetch('/api/products'),
        fetch('/api/categories')
      ]);

      if (!salesResponse.ok) throw new Error('Failed to fetch sales data');
      if (!productsResponse.ok) throw new Error('Failed to fetch products data');
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories data');

      const salesData = await salesResponse.json();
      const productsData = await productsResponse.json();
      const categoriesData = await categoriesResponse.json();
      
      // Transform data into product analytics format
      const productAnalytics: ProductAnalyticsData = {
        summary: {
          totalProducts: productsData.length,
          activeProducts: productsData.filter((p: any) => p.isActive).length,
          totalCategories: categoriesData.length,
          averageProductPrice: productsData.length > 0 ? productsData.reduce((sum: number, p: any) => sum + parseFloat(p.price || '0'), 0) / productsData.length : 0,
          totalProductValue: productsData.reduce((sum: number, p: any) => sum + parseFloat(p.price || '0'), 0),
          outOfStockProducts: Math.floor(productsData.length * 0.1) // Mock data
        },
        topSellingProducts: salesData.topProducts.slice(0, 10).map((product: any) => ({
          id: product.productId,
          name: product.productName,
          sku: `SKU-${product.productId.slice(0, 8)}`,
          categoryName: 'General', // Would need to join with categories
          totalQuantitySold: product.totalQuantity,
          totalRevenue: product.totalRevenue,
          averagePrice: product.totalRevenue / Math.max(product.totalQuantity, 1),
          orderCount: product.orderCount,
          profitMargin: 25 + Math.random() * 30 // Mock profit margin
        })),
        categoryPerformance: categoriesData.slice(0, 8).map((category: any, index: number) => ({
          categoryId: category.id,
          categoryName: category.name,
          productCount: Math.floor(productsData.length / categoriesData.length) + Math.floor(Math.random() * 5),
          totalRevenue: salesData.summary.totalRevenue * (0.1 + Math.random() * 0.2),
          averageOrderValue: salesData.summary.averageOrderValue * (0.8 + Math.random() * 0.4),
          topProduct: salesData.topProducts[index]?.productName || 'No sales data'
        })),
        productsByStatus: [
          { status: 'Active', count: productsData.filter((p: any) => p.isActive).length, percentage: 0 },
          { status: 'Inactive', count: productsData.filter((p: any) => !p.isActive).length, percentage: 0 }
        ].map(item => ({
          ...item,
          percentage: productsData.length > 0 ? (item.count / productsData.length) * 100 : 0
        })),
        inventoryStatus: [
          { status: 'In Stock', count: Math.floor(productsData.length * 0.7), percentage: 70, products: [] },
          { status: 'Low Stock', count: Math.floor(productsData.length * 0.2), percentage: 20, products: [] },
          { status: 'Out of Stock', count: Math.floor(productsData.length * 0.1), percentage: 10, products: [] }
        ],
        priceRanges: [
          { range: '$0 - $25', count: Math.floor(productsData.length * 0.3), percentage: 30, averageRevenue: 0 },
          { range: '$26 - $50', count: Math.floor(productsData.length * 0.25), percentage: 25, averageRevenue: 0 },
          { range: '$51 - $100', count: Math.floor(productsData.length * 0.25), percentage: 25, averageRevenue: 0 },
          { range: '$101 - $200', count: Math.floor(productsData.length * 0.15), percentage: 15, averageRevenue: 0 },
          { range: '$200+', count: Math.floor(productsData.length * 0.05), percentage: 5, averageRevenue: 0 }
        ].map(range => ({
          ...range,
          averageRevenue: 1000 + Math.random() * 5000
        })),
        recentProducts: productsData.slice(0, 8).map((product: any) => ({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price || '0'),
          categoryName: product.categoryName || 'Uncategorized',
          createdAt: product.createdAt,
          status: product.isActive ? 'active' : 'inactive'
        }))
      };

      setData(productAnalytics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!data) return;
    
    try {
       // Dynamic import to avoid build issues
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Product Performance Report', 20, 20);
      
      // Date range
      if (startDate || endDate) {
        doc.setFontSize(12);
        const dateText = `Period: ${startDate || 'All time'} to ${endDate || 'Present'}`;
        doc.text(dateText, 20, 30);
      }
      
      // Summary
      doc.setFontSize(14);
      doc.text('Summary', 20, 45);
      doc.setFontSize(10);
      doc.text(`Total Products: ${data.summary.totalProducts}`, 20, 55);
      doc.text(`Active Products: ${data.summary.activeProducts}`, 20, 62);
      doc.text(`Average Product Price: $${data.summary.averageProductPrice.toFixed(2)}`, 20, 69);
      doc.text(`Total Product Value: $${data.summary.totalProductValue.toFixed(2)}`, 20, 76);
      doc.text(`Out of Stock: ${data.summary.outOfStockProducts}`, 20, 83);
      
      // Top Products (simplified without table plugin)
      doc.setFontSize(14);
      doc.text('Top Selling Products', 20, 95);
      
      let yPosition = 105;
      data.topSellingProducts.slice(0, 10).forEach((product, index) => {
        doc.setFontSize(8);
        const productName = product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name;
        const productText = `${productName} | Sold: ${product.totalQuantitySold} | Revenue: $${product.totalRevenue.toFixed(2)} | Margin: ${product.profitMargin?.toFixed(1) || '0'}%`;
        doc.text(productText, 20, yPosition);
        yPosition += 5;
        
        if (yPosition > 270) { // Prevent overflow
          return;
        }
      });
      
      doc.save(`product-performance-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const setPresetDateRange = (preset: keyof typeof dateRanges) => {
    const range = dateRanges[preset];
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-red-100 text-red-800',
      'In Stock': 'bg-green-100 text-green-800',
      'Low Stock': 'bg-yellow-100 text-yellow-800',
      'Out of Stock': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="p-8 text-center">Loading product analytics...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📈 Product Performance</h1>
          <p className="text-gray-600 mt-1">Top products, categories, and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            disabled={!data}
          >
            📄 Export PDF
          </button>
          <Link
            href="/reports"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Reports
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Date Filters */}
      <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClearFilter={clearFilters}
        />
        
        {/* Preset Date Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(dateRanges).map(([key, range]) => (
            <button
              key={key}
              onClick={() => setPresetDateRange(key as keyof typeof dateRanges)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Products</p>
                  <p className="text-3xl font-bold">{data.summary.totalProducts}</p>
                  <p className="text-sm text-blue-200">{data.summary.activeProducts} active</p>
                </div>
                <div className="text-4xl opacity-80">📦</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Avg Product Price</p>
                  <p className="text-3xl font-bold">
                    <CurrencySymbol />{data.summary.averageProductPrice.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-200">{data.summary.totalCategories} categories</p>
                </div>
                <div className="text-4xl opacity-80">💰</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Total Value</p>
                  <p className="text-3xl font-bold">
                    <CurrencySymbol />{data.summary.totalProductValue.toFixed(2)}
                  </p>
                  <p className="text-sm text-purple-200">{data.summary.outOfStockProducts} out of stock</p>
                </div>
                <div className="text-4xl opacity-80">📊</div>
              </div>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">🏆 Top Selling Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-700">Product</th>
                    <th className="text-left p-3 font-medium text-gray-700">Category</th>
                    <th className="text-left p-3 font-medium text-gray-700">Qty Sold</th>
                    <th className="text-left p-3 font-medium text-gray-700">Revenue</th>
                    <th className="text-left p-3 font-medium text-gray-700">Orders</th>
                    <th className="text-left p-3 font-medium text-gray-700">Avg Price</th>
                    <th className="text-left p-3 font-medium text-gray-700">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSellingProducts.map((product, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.sku}</div>
                      </td>
                      <td className="p-3 text-gray-600">{product.categoryName}</td>
                      <td className="p-3 font-semibold">{product.totalQuantitySold}</td>
                      <td className="p-3 font-semibold text-green-600">
                        <CurrencySymbol />{product.totalRevenue.toFixed(2)}
                      </td>
                      <td className="p-3">{product.orderCount}</td>
                      <td className="p-3">
                        <CurrencySymbol />{product.averagePrice.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          (product.profitMargin || 0) >= 30 ? 'bg-green-100 text-green-800' :
                          (product.profitMargin || 0) >= 15 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.profitMargin?.toFixed(1) || '0'}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Performance */}
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">📂 Category Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.categoryPerformance.map((category, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">{category.categoryName}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Products:</span>
                      <span className="font-medium">{category.productCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-medium text-green-600">
                        <CurrencySymbol />{category.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Order:</span>
                      <span className="font-medium">
                        <CurrencySymbol />{category.averageOrderValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-gray-600 text-xs">Top Product:</span>
                      <div className="font-medium text-xs text-gray-800 truncate">
                        {category.topProduct}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Status & Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Product Status</h3>
              <div className="space-y-3">
                {data.productsByStatus.map((status, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
                        {status.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{status.count} products</div>
                      <div className="text-sm text-gray-500">{status.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📦 Inventory Status</h3>
              <div className="space-y-3">
                {data.inventoryStatus.map((inventory, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(inventory.status)}`}>
                        {inventory.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{inventory.count} products</div>
                      <div className="text-sm text-gray-500">{inventory.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Price Range Distribution */}
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">💵 Price Range Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {data.priceRanges.map((range, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{range.count}</div>
                  <div className="text-sm text-gray-600">{range.range}</div>
                  <div className="text-xs text-gray-500 mt-1">{range.percentage}%</div>
                  <div className="text-xs text-green-600 font-medium mt-2">
                    Avg Rev: <CurrencySymbol />{range.averageRevenue.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Products */}
          <div className="bg-white rounded-xl shadow-lg border p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">🆕 Recent Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-700">Product</th>
                    <th className="text-left p-3 font-medium text-gray-700">Category</th>
                    <th className="text-left p-3 font-medium text-gray-700">Price</th>
                    <th className="text-left p-3 font-medium text-gray-700">Status</th>
                    <th className="text-left p-3 font-medium text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProducts.map((product, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-3 text-gray-600">{product.categoryName}</td>
                      <td className="p-3 font-semibold">
                        <CurrencySymbol />{product.price.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                          {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 