'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'Customers', href: '/admin/users', icon: '👥' },
    { name: 'Products', href: '/admin/products', icon: '📦' },
    { name: 'Categories', href: '/admin/categories', icon: '📂' },
    { name: 'Tags', href: '/tags', icon: '🏷️' },
    { name: 'Tag Groups', href: '/tag-groups', icon: '📑' },
    /*{ name: 'Addons', href: '/admin/addons', icon: '🧩' },
    { name: 'Variation Attributes', href: '/admin/variation-attributes', icon: '🏷️' },
    { name: 'Product Variants', href: '/admin/product-variants', icon: '🔧' },*/
    { name: 'Inventory', href: '/inventory', icon: '📈' },
    { name: 'Inventory Listing', href: '/inventory/listing', icon: '📋' },
    { name: 'Orders', href: '/admin/orders', icon: '🛒' },
    /*{ name: 'Returns', href: '/admin/returns', icon: '↩️' },
    { name: 'Refunds', href: '/admin/refunds', icon: '💰' },
    { name: 'Shipping Labels', href: '/admin/shipping-labels', icon: '🏷️' },
    { name: 'Admin Users', href: '/admin/admins', icon: '👮' },
    { name: 'Admin Roles', href: '/admin/roles', icon: '🔐' },
    { name: 'Admin Logs', href: '/admin/logs', icon: '📋' },*/
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center p-4 bg-white shadow-sm">
        <button
          type="button"
          className="p-2 rounded-md text-gray-500"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span className="sr-only">Open sidebar</span>
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <h1 className="ml-4 text-lg font-medium">Admin Panel</h1>
      </div>
      
      {/* Sidebar for mobile */}
      <div className={`fixed inset-0 z-30 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 w-64 flex flex-col bg-white">
          <div className="p-4 flex items-center justify-between border-b">
            <h2 className="text-xl font-semibold">Admin Panel</h2>
            <button type="button" className="lg:hidden" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4" style={{ overflowY: 'auto' }}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 my-1 text-base rounded-md ${
                  pathname.startsWith(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r">
          <div className="p-4 flex items-center border-b">
            <h2 className="text-xl font-semibold">Admin Panel</h2>
          </div>
          <nav className="flex-1 p-4" style={{ overflowY: 'auto' }}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 my-1 text-base rounded-md ${
                  pathname.startsWith(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1 pt-16 lg:pt-0">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 