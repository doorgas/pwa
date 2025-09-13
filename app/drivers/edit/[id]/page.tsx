'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Car, MapPin, Phone, Shield } from 'lucide-react';
import GoogleMapsLocationPicker from '../../../components/GoogleMapsLocationPicker';

interface Driver {
  driver: {
    id: string;
    licenseNumber: string;
    vehicleType: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePlateNumber: string;
    vehicleColor?: string;
    baseLocation: string;
    baseLatitude?: number;
    baseLongitude?: number;
    currentLatitude?: number;
    currentLongitude?: number;
    maxDeliveryRadius: number;
    emergencyContact?: string;
    emergencyContactName?: string;
    status: string;
    isActive: boolean;
  };
  user: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
    city?: string;
    address?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  activeAssignments: number;
}

export default function EditDriver() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    // User fields
    name: '',
    phone: '',
    city: '',
    address: '',
    state: '',
    postalCode: '',
    country: '',
    
    // Driver fields
    licenseNumber: '',
    vehicleType: 'car',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlateNumber: '',
    vehicleColor: '',
    baseLocation: '',
    baseLatitude: '',
    baseLongitude: '',
    currentLatitude: '',
    currentLongitude: '',
    maxDeliveryRadius: '50',
    emergencyContact: '',
    emergencyContactName: '',
    status: 'offline',
    isActive: true
  });

  const fetchDriver = async () => {
    try {
      setFetchLoading(true);
      const response = await fetch(`/api/drivers/${driverId}`);
      const data = await response.json();
      
      if (response.ok) {
        setDriver(data);
        // Populate form data
        setFormData({
          name: data.user.name || '',
          phone: data.user.phone || '',
          city: data.user.city || '',
          address: data.user.address || '',
          state: data.user.state || '',
          postalCode: data.user.postalCode || '',
          country: data.user.country || '',
          licenseNumber: data.driver.licenseNumber || '',
          vehicleType: data.driver.vehicleType || 'car',
          vehicleMake: data.driver.vehicleMake || '',
          vehicleModel: data.driver.vehicleModel || '',
          vehicleYear: data.driver.vehicleYear?.toString() || '',
          vehiclePlateNumber: data.driver.vehiclePlateNumber || '',
          vehicleColor: data.driver.vehicleColor || '',
          baseLocation: data.driver.baseLocation || '',
          baseLatitude: data.driver.baseLatitude?.toString() || '',
          baseLongitude: data.driver.baseLongitude?.toString() || '',
          currentLatitude: data.driver.currentLatitude?.toString() || '',
          currentLongitude: data.driver.currentLongitude?.toString() || '',
          maxDeliveryRadius: data.driver.maxDeliveryRadius?.toString() || '50',
          emergencyContact: data.driver.emergencyContact || '',
          emergencyContactName: data.driver.emergencyContactName || '',
          status: data.driver.status || 'offline',
          isActive: data.driver.isActive !== false
        });
      } else {
        alert(data.error || 'Failed to fetch driver');
        router.push('/drivers');
      }
    } catch (error) {
      console.error('Error fetching driver:', error);
      alert('Failed to fetch driver');
      router.push('/drivers');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      fetchDriver();
    }
  }, [driverId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleLocationSelect = (location: { address: string; latitude: number; longitude: number }) => {
    setFormData({
      ...formData,
      baseLocation: location.address,
      baseLatitude: location.latitude.toString(),
      baseLongitude: location.longitude.toString()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Driver updated successfully!');
        router.push('/drivers');
      } else {
        alert(data.error || 'Failed to update driver');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Failed to update driver');
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes = [
    { value: 'car', label: 'Car' },
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'van', label: 'Van' },
    { value: 'truck', label: 'Truck' },
    { value: 'bicycle', label: 'Bicycle' },
  ];

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'busy', label: 'Busy' },
    { value: 'offline', label: 'Offline' },
  ];

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading driver...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Driver not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/drivers"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Driver</h1>
          <p className="text-gray-600">Update driver information</p>
        </div>
      </div>

      {/* Driver Status Alert */}
      {driver.activeAssignments > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                This driver has {driver.activeAssignments} active assignment(s). Some changes may affect ongoing deliveries.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        

        {/* License & Status */}
        <div className="bg-white p-6 rounded-lg border hidden">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">License & Status</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Number
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter license number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active
              </label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Driver is active
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white p-6 rounded-lg border hidden">
          <div className="flex items-center space-x-2 mb-4">
            <Car className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vehicle Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {vehicleTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plate Number
              </label>
              <input
                type="text"
                name="vehiclePlateNumber"
                value={formData.vehiclePlateNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter plate number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Make
              </label>
              <input
                type="text"
                name="vehicleMake"
                value={formData.vehicleMake}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Toyota, Honda"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                type="text"
                name="vehicleModel"
                value={formData.vehicleModel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Camry, Civic"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="number"
                name="vehicleYear"
                value={formData.vehicleYear}
                onChange={handleChange}
                min="1990"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 2020"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                name="vehicleColor"
                value={formData.vehicleColor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., White, Black"
              />
            </div>
          </div>
        </div>

        {/* Location & Service Area */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Location & Service Area</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Location
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Search for an address, click on the map, or use your current location to update the driver's base location.
              </p>
              <GoogleMapsLocationPicker
                onLocationSelect={handleLocationSelect}
                initialAddress={formData.baseLocation}
                initialLatitude={formData.baseLatitude ? parseFloat(formData.baseLatitude) : undefined}
                initialLongitude={formData.baseLongitude ? parseFloat(formData.baseLongitude) : undefined}
                height="350px"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Latitude
                </label>
                <input
                  type="number"
                  name="baseLatitude"
                  value={formData.baseLatitude}
                  onChange={handleChange}
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auto-filled"
                />
              </div>

              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Longitude
                </label>
                <input
                  type="number"
                  name="baseLongitude"
                  value={formData.baseLongitude}
                  onChange={handleChange}
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auto-filled"
                />
              </div>

              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Latitude
                </label>
                <input
                  type="number"
                  name="currentLatitude"
                  value={formData.currentLatitude}
                  onChange={handleChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Current position"
                />
              </div>

              <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Longitude
                </label>
                <input
                  type="number"
                  name="currentLongitude"
                  value={formData.currentLongitude}
                  onChange={handleChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Current position"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Delivery Radius (km)
                </label>
                <input
                  type="number"
                  name="maxDeliveryRadius"
                  value={formData.maxDeliveryRadius}
                  onChange={handleChange}
                  min="1"
                  max="200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50"
                />
              </div>
            </div>

            {/* Hidden input for base location to ensure form validation */}
            <input
              type="hidden"
              name="baseLocation"
              value={formData.baseLocation}
            />
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={driver.user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                placeholder="Email cannot be changed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>

            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter city"
              />
            </div>

            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Emirate
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter state/emirate"
              />
            </div>

            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter postal code"
              />
            </div>

            <div className="md:col-span-2 hidden">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter full address"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white p-6 rounded-lg border hidden">
          <div className="flex items-center space-x-2 mb-4">
            <Phone className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Emergency Contact</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter contact name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter contact phone"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/drivers"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Updating...' : 'Update Driver'}
          </button>
        </div>
      </form>
    </div>
  );
}