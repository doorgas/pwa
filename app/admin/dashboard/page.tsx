'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  
  const cards = [
    { title: 'Customers', count: '0', link: '/admin/users' },
    { title: 'Products', count: '0', link: '/admin/products' },
    { title: 'Orders', count: '0', link: '/admin/orders' },
    { title: 'Categories', count: '0', link: '/admin/categories' },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div 
            key={card.title} 
            className="border p-4 rounded cursor-pointer hover:bg-gray-50"
            onClick={() => router.push(card.link)}
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="text-3xl font-bold mt-2">{card.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 