'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../../components/CurrencySymbol';
import { getDateRanges } from '@/utils/profitUtils';
import { useCurrency } from '@/app/contexts/CurrencyContext';

interface SalesReportData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalTax: number;
    totalShipping: number;
    totalDiscount: number;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    email: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: string;
    customer?: {
      name?: string;
      email: string;
    };
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>;
  salesByStatus: Array<{
    status: string;
    count: number;
    totalRevenue: number;
  }>;
  salesByPaymentStatus: Array<{
    paymentStatus: string;
    count: number;
    totalRevenue: number;
  }>;
  dailySales: Array<{
    date: string;
    orderCount: number;
    totalRevenue: number;
  }>;
  monthlySales: Array<{
    month: string;
    orderCount: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>;
}

export default function SalesReport() {
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
  const [data, setData] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const dateRanges = getDateRanges();
  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  // Helper function to safely format currency
  const formatCurrency = (amount: any) => {
    // Convert to number and handle all edge cases
    const numAmount = Number(amount);
    
    // Handle NaN, undefined, null, or invalid values
    if (isNaN(numAmount) || amount === null || amount === undefined || typeof numAmount !== 'number') {
      return (
        <span className="flex items-center gap-1">
          <CurrencySymbol />0.00
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1">
        <CurrencySymbol />{numAmount.toFixed(2)}
      </span>
    );
  };

  // Helper function for plain text currency formatting (for PDF export)
  const formatCurrencyText = (amount: any) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || amount === null || amount === undefined || typeof numAmount !== 'number') {
      return `${currentCurrency} 0.00`;
    }
    return `${currentCurrency} ${numAmount.toFixed(2)}`;
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, selectedStatus]);

  const fetchSalesData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/reports/sales?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (selectedStatus) params.append('status', selectedStatus);
    params.append('export', 'csv');

    window.open(`/api/reports/sales?${params.toString()}`, '_blank');
  };

  const handleExportPDF = async () => {
    if (!data) return;
    
    try {
      // Dynamic import to avoid build issues
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Sales Report', 20, 20);
      
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
      doc.text(`Total Orders: ${data.summary.totalOrders}`, 20, 55);
          doc.text(`Total Revenue: ${formatCurrencyText(data.summary.totalRevenue)}`, 20, 62);
    doc.text(`Average Order Value: ${formatCurrencyText(data.summary.averageOrderValue)}`, 20, 69);
    doc.text(`Total Tax: ${formatCurrencyText(data.summary.totalTax)}`, 20, 76);
    doc.text(`Total Shipping: ${formatCurrencyText(data.summary.totalShipping)}`, 20, 83);
    doc.text(`Total Discount: ${formatCurrencyText(data.summary.totalDiscount)}`, 20, 90);
      
      // Top Products (simplified without table plugin)
      if (data.topProducts.length > 0) {
        doc.setFontSize(14);
        doc.text('Top Products', 20, 105);
        
        let yPosition = 115;
        data.topProducts.slice(0, 10).forEach((product, index) => {
          doc.setFontSize(8);
          const productText = `${product.productName} | Qty: ${product.totalQuantity} | Revenue: ${formatCurrencyText(product.totalRevenue)}`;
          doc.text(productText, 20, yPosition);
          yPosition += 5;
          
          if (yPosition > 270) { // Prevent overflow
            return;
          }
        });
      }
      
      doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
    setSelectedStatus('');
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading sales data...</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11,8H13V16H11V8M9,2A1,1 0 0,0 8,3V4H16V3A1,1 0 0,0 15,2H9M19,4H17V6H19A2,2 0 0,1 21,8V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V8A2,2 0 0,1 5,6H7V4H5C3.89,4 3,4.89 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6C21,4.89 20.1,4 19,4Z"/>
            </svg>
            <h1 className="text-3xl font-bold text-gray-800">Sales Report</h1>
          </div>
          <p className="text-gray-600 mt-1">Comprehensive sales analytics and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            disabled={!data}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            disabled={!data}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            Export PDF
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
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>
        
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {orderStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
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
        {(startDate || endDate || selectedStatus) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Active Filters:</span>
              {startDate && ` From ${new Date(startDate).toLocaleDateString()}`}
              {endDate && ` To ${new Date(endDate).toLocaleDateString()}`}
              {selectedStatus && ` • Status: ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            Error: {error}
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{data.summary.totalOrders}</p>
                </div>
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,7H18V6A2,2 0 0,0 16,4H8A2,2 0 0,0 6,6V7H5A3,3 0 0,0 2,10V19A3,3 0 0,0 5,22H19A3,3 0 0,0 22,19V10A3,3 0 0,0 19,7M8,6H16V7H8V6M20,19A1,1 0 0,1 19,20H5A1,1 0 0,1 4,19V10A1,1 0 0,1 5,9H19A1,1 0 0,1 20,10V19Z"/>
                </svg>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
    {formatCurrency(data.summary.totalRevenue)}
                  </p>
                </div>
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13.41 18.09L13.41 20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.56 0 2.22-.48 2.22-1.34 0-.81-.68-1.49-2.69-1.95-2.65-.63-4.18-1.64-4.18-3.67 0-1.70 1.22-2.94 3.21-3.39V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.82-2.22-1.82-1.35 0-1.95.48-1.95 1.25 0 .77.83 1.01 3.26 1.69 2.84.78 4.83 1.70 4.83 3.94 0 1.91-1.19 3.02-3.81 3.49z"/>
                </svg>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Order Value</p>
                  <p className="text-2xl font-bold text-purple-600">
    {formatCurrency(data.summary.averageOrderValue)}
                  </p>
                </div>
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
                </svg>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tax</p>
                  <p className="text-2xl font-bold text-orange-600">
    {formatCurrency(data.summary.totalTax)}
                  </p>
                </div>
                <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales by Status */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Sales by Status</h3>
              </div>
              <div className="space-y-3">
                {data.salesByStatus.map((statusData) => (
                  <div key={statusData.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(statusData.status)}`}>
                        {statusData.status.charAt(0).toUpperCase() + statusData.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-600">{statusData.count} orders</span>
                    </div>
                    <span className="font-medium">
{formatCurrency(statusData.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales by Payment Status */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.11,4 20,4Z"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Sales by Payment Status</h3>
              </div>
              <div className="space-y-3">
                {data.salesByPaymentStatus.map((paymentData) => (
                  <div key={paymentData.paymentStatus} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(paymentData.paymentStatus)}`}>
                        {paymentData.paymentStatus.charAt(0).toUpperCase() + paymentData.paymentStatus.slice(1)}
                      </span>
                      <span className="text-sm text-gray-600">{paymentData.count} orders</span>
                    </div>
                    <span className="font-medium">
{formatCurrency(paymentData.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z"/>
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Top Products by Revenue</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.topProducts.map((product, index) => (
                    <tr key={product.productId}>
                      <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{product.productName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{product.orderCount}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{product.totalQuantity}</td>
                      <td className="px-4 py-2 text-sm font-medium text-green-600">
  {formatCurrency(product.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-lg border">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.11,3 19,3M19,19H5V5H19V19Z"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Showing {data.orders.length} orders
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.orders.slice(0, 20).map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm text-gray-900">
                          {order.customer?.name || 'Guest'}
                        </div>
                        <div className="text-xs text-gray-500">{order.email}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(order.paymentStatus)}`}>
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
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