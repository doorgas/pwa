'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VariationAttributesList() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/variation-attributes?includeValues=true');
      const data = await res.json();
      setAttributes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this variation attribute? All its values will also be deleted.')) {
      try {
        await fetch(`/api/variation-attributes/${id}`, { method: 'DELETE' });
        setAttributes(attributes.filter((attr: any) => attr.id !== id));
      } catch (error) {
        console.error('Error deleting variation attribute:', error);
      }
    }
  };

  const filteredAttributes = attributes.filter((attr: any) =>
    attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attr.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'color': return '🎨';
      case 'image': return '🖼️';
      case 'button': return '🔘';
      default: return '📝';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'color': return 'Color Picker';
      case 'image': return 'Image Swatch';
      case 'button': return 'Button';
      default: return 'Dropdown';
    }
  };

  if (loading) return <div className="p-8 text-center">Loading variation attributes...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🏷️ Variation Attributes</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchAttributes}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/variation-attributes/add" 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            ➕ Add Attribute
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="text-blue-500 mr-3 text-xl">💡</div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">About Variation Attributes</h3>
            <p className="text-blue-700 text-sm">
              Variation attributes are used to create product variants like Size, Color, Material, etc. 
              Once created, you can use these attributes when adding variable products to generate all possible combinations automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-800">{attributes.length}</div>
          <div className="text-purple-600">Total Attributes</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-800">
            {attributes.filter((attr: any) => attr.isActive).length}
          </div>
          <div className="text-green-600">Active Attributes</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-800">
            {attributes.reduce((total: number, attr: any) => total + (attr.values?.length || 0), 0)}
          </div>
          <div className="text-blue-600">Total Values</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-800">
            {attributes.filter((attr: any) => attr.type === 'color').length}
          </div>
          <div className="text-orange-600">Color Attributes</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search attributes by name or slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Attributes List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {filteredAttributes.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredAttributes.map((attribute: any) => (
              <div key={attribute.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getTypeIcon(attribute.type)}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{attribute.name}</h3>
                      <p className="text-sm text-gray-500">{attribute.slug}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    attribute.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {attribute.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2">
                    Type: <span className="font-medium">{getTypeName(attribute.type)}</span>
                  </div>
                  {attribute.description && (
                    <p className="text-sm text-gray-600">{attribute.description}</p>
                  )}
                </div>

                {/* Values Preview */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Values ({attribute.values?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {attribute.values?.slice(0, 8).map((value: any) => (
                      <span
                        key={value.id}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                      >
                        {attribute.type === 'color' && value.colorCode && (
                          <span
                            className="w-3 h-3 rounded-full mr-1 border border-gray-300"
                            style={{ backgroundColor: value.colorCode }}
                          />
                        )}
                        {value.value}
                      </span>
                    ))}
                    {(attribute.values?.length || 0) > 8 && (
                      <span className="text-xs text-gray-500">
                        +{(attribute.values?.length || 0) - 8} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/variation-attributes/edit/${attribute.id}`}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors text-center"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/variation-attributes/${attribute.id}/values`}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors text-center"
                  >
                    Manage Values
                  </Link>
                  <button
                    onClick={() => handleDelete(attribute.id)}
                    className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {searchTerm 
              ? 'No attributes match your search'
              : 'No variation attributes found. Create your first attribute to get started!'
            }
          </div>
        )}
      </div>
    </div>
  );
} 