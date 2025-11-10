'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SubcategoriesList() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubcategoriesAndCategories = async () => {
    setLoading(true);
    try {
      const [subcategoriesRes, categoriesRes] = await Promise.all([
        fetch('/api/subcategories'),
        fetch('/api/categories')
      ]);
      
      const subcategoriesData = await subcategoriesRes.json();
      const categoriesData = await categoriesRes.json();
      
      // Create a map of category names for quick lookup
      const categoryMap = categoriesData.reduce((acc: any, cat: any) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});
      
      // Add category names to subcategories
      const subcategoriesWithCategories = subcategoriesData.map((sub: any) => ({
        ...sub,
        categoryName: categoryMap[sub.categoryId] || 'Unknown'
      }));
      
      setSubcategories(subcategoriesWithCategories);
      setCategories(categoriesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcategoriesAndCategories();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await fetch(`/api/subcategories/${id}`, { method: 'DELETE' });
        setSubcategories(subcategories.filter((subcategory: any) => subcategory.id !== id));
      } catch (error) {
        console.error('Error deleting subcategory:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Product Subcategories</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchSubcategoriesAndCategories}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/subcategories/add" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add New Subcategory
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Image</th>
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Slug</th>
              <th className="border p-2 text-left">Category</th>
              <th className="border p-2 text-left">Sort Order</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Created At</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subcategories.length > 0 ? (
              subcategories.map((subcategory: any) => (
                <tr key={subcategory.id}>
                  <td className="border p-2">
                    {subcategory.image ? (
                      <img 
                        src={subcategory.image} 
                        alt={subcategory.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="border p-2">{subcategory.name}</td>
                  <td className="border p-2">{subcategory.slug}</td>
                  <td className="border p-2">{subcategory.categoryName}</td>
                  <td className="border p-2">{subcategory.sortOrder}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      subcategory.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {subcategory.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="border p-2">{new Date(subcategory.createdAt).toLocaleString()}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <Link 
                        href={`/subcategories/edit/${subcategory.id}`}
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(subcategory.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="border p-2 text-center">No subcategories found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 