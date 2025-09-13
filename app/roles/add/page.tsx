'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const permissions = [
  { id: 'users_view', label: 'View Users' },
  { id: 'users_create', label: 'Create Users' },
  { id: 'users_edit', label: 'Edit Users' },
  { id: 'users_delete', label: 'Delete Users' },
  { id: 'courses_view', label: 'View Courses' },
  { id: 'courses_create', label: 'Create Courses' },
  { id: 'courses_edit', label: 'Edit Courses' },
  { id: 'courses_delete', label: 'Delete Courses' },
  { id: 'orders_view', label: 'View Orders' },
  { id: 'orders_create', label: 'Create Orders' },
  { id: 'orders_edit', label: 'Edit Orders' },
  { id: 'orders_delete', label: 'Delete Orders' },
  { id: 'admins_view', label: 'View Admins' },
  { id: 'admins_create', label: 'Create Admins' },
  { id: 'admins_edit', label: 'Edit Admins' },
  { id: 'admins_delete', label: 'Delete Admins' },
  { id: 'roles_view', label: 'View Roles' },
  { id: 'roles_create', label: 'Create Roles' },
  { id: 'roles_edit', label: 'Edit Roles' },
  { id: 'roles_delete', label: 'Delete Roles' },
  { id: 'logs_view', label: 'View Logs' },
];

export default function AddRole() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      const response = await fetch('/api/roles', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create role');
      }

      router.push('/roles');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Role</h1>
      
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
            {submitting ? 'Creating...' : 'Create Role'}
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