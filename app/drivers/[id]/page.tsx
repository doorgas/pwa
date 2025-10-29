'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Car, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  User,
  Shield,
  Activity
} from 'lucide-react';

interface DriverDetails {
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
    dateOfJoining: string;
    createdAt: string;
    updatedAt: string;
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
    createdAt: string;
  };
  activeAssignments: number;
  totalAssignments: number;
  completedDeliveries: number;
  failedDeliveries: number;
  directOrderAssignments: number;
  successRate: number;
}

interface Assignment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryStatus: string;
  assignedAt: string;
  completedAt?: string;
  priority: string;
  deliveryNotes?: string;
  estimatedDeliveryTime?: string;
}

export default function DriverDetailsPage() {
  const router = useRouter();
  const [driverId, setDriverId] = useState('');
  const [driver, setDriver] = useState<DriverDetails | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Get driver ID from URL
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    setDriverId(id);
    
    if (id) {
      fetchDriverDetails(id);
      fetchDriverAssignments(id);
    }
  }, []);

  const fetchDriverDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/drivers/${id}`);
      if (!response.ok) {
        throw new Error('Driver not found');
      }
      const data = await response.json();
      setDriver(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverAssignments = async (id: string) => {
    try {
      const response = await fetch(`/api/orders?assignedDriverId=${id}`);
      if (response.ok) {
        const data = await response.json();
        // Transform orders data to match Assignment interface
        const transformedAssignments = data.map((order: any) => ({
          id: order.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerEmail: order.email,
          deliveryAddress: [
            order.shippingAddress1,
            order.shippingCity,
            order.shippingState,
            order.shippingCountry
          ].filter(Boolean).join(', ') || 'No address provided',
          deliveryStatus: order.deliveryStatus || 'pending',
          assignedAt: order.createdAt,
          completedAt: order.updatedAt,
          priority: 'normal', // Default priority since it's not in orders table
          deliveryNotes: order.notes,
          estimatedDeliveryTime: null
        }));
        setAssignments(transformedAssignments);
      }
    } catch (err) {
      console.error('Error fetching driver assignments:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'available': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'busy': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      'offline': { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getDeliveryStatusBadge = (status: string) => {
    const statusConfig = {
      'assigned': { color: 'bg-blue-100 text-blue-800' },
      'picked_up': { color: 'bg-yellow-100 text-yellow-800' },
      'out_for_delivery': { color: 'bg-orange-100 text-orange-800' },
      'delivered': { color: 'bg-green-100 text-green-800' },
      'failed': { color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVehicleInfo = () => {
    if (!driver) return 'N/A';
    const { vehicleMake, vehicleModel, vehicleYear, vehicleType } = driver.driver;
    
    if (vehicleMake && vehicleModel) {
      return `${vehicleYear ? vehicleYear + ' ' : ''}${vehicleMake} ${vehicleModel}`;
    }
    return vehicleType || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <XCircle className="w-16 h-16 mx-auto mb-2" />
          <h2 className="text-xl font-semibold">Driver Not Found</h2>
          <p className="text-gray-600">{error || 'The requested driver could not be found.'}</p>
        </div>
        <Link
          href="/drivers"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Drivers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/drivers"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {driver.user.name || 'Unknown Driver'}
            </h1>
            <p className="text-gray-600">Driver Details & Performance</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {getStatusBadge(driver.driver.status)}
          <Link
            href={`/drivers/edit/${driver.driver.id}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Driver
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {driver.totalAssignments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{driver.completedDeliveries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-2xl font-bold text-gray-900">{driver.activeAssignments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{driver.successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Assignments ({assignments.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{driver.user.email}</p>
                </div>
              </div>
              {driver.user.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{driver.user.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">
                    {[driver.user.address, driver.user.city, driver.user.state, driver.user.country]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Joined</p>
                  <p className="font-medium">{formatDate(driver.driver.dateOfJoining || driver.driver.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Driver Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">License Number</p>
                <p className="font-medium">{driver.driver.licenseNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="mt-1">{getStatusBadge(driver.driver.status)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Base Location</p>
                <p className="font-medium">{driver.driver.baseLocation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Delivery Radius</p>
                <p className="font-medium">{driver.driver.maxDeliveryRadius} km</p>
              </div>
              {driver.driver.emergencyContact && (
                <div>
                  <p className="text-sm text-gray-600">Emergency Contact</p>
                  <p className="font-medium">
                    {driver.driver.emergencyContactName && `${driver.driver.emergencyContactName} - `}
                    {driver.driver.emergencyContact}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Car className="w-5 h-5 mr-2" />
              Vehicle Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Vehicle</p>
                <p className="font-medium">{getVehicleInfo()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Plate Number</p>
                <p className="font-medium">{driver.driver.vehiclePlateNumber}</p>
              </div>
              {driver.driver.vehicleColor && (
                <div>
                  <p className="text-sm text-gray-600">Color</p>
                  <p className="font-medium">{driver.driver.vehicleColor}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium">{driver.driver.vehicleType}</p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${driver.successRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{driver.successRate}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{driver.completedDeliveries}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{driver.failedDeliveries}</p>
                  <p className="text-xs text-gray-600">Failed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Recent Assignments</h3>
            <p className="text-gray-600">Current and recent delivery assignments</p>
          </div>
          
          {assignments.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
              <p className="text-gray-600">This driver hasn't been assigned any deliveries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {assignment.deliveryAddress}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{assignment.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getDeliveryStatusBadge(assignment.deliveryStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(assignment.assignedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.priority === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : assignment.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {assignment.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}