'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const permissions = [
  { id: 'users_view', label: 'View Customers' },
  { id: 'users_create', label: 'Create Customers' },
  { id: 'users_edit', label: 'Edit Customers' },
  { id: 'users_delete', label: 'Delete Customers' },
  { id: 'products_view', label: 'View Products' },
  { id: 'products_create', label: 'Create Products' },
  { id: 'products_edit', label: 'Edit Products' },
  { id: 'products_delete', label: 'Delete Products' },
  { id: 'categories_view', label: 'View Categories' },
  { id: 'categories_create', label: 'Create Categories' },
  { id: 'categories_edit', label: 'Edit Categories' },
  { id: 'categories_delete', label: 'Delete Categories' },
  { id: 'orders_view', label: 'View Orders' },
  { id: 'orders_create', label: 'Create Orders' },
  { id: 'orders_edit', label: 'Edit Orders' },
  { id: 'orders_delete', label: 'Delete Orders' },
  { id: 'drivers_view', label: 'View Drivers' },
  { id: 'drivers_create', label: 'Create Drivers' },
  { id: 'drivers_edit', label: 'Edit Drivers' },
  { id: 'drivers_delete', label: 'Delete Drivers' },
  { id: 'pickup_locations_view', label: 'View Pickup Locations' },
  { id: 'pickup_locations_create', label: 'Create Pickup Locations' },
  { id: 'pickup_locations_edit', label: 'Edit Pickup Locations' },
  { id: 'pickup_locations_delete', label: 'Delete Pickup Locations' },
  { id: 'reports_view', label: 'View Reports' },
  { id: 'variations_view', label: 'View Product Variations' },
  { id: 'variations_create', label: 'Create Product Variations' },
  { id: 'variations_edit', label: 'Edit Product Variations' },
  { id: 'variations_delete', label: 'Delete Product Variations' },
  { id: 'admins_view', label: 'View Admins' },
  { id: 'admins_create', label: 'Create Admins' },
  { id: 'admins_edit', label: 'Edit Admins' },
  { id: 'admins_delete', label: 'Delete Admins' },
  { id: 'roles_view', label: 'View Roles' },
  { id: 'roles_create', label: 'Create Roles' },
  { id: 'roles_edit', label: 'Edit Roles' },
  { id: 'roles_delete', label: 'Delete Roles' },
  { id: 'settings_view', label: 'View Settings' },
  { id: 'settings_edit', label: 'Edit Settings' },
];

export default function EditRole() {
  const router = useRouter();
  const params = useParams();
  const roleId = params.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/roles/${roleId}`)
      .then(res => res.json())
      .then(data => {
        setFormData({
          name: data.name || '',
          permissions: JSON.parse(data.permissions || '[]'),
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load role');
        setLoading(false);
      });
  }, [roleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      const permissionId = name;
      if (checked) {
        setFormData(prev => ({
          ...prev,
          permissions: [...prev.permissions, permissionId]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          permissions: prev.permissions.filter(id => id !== permissionId)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          permissions: JSON.stringify(formData.permissions),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      router.push('/roles');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Role</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="name">
            Role Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={permission.id}
                  name={permission.id}
                  onChange={handleChange}
                  checked={formData.permissions.includes(permission.id)}
                  className="mr-2"
                />
                <label htmlFor={permission.id}>{permission.label}</label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/roles')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 