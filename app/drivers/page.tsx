'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MapPin, Car, Phone, Edit, Trash2, Eye, MessageCircle } from 'lucide-react';
import ResponsiveTable from '@/app/components/ResponsiveTable';

interface Driver {
  driver: {
    id: string;
    licenseNumber: string;
    vehicleType: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehiclePlateNumber: string;
    vehicleColor?: string;
    baseLocation: string;
    status: string;
    maxDeliveryRadius: number;
    isActive: boolean;
    dateOfJoining: string;
    createdAt: string;
  };
  user: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
    city?: string;
    address?: string;
    createdAt: string;
  };
  activeAssignments: number;
  totalAssignments: number;
  completedDeliveries: number;
  failedDeliveries: number;
  directOrderAssignments: number;
  successRate: number;
}

export default function DriversList() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/drivers?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setDrivers(data.drivers || []);
      } else {
        console.error('Failed to fetch drivers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [searchTerm, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    try {
      const response = await fetch(`/api/drivers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDrivers(drivers.filter(driver => driver.driver.id !== id));
        alert('Driver deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: 'Available', class: 'bg-green-100 text-green-800' },
      busy: { label: 'Busy', class: 'bg-yellow-100 text-yellow-800' },
      offline: { label: 'Offline', class: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getVehicleInfo = (driver: Driver['driver']) => {
    const parts = [
      driver.vehicleMake,
      driver.vehicleModel,
      driver.vehicleColor
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(' ') : driver.vehicleType;
  };

  const getStats = () => {
    const total = drivers.length;
    const available = drivers.filter(d => d.driver.status === 'available').length;
    const busy = drivers.filter(d => d.driver.status === 'busy').length;
    const offline = drivers.filter(d => d.driver.status === 'offline').length;
    const totalAssignments = drivers.reduce((sum, d) => sum + d.activeAssignments, 0);

    return { total, available, busy, offline, totalAssignments };
  };

  const stats = getStats();

  const columns = [
    {
      key: 'driver',
      title: 'Driver',
      render: (value: any, item: Driver) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {item.user.name || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">
              {item.user.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Contact',
      render: (value: any, item: Driver) => (
        <div>
          {item.user.phone && (
            <div className="flex items-center text-sm text-gray-900">
              <Phone className="w-4 h-4 mr-1" />
              {item.user.phone}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {item.user.city || 'N/A'}
          </div>
        </div>
      ),
      mobileHidden: true,
    },
    {
      key: 'license',
      title: 'License',
      render: (value: any, item: Driver) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {item.driver.licenseNumber}
          </div>
        </div>
      ),
      mobileHidden: true,
    },
    {
      key: 'vehicle',
      title: 'Vehicle',
      render: (value: any, item: Driver) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {getVehicleInfo(item.driver)}
          </div>
          <div className="text-gray-500">
            {item.driver.vehiclePlateNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      title: 'Base Location',
      render: (value: any, item: Driver) => (
        <div className="flex items-start text-sm">
          <MapPin className="w-4 h-4 mr-1 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-gray-900">
              {item.driver.baseLocation}
            </div>
            <div className="text-gray-500">
              {item.driver.maxDeliveryRadius}km radius
            </div>
          </div>
        </div>
      ),
      mobileHidden: true,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: any, item: Driver) => (
        <div>
          {getStatusBadge(item.driver.status)}
          {item.activeAssignments > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {item.activeAssignments} active
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'statistics',
      title: 'Order Statistics',
      render: (value: any, item: Driver) => (
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="text-gray-600">
              <span className="font-medium text-blue-600">{item.totalAssignments}</span> Total
            </div>
            <div className="text-gray-600">
              <span className="font-medium text-green-600">{item.completedDeliveries}</span> Done
            </div>
            <div className="text-gray-600">
              <span className="font-medium text-orange-600">{item.activeAssignments}</span> Active
            </div>
            <div className="text-gray-600">
              <span className="font-medium text-purple-600">{item.successRate}%</span> Rate
            </div>
          </div>
          {item.failedDeliveries > 0 && (
            <div className="text-xs text-red-500 mt-1">
              {item.failedDeliveries} failed
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'joined',
      title: 'Joined',
      render: (value: any, item: Driver) => (
        <div className="text-sm text-gray-500">
          {new Date(item.driver.dateOfJoining || item.driver.createdAt).toLocaleDateString()}
        </div>
      ),
      mobileHidden: true,
    },
  ];

  const renderActions = (driver: Driver) => (
    <div className="flex items-center space-x-2">
      <Link
        href={`/drivers/${driver.driver.id}`}
        className="text-blue-600 hover:text-blue-800 p-1"
        title="View Driver"
      >
        <Eye className="w-4 h-4" />
      </Link>
      <Link
        href={`/chat?customerId=${driver.user.id}`}
        className="text-purple-600 hover:text-purple-800 p-1"
        title="Start Support Chat"
      >
        <MessageCircle className="w-4 h-4" />
      </Link>
      <Link
        href={`/drivers/edit/${driver.driver.id}`}
        className="text-green-600 hover:text-green-800 p-1"
        title="Edit Driver"
      >
        <Edit className="w-4 h-4" />
      </Link>
      <button
        onClick={() => handleDelete(driver.driver.id)}
        className="text-red-600 hover:text-red-800 p-1"
        title="Delete Driver"
        disabled={driver.activeAssignments > 0}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-600">Manage delivery drivers and their assignments</p>
        </div>
        <Link
          href="/drivers/add"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Drivers</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{stats.busy}</div>
          <div className="text-sm text-gray-600">Busy</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-600">{stats.offline}</div>
          <div className="text-sm text-gray-600">Offline</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{stats.totalAssignments}</div>
          <div className="text-sm text-gray-600">Active Deliveries</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg border">
        <ResponsiveTable
          columns={columns}
          data={drivers}
          loading={loading}
          emptyMessage="No drivers found"
          actions={renderActions}
        />
      </div>
    </div>
  );
}