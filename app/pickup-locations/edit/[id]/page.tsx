'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoogleMapsLocationPicker from '../../../components/GoogleMapsLocationPicker';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  instructions?: string;
  latitude?: string;
  longitude?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EditPickupLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    instructions: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locationId, setLocationId] = useState<string>('');

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params;
      setLocationId(id);
      fetchLocation(id);
    };
    initializeParams();
  }, [params]);

  const fetchLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/pickup-locations/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pickup location');
      }
      
      const location: PickupLocation = await response.json();
      setFormData({
        name: location.name,
        address: location.address,
        instructions: location.instructions || '',
        latitude: location.latitude ? parseFloat(location.latitude) : null,
        longitude: location.longitude ? parseFloat(location.longitude) : null,
        isActive: location.isActive,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationData) => {
    setFormData(prev => ({
      ...prev,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!formData.name.trim()) {
      setError('Location name is required');
      setSubmitting(false);
      return;
    }

    if (!formData.address.trim()) {
      setError('Address is required');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/pickup-locations/${locationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update pickup location');
      }

      router.push('/pickup-locations');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">✏️ Edit Pickup Location</h1>
        <button
          onClick={() => router.push('/pickup-locations')}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          ← Back to Locations
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Downtown Store, Mall Pickup Point"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                A descriptive name for customers to identify this pickup location
              </p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Special Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="e.g., Enter through main entrance, Ask for pickup counter, Available 9 AM - 6 PM"
              />
              <p className="text-sm text-gray-500 mt-1">
                Provide helpful instructions for customers picking up orders at this location
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-700 font-medium">Active Location</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Only active locations will be available for customer selection
              </p>
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
            
            <GoogleMapsLocationPicker
              onLocationSelect={handleLocationSelect}
              initialAddress={formData.address}
              initialLatitude={formData.latitude || undefined}
              initialLongitude={formData.longitude || undefined}
              height="400px"
              className="w-full"
            />

            {/* Manual Address Input */}
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Full address of the pickup location"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                This address will be displayed to customers. Use the map above to automatically fill this field.
              </p>
            </div>

            {/* Coordinates Display */}
            {formData.latitude && formData.longitude && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>GPS Coordinates:</strong> {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  These coordinates will be used for precise location mapping
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push('/pickup-locations')}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Updating...' : 'Update Pickup Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}