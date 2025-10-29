'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../../components/CurrencySymbol';
import DateFilter from '../../components/DateFilter';
import { 
  calculateItemProfit, 
  formatProfitDisplay, 
  getProfitStatus, 
  getProfitMarginTier,
  getDateRanges 
} from '@/utils/profitUtils';
import { useCurrency } from '@/app/contexts/CurrencyContext';

interface ProfitReportData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalDriverPayments: number;
    totalCostWithDriver: number;
    totalProfit: number;
    averageMargin: number;
    profitableItems: number;
    lossItems: number;
    totalItems: number;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    email: string;
    status: string;
    orderType: string;
    createdAt: string;
    items: Array<{
      id: string;
      productName: string;
      variantTitle?: string;
      quantity: number;
      price: number;
      costPrice?: number;
      totalPrice: number;
      totalCost?: number;
      profit: {
        revenue: number;
        cost: number;
        driverPayment: number;
        totalCost: number;
        profit: number;
        margin: number;
        isProfit: boolean;
      };
    }>;
    orderSummary: {
      totalRevenue: number;
      totalCost: number;
      totalDriverPayments: number;
      totalCostWithDriver: number;
      totalProfit: number;
      averageMargin: number;
    };
  }>;
}

export default function ProfitsReport() {
  const { currentCurrency } = useCurrency();

  // Format date and time to "Aug 5, 2025 at 5:57 PM" format
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options).replace(',', ' at');
  };
  const [data, setData] = useState<ProfitReportData | null>(null);
  const [pickupData, setPickupData] = useState<ProfitReportData | null>(null);
  const [deliveryData, setDeliveryData] = useState<ProfitReportData | null>(null);
  const [shippingData, setShippingData] = useState<ProfitReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pickup' | 'delivery' | 'shipping'>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Available products for filtering
  const [products, setProducts] = useState<Array<{id: string; name: string}>>([]);

  const dateRanges = getDateRanges();

  useEffect(() => {
    fetchProducts();
    fetchProfitData();
  }, []);

  useEffect(() => {
    fetchProfitData();
  }, [startDate, endDate, selectedProductId]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const productsData = await response.json();
      // Ensure we have valid products data and filter out any invalid entries
      const validProducts = Array.isArray(productsData) 
        ? productsData.filter(product => product && product.id && product.name)
        : [];
      setProducts(validProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]); // Set empty array on error
    }
  };

  const fetchProfitData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const baseParams = new URLSearchParams();
      if (startDate) baseParams.append('startDate', startDate);
      if (endDate) baseParams.append('endDate', endDate);
      if (selectedProductId) baseParams.append('productId', selectedProductId);

      // Fetch all orders data
      const allResponse = await fetch(`/api/reports/profits?${baseParams.toString()}`);
      if (!allResponse.ok) {
        throw new Error('Failed to fetch profit data');
      }
      const allResult = await allResponse.json();
      setData(allResult);

      // Fetch pickup orders data
      const pickupParams = new URLSearchParams(baseParams);
      pickupParams.append('orderType', 'pickup');
      const pickupResponse = await fetch(`/api/reports/profits?${pickupParams.toString()}`);
      if (!pickupResponse.ok) {
        throw new Error('Failed to fetch pickup profit data');
      }
      const pickupResult = await pickupResponse.json();
      setPickupData(pickupResult);

      // Fetch delivery orders data
      const deliveryParams = new URLSearchParams(baseParams);
      deliveryParams.append('orderType', 'delivery');
      const deliveryResponse = await fetch(`/api/reports/profits?${deliveryParams.toString()}`);
      if (!deliveryResponse.ok) {
        throw new Error('Failed to fetch delivery profit data');
      }
      const deliveryResult = await deliveryResponse.json();
      setDeliveryData(deliveryResult);

      // Fetch shipping orders data
      const shippingParams = new URLSearchParams(baseParams);
      shippingParams.append('orderType', 'shipping');
      const shippingResponse = await fetch(`/api/reports/profits?${shippingParams.toString()}`);
      if (!shippingResponse.ok) {
        throw new Error('Failed to fetch shipping profit data');
      }
      const shippingResult = await shippingResponse.json();
      setShippingData(shippingResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'pickup': return pickupData;
      case 'delivery': return deliveryData;
      case 'shipping': return shippingData;
      default: return data;
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (selectedProductId) params.append('productId', selectedProductId);
    if (activeTab !== 'all') params.append('orderType', activeTab);
    params.append('export', 'csv');

    window.open(`/api/reports/profits?${params.toString()}`, '_blank');
  };

  const handleExportPDF = async () => {
    const currentData = getCurrentData();
    if (!currentData) return;
    
    try {
      // Dynamic import to avoid build issues
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      const reportTitle = `Profit & Loss Report${activeTab !== 'all' ? ` - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Orders` : ''}`;
      doc.text(reportTitle, 20, 20);
      
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
      doc.text(`Total Revenue: $${currentData.summary.totalRevenue.toFixed(2)}`, 20, 55);
      doc.text(`Product Costs: $${currentData.summary.totalCost.toFixed(2)}`, 20, 62);
      doc.text(`Driver Payments: -$${currentData.summary.totalDriverPayments.toFixed(2)}`, 20, 69);
      doc.text(`Total Costs: $${currentData.summary.totalCostWithDriver.toFixed(2)}`, 20, 76);
      doc.text(`Total Profit: $${currentData.summary.totalProfit.toFixed(2)}`, 20, 83);
      doc.text(`Average Margin: ${currentData.summary.averageMargin.toFixed(1)}%`, 20, 90);
      doc.text(`Profitable Items: ${currentData.summary.profitableItems}`, 20, 97);
      doc.text(`Loss Items: ${currentData.summary.lossItems}`, 20, 104);
      
      // Orders data (simplified without table plugin)
      let yPosition = 115;
      doc.setFontSize(12);
      doc.text('Orders:', 20, yPosition);
      yPosition += 10;
      
      currentData.orders.slice(0, 10).forEach((order, index) => {
        doc.setFontSize(8);
        const orderText = `${order.orderNumber} | ${new Date(order.createdAt).toLocaleDateString()} | $${order.orderSummary.totalRevenue.toFixed(2)} | $${order.orderSummary.totalProfit.toFixed(2)}`;
        doc.text(orderText, 20, yPosition);
        yPosition += 5;
        
        if (yPosition > 270) { // Prevent overflow
          return;
        }
      });
      
      doc.save(`profit-loss-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
    setSelectedProductId('');
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading profit data...</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
            <h1 className="text-3xl font-bold text-gray-800">Profit & Loss Report</h1>
          </div>
          <p className="text-gray-600 mt-1">Analyze profitability and margins across orders</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!getCurrentData()}
          >
            📊 Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!getCurrentData()}
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

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Products</option>
              {products.map((product, index) => (
                <option key={product.id || `product-${index}`} value={product.id || ''}>{product.name || 'Unnamed Product'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Date Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(dateRanges).map(([key, range]) => (
            <button
              key={key}
              onClick={() => setPresetDateRange(key as keyof typeof dateRanges)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Active Filters Display */}
        {(startDate || endDate || selectedProductId) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Active Filters:</span>
              {startDate && ` From ${new Date(startDate).toLocaleDateString()}`}
              {endDate && ` To ${new Date(endDate).toLocaleDateString()}`}
              {selectedProductId && ` • Product: ${products.find(p => p.id === selectedProductId)?.name}`}
            </p>
          </div>
        )}
      </div>

      {/* Order Type Tabs */}
      <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Report Type</h3>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => setActiveTab('pickup')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pickup'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🏪 Pickup Orders
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'delivery'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🚚 Delivery Orders
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'shipping'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📦 Shipping Orders
          </button>
        </div>
        
        {/* Tab Content Summary */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Currently viewing:</span> {
              activeTab === 'all' ? 'All orders (pickup, delivery, and shipping combined)' :
              activeTab === 'pickup' ? 'Pickup orders only' :
              activeTab === 'delivery' ? 'Delivery orders only' :
              'Shipping orders only'
            }
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            Error: {error}
          </div>
        </div>
      )}

      {(() => {
        const currentData = getCurrentData();
        return currentData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">
                    <CurrencySymbol />{currentData.summary.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Product Costs</p>
                  <p className="text-2xl font-bold text-orange-600">
                    <CurrencySymbol />{currentData.summary.totalCost.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">📦</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Driver Payments</p>
                  <p className="text-2xl font-bold text-red-600">
                    -<CurrencySymbol />{currentData.summary.totalDriverPayments.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">🚚</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className={`text-2xl font-bold ${currentData.summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <CurrencySymbol />{currentData.summary.totalProfit.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">
                  {currentData.summary.totalProfit >= 0 ? '📈' : '📉'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Margin</p>
                  <p className={`text-2xl font-bold ${currentData.summary.averageMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentData.summary.averageMargin.toFixed(2)}%
                  </p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>
          </div>

          {/* Profit Overview */}
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Profit Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{currentData.summary.profitableItems}</div>
                <div className="text-sm text-green-700">Profitable Items</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{currentData.summary.lossItems}</div>
                <div className="text-sm text-red-700">Loss Items</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{currentData.summary.totalItems}</div>
                <div className="text-sm text-blue-700">Total Items</div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-xl shadow-lg border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">📋 Orders with Profit Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing {currentData.orders.length} orders with profit breakdown
              </p>
            </div>
            
            <div className="overflow-x-auto">
              {currentData.orders.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {currentData.orders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    const profitStatus = getProfitStatus(order.orderSummary.totalProfit);
                    const marginTier = getProfitMarginTier(order.orderSummary.averageMargin);

                    return (
                      <div key={order.id} className="p-6">
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2"
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="text-lg">
                              {isExpanded ? '📂' : '📁'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">{order.orderNumber}</div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  order.orderType === 'pickup' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : order.orderType === 'delivery'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {order.orderType === 'pickup' ? '🏪 Pickup' : 
                                   order.orderType === 'delivery' ? '🚚 Delivery' : 
                                   '📦 Shipping'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(order.createdAt)} • {order.email}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {order.orderType === 'delivery' && order.orderSummary.totalDriverPayments > 0 && (
                              <div className="text-right">
                                <div className="text-sm text-gray-600">Driver Cost</div>
                                <div className="font-medium text-red-600">
                                  -<CurrencySymbol />{order.orderSummary.totalDriverPayments.toFixed(2)}
                                </div>
                              </div>
                            )}
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Profit</div>
                              <div className={`font-medium ${profitStatus.color.split(' ')[0]}`}>
                                <CurrencySymbol />{order.orderSummary.totalProfit.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Margin</div>
                              <div className={`px-2 py-1 rounded-full text-xs ${marginTier.color}`}>
                                {order.orderSummary.averageMargin.toFixed(2)}%
                              </div>
                            </div>
                            <div className="text-2xl">{profitStatus.icon}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 ml-8">
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Cost</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Driver Payment</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {order.items.map((item) => {
                                    const itemProfitStatus = getProfitStatus(item.profit.profit);
                                    return (
                                      <tr key={item.id}>
                                        <td className="px-4 py-2">
                                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                                          {item.variantTitle && (
                                            <div className="text-xs text-gray-500">{item.variantTitle}</div>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          <CurrencySymbol />{item.profit.revenue.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          <CurrencySymbol />{item.profit.cost.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-red-600">
                                          {item.profit.driverPayment > 0 ? '-' : ''}<CurrencySymbol />{item.profit.driverPayment.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          <CurrencySymbol />{item.profit.totalCost.toFixed(2)}
                                        </td>
                                        <td className={`px-4 py-2 text-sm font-medium ${itemProfitStatus.color.split(' ')[0]}`}>
                                          {itemProfitStatus.icon} <CurrencySymbol />{item.profit.profit.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          {item.profit.margin.toFixed(2)}%
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No orders found for the selected filters.
                </div>
              )}
            </div>
          </div>
        </>
        );
      })()}
    </div>
  );
} 