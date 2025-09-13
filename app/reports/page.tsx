'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReportsHub() {
  const router = useRouter();

  const reportCategories = [
    {
      title: 'Financial Reports',
      titleIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13.41 18.09L13.41 20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.56 0 2.22-.48 2.22-1.34 0-.81-.68-1.49-2.69-1.95-2.65-.63-4.18-1.64-4.18-3.67 0-1.70 1.22-2.94 3.21-3.39V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.82-2.22-1.82-1.35 0-1.95.48-1.95 1.25 0 .77.83 1.01 3.26 1.69 2.84.78 4.83 1.70 4.83 3.94 0 1.91-1.19 3.02-3.81 3.49z"/>
        </svg>
      ),
      description: 'Revenue, costs, and profitability analysis',
      reports: [
        {
          title: 'Profit & Loss Report',
          description: 'Analyze profitability and margins across all orders',
          href: '/reports/profits',
          icon: (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
          ),
          color: 'bg-green-500 hover:bg-green-600'
        },
        {
          title: 'Sales Report',
          description: 'Comprehensive sales analytics and trends',
          href: '/reports/sales',
          icon: (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11,8H13V16H11V8M9,2A1,1 0 0,0 8,3V4H16V3A1,1 0 0,0 15,2H9M19,4H17V6H19A2,2 0 0,1 21,8V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V8A2,2 0 0,1 5,6H7V4H5C3.89,4 3,4.89 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6C21,4.89 20.1,4 19,4Z"/>
            </svg>
          ),
          color: 'bg-blue-500 hover:bg-blue-600'
        },
        {
          title: 'Revenue Analytics',
          description: 'Revenue trends and performance metrics',
          href: '/reports/revenue',
          icon: (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
            </svg>
          ),
          color: 'bg-purple-500 hover:bg-purple-600'
        }
      ]
    },
    {
      title: 'Order Reports',
      titleIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19,7H18V6A2,2 0 0,0 16,4H8A2,2 0 0,0 6,6V7H5A3,3 0 0,0 2,10V19A3,3 0 0,0 5,22H19A3,3 0 0,0 22,19V10A3,3 0 0,0 19,7M8,6H16V7H8V6M20,19A1,1 0 0,1 19,20H5A1,1 0 0,1 4,19V10A1,1 0 0,1 5,9H19A1,1 0 0,1 20,10V19Z"/>
        </svg>
      ),
      description: 'Order performance and customer analytics',
      reports: [
        {
          title: 'Order Analytics',
          description: 'Order patterns, status distribution, and trends',
          href: '/reports/orders',
          icon: (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15Z"/>
            </svg>
          ),
          color: 'bg-orange-500 hover:bg-orange-600'
        },
        {
          title: 'Customer Analytics',
          description: 'Customer behavior and purchase patterns',
          href: '/reports/customers',
          icon: (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,13C18.67,13 24,14.33 24,17V20H8V17C8,14.33 13.33,13 16,13M8,12C10.21,12 12,10.21 12,8C12,5.79 10.21,4 8,4C5.79,4 4,5.79 4,8C4,10.21 5.79,12 8,12M8,13C5.33,13 0,14.33 0,17V20H6V17C6,15.9 6.5,14.9 7.14,14.14C6.8,14 6.42,13.91 6,13.91C6,13.91 8,13 8,13Z"/>
            </svg>
          ),
          color: 'bg-indigo-500 hover:bg-indigo-600'
        }
      ]
    },
    {
      title: 'Product Reports',
      titleIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
        </svg>
      ),
      description: 'Product performance and inventory insights',
      reports: [
        {
          title: 'Product Performance',
          description: 'Top products, categories, and performance metrics',
          href: '/reports/products',
          icon: (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
          ),
          color: 'bg-teal-500 hover:bg-teal-600'
        },
        {
          title: 'Inventory Reports',
          description: 'Stock levels, movements, and valuation',
          href: '/inventory/reports',
          icon: (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,5V9H15V5H9M6,8V10H4V16H6V18H18V16H20V10H18V8H6M8,10V14H16V10H8Z"/>
            </svg>
          ),
          color: 'bg-cyan-500 hover:bg-cyan-600'
        }
      ]
    }
  ];

  const quickStats = [
    {
      title: 'Total Reports',
      value: reportCategories.reduce((acc, cat) => acc + cat.reports.length, 0),
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
        </svg>
      ),
      color: 'text-blue-600'
    },
    {
      title: 'Categories',
      value: reportCategories.length,
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
        </svg>
      ),
      color: 'text-green-600'
    },
    {
      title: 'Export Formats',
      value: 'CSV, PDF',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      ),
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
            </svg>
            <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Comprehensive business intelligence and reporting dashboard
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
              <div className={stat.color}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Categories */}
      <div className="space-y-8">
        {reportCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="bg-white rounded-xl shadow-lg border p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-gray-700">{category.titleIcon}</div>
                <h2 className="text-xl font-bold text-gray-800">
                  {category.title}
                </h2>
              </div>
              <p className="text-gray-600">{category.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.reports.map((report, reportIndex) => (
                <div
                  key={reportIndex}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => router.push(report.href)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-gray-600 mt-1">{report.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {report.description}
                      </p>
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${report.color} transition-colors`}>
                          View Report →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Features Overview */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z"/>
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">Report Features</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">Real-time data</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">Date range filtering</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">CSV export</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">Interactive charts</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">Profit analysis</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">Product insights</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">Customer analytics</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            <span className="text-sm text-gray-700">Mobile responsive</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/reports/profits')}
            className="p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-green-600 font-medium mb-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
              Today's Profits
            </div>
            <div className="text-sm text-gray-600">Quick profit overview</div>
          </button>
          
          <button 
            onClick={() => router.push('/reports/sales')}
            className="p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-blue-600 font-medium mb-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11,8H13V16H11V8M9,2A1,1 0 0,0 8,3V4H16V3A1,1 0 0,0 15,2H9M19,4H17V6H19A2,2 0 0,1 21,8V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V8A2,2 0 0,1 5,6H7V4H5C3.89,4 3,4.89 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6C21,4.89 20.1,4 19,4Z"/>
              </svg>
              This Month's Sales
            </div>
            <div className="text-sm text-gray-600">Monthly performance</div>
          </button>
          
          <button 
            onClick={() => router.push('/inventory/reports')}
            className="p-4 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-purple-600 font-medium mb-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9,5V9H15V5H9M6,8V10H4V16H6V18H18V16H20V10H18V8H6M8,10V14H16V10H8Z"/>
              </svg>
              Inventory Status
            </div>
            <div className="text-sm text-gray-600">Stock overview</div>
          </button>
          
          <button 
            onClick={() => router.push('/orders')}
            className="p-4 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-orange-600 font-medium mb-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,7H18V6A2,2 0 0,0 16,4H8A2,2 0 0,0 6,6V7H5A3,3 0 0,0 2,10V19A3,3 0 0,0 5,22H19A3,3 0 0,0 22,19V10A3,3 0 0,0 19,7M8,6H16V7H8V6M20,19A1,1 0 0,1 19,20H5A1,1 0 0,1 4,19V10A1,1 0 0,1 5,9H19A1,1 0 0,1 20,10V19Z"/>
              </svg>
              Recent Orders
            </div>
            <div className="text-sm text-gray-600">Latest transactions</div>
          </button>
        </div>
      </div>
    </div>
  );
} 