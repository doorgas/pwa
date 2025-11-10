'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CurrencySymbol from '../../../components/CurrencySymbol';
import { 
  formatWeightAuto, 
  isWeightBasedProduct 
} from '@/utils/weightUtils';

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  latitude?: string;
  longitude?: string;
  isActive: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  email: string;
  phone?: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  
  // Order type and pickup location fields
  orderType?: string;
  pickupLocationId?: string;
  
  // Billing address
  billingFirstName?: string;
  billingLastName?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  
  // Shipping address
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  
  shippingMethod?: string;
  trackingNumber?: string;
  cancelReason?: string;
  
  createdAt: string;
  updatedAt: string;
  
  items?: OrderItem[];
  user?: {
    id: string;
    name?: string;
    email: string;
  };
  pickupLocation?: PickupLocation;
}

interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  price: number;
  totalPrice: number;
  productImage?: string;
  // Weight-based fields
  isWeightBased?: boolean;
  weightQuantity?: number; // Weight in grams
  weightUnit?: string; // Display unit (grams, kg)
  addons?: Array<{
    addonId: string;
    addonTitle?: string;
    title?: string;
    name?: string;
    price: number;
    quantity: number;
  }>;
}

export default function EditOrder() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stockManagementEnabled, setStockManagementEnabled] = useState(true);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  
  // Loyalty points state
  const [loyaltySettings, setLoyaltySettings] = useState({
    enabled: false,
    redemptionValue: 0.01,
    maxRedemptionPercent: 50,
    redemptionMinimum: 100,
    earningRate: 1,
    earningBasis: 'subtotal',
    minimumOrder: 0
  });
  const [customerPoints, setCustomerPoints] = useState({
    availablePoints: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0
  });
  
  // Edit states
  const [editData, setEditData] = useState({
    status: '',
    paymentStatus: '',
    fulfillmentStatus: '',
    shippingAmount: 0,
    discountAmount: 0,
    notes: '',
    shippingMethod: '',
    trackingNumber: '',
    cancelReason: '',
    assignedDriverId: '',
    deliveryStatus: 'pending',
    // Order type and pickup location fields
    orderType: 'delivery',
    pickupLocationId: '',
    // Loyalty points fields
    pointsToRedeem: 0,
    pointsDiscountAmount: 0,
    useAllPoints: false
  });

  const orderStatuses = [
    { value: 'pending', label: 'Pending', description: 'Order received, awaiting confirmation' },
    { value: 'confirmed', label: 'Confirmed', description: 'Order confirmed, awaiting processing' },
    { value: 'processing', label: 'Processing', description: 'Order is being prepared' },
    { value: 'completed', label: 'Completed', description: 'Order has been completed' },
    { value: 'cancelled', label: 'Cancelled', description: 'Order has been cancelled' }
  ];

  const paymentStatuses = [
    { value: 'pending', label: 'Pending', description: 'Payment not yet received' },
    { value: 'paid', label: 'Paid', description: 'Payment completed successfully' },
    { value: 'failed', label: 'Failed', description: 'Payment attempt failed' },
    { value: 'refunded', label: 'Refunded', description: 'Payment has been refunded' }
  ];

  const fulfillmentStatuses = [
    { value: 'pending', label: 'Pending', description: 'Awaiting fulfillment' },
    { value: 'fulfilled', label: 'Fulfilled', description: 'Order completely fulfilled' },
    { value: 'partially_fulfilled', label: 'Partially Fulfilled', description: 'Some items fulfilled' }
  ];

  const deliveryStatuses = [
    { value: 'pending', label: 'Pending', description: 'Delivery not yet assigned' },
    { value: 'assigned', label: 'Assigned', description: 'Driver assigned to delivery' },
    { value: 'picked_up', label: 'Picked Up', description: 'Order picked up by driver' },
    { value: 'out_for_delivery', label: 'Out for Delivery', description: 'Order out for delivery' },
    { value: 'delivered', label: 'Delivered', description: 'Order successfully delivered' },
    { value: 'failed', label: 'Failed', description: 'Delivery attempt failed' }
  ];

  // Format date and time to "Aug 5, 2025 at 5:57 PM" format
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options).replace(',', ' at');
  };

  useEffect(() => {
    // Get order ID from URL
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    setOrderId(id);
    
    if (id) {
      fetchOrder(id);
    }
    
    // Fetch stock management setting, addons, drivers, pickup locations, and loyalty settings
    fetchStockManagementSetting();
    fetchAddons();
    fetchDrivers();
    fetchPickupLocations();
    fetchLoyaltySettings();
  }, []);

  const fetchStockManagementSetting = async () => {
    try {
      const res = await fetch('/api/settings/stock-management');
      const data = await res.json();
      setStockManagementEnabled(data.stockManagementEnabled);
    } catch (err) {
      console.error('Error fetching stock management setting:', err);
    }
  };

  const fetchAddons = async () => {
    try {
      const addonsRes = await fetch('/api/addons');
      if (addonsRes.ok) {
        const addonsData = await addonsRes.json();
        setAddons(addonsData);
      }
    } catch (err) {
      console.error('Failed to fetch addons:', err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/drivers/available?includeAll=true');
      const data = await res.json();
      setAvailableDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchPickupLocations = async () => {
    try {
      const response = await fetch('/api/pickup-locations?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setPickupLocations(data || []);
      }
    } catch (err) {
      console.error('Error fetching pickup locations:', err);
    }
  };

  const fetchLoyaltySettings = async () => {
    try {
      const response = await fetch('/api/settings/loyalty');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLoyaltySettings({
            enabled: data.settings.loyalty_enabled?.value || false,
            redemptionValue: data.settings.points_redemption_value?.value || 0.01,
            maxRedemptionPercent: data.settings.points_max_redemption_percent?.value || 50,
            redemptionMinimum: data.settings.points_redemption_minimum?.value || 100,
            earningRate: data.settings.points_earning_rate?.value || 1,
            earningBasis: data.settings.points_earning_basis?.value || 'subtotal',
            minimumOrder: data.settings.points_minimum_order?.value || 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching loyalty settings:', err);
    }
  };

  const fetchCustomerPoints = async (customerId: string) => {
    try {
      const response = await fetch(`/api/loyalty/points?userId=${customerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCustomerPoints({
            availablePoints: data.points.availablePoints || 0,
            totalPointsEarned: data.points.totalPointsEarned || 0,
            totalPointsRedeemed: data.points.totalPointsRedeemed || 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching customer points:', err);
    }
  };

  // Points redemption functions
  const handlePointsRedemption = (pointsToRedeem: number) => {
    if (pointsToRedeem < 0) pointsToRedeem = 0;
    if (pointsToRedeem > customerPoints.availablePoints) {
      pointsToRedeem = customerPoints.availablePoints;
    }

    // Calculate discount amount based on points
    const discountAmount = pointsToRedeem * loyaltySettings.redemptionValue;
    
    // Get current totals to check max redemption limit
    const currentSubtotal = Number(order?.subtotal) || 0;
    const currentDiscount = editData.discountAmount || 0;
    const maxAllowedDiscount = (currentSubtotal - currentDiscount) * (loyaltySettings.maxRedemptionPercent / 100);
    
    const finalDiscountAmount = Math.min(discountAmount, maxAllowedDiscount);
    const finalPointsToRedeem = Math.floor(finalDiscountAmount / loyaltySettings.redemptionValue);

    setEditData(prev => ({
      ...prev,
      pointsToRedeem: finalPointsToRedeem,
      pointsDiscountAmount: finalDiscountAmount,
      useAllPoints: false
    }));
  };

  const handleUseAllPoints = () => {
    if (editData.useAllPoints) {
      // Turn off - clear points
      setEditData(prev => ({
        ...prev,
        pointsToRedeem: 0,
        pointsDiscountAmount: 0,
        useAllPoints: false
      }));
    } else {
      // Turn on - use maximum allowed points
      const currentSubtotal = Number(order?.subtotal) || 0;
      const currentDiscount = editData.discountAmount || 0;
      const maxAllowedDiscount = (currentSubtotal - currentDiscount) * (loyaltySettings.maxRedemptionPercent / 100);
      const maxPointsDiscount = customerPoints.availablePoints * loyaltySettings.redemptionValue;
      
      const finalDiscountAmount = Math.min(maxAllowedDiscount, maxPointsDiscount);
      const finalPointsToRedeem = Math.floor(finalDiscountAmount / loyaltySettings.redemptionValue);

      setEditData(prev => ({
        ...prev,
        pointsToRedeem: finalPointsToRedeem,
        pointsDiscountAmount: finalDiscountAmount,
        useAllPoints: true
      }));
    }
  };

  const fetchOrder = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (!response.ok) {
        throw new Error('Order not found');
      }
      
      const orderData = await response.json();
      
      // Process items to add weight-based information
      if (orderData.items) {
        orderData.items = orderData.items.map((item: any) => {
          // Determine if item is weight-based by checking if weightQuantity exists and is > 0
          const weightQuantity = item.weightQuantity ? parseFloat(item.weightQuantity) : 0;
          const isWeightBased = weightQuantity > 0;

          return {
            ...item,
            isWeightBased,
            weightQuantity: weightQuantity > 0 ? weightQuantity : undefined,
            weightUnit: item.weightUnit || undefined
          };
        });
      }
      
      setOrder(orderData);
      
      // Initialize edit data with current order values
      setEditData({
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        fulfillmentStatus: orderData.fulfillmentStatus,
        shippingAmount: Number(orderData.shippingAmount) || 0,
        discountAmount: Number(orderData.discountAmount) || 0,
        notes: orderData.notes || '',
        shippingMethod: orderData.shippingMethod || '',
        trackingNumber: orderData.trackingNumber || '',
        cancelReason: orderData.cancelReason || '',
        assignedDriverId: orderData.assignedDriverId || '',
        deliveryStatus: orderData.deliveryStatus || 'pending',
        // Order type and pickup location fields
        orderType: orderData.orderType || 'delivery',
        pickupLocationId: orderData.pickupLocationId || '',
        // Loyalty points fields
        pointsToRedeem: Number(orderData.pointsToRedeem) || 0,
        pointsDiscountAmount: Number(orderData.pointsDiscountAmount) || 0,
        useAllPoints: false
      });

      // Fetch customer points if loyalty is enabled and customer exists
      if (orderData.userId && loyaltySettings.enabled) {
        fetchCustomerPoints(orderData.userId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));

    // Clear cancel reason if not cancelled
    if (field === 'status' && value !== 'cancelled') {
      setEditData(prev => ({ ...prev, cancelReason: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          previousStatus: order?.status, // For stock management
          previousPaymentStatus: order?.paymentStatus
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order');
      }

      // Refresh order data
      await fetchOrder(orderId);
      //alert('Order updated successfully!');
      
      // Redirect to orders listing page
      
        router.push('/orders');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, type: 'order' | 'payment' | 'fulfillment' = 'order') => {
    const orderStatusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const paymentStatusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-orange-100 text-orange-800',
    };

    const fulfillmentStatusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      fulfilled: 'bg-green-100 text-green-800',
      partially_fulfilled: 'bg-orange-100 text-orange-800',
    };

    let colors;
    switch (type) {
      case 'payment':
        colors = paymentStatusColors;
        break;
      case 'fulfillment':
        colors = fulfillmentStatusColors;
        break;
      default:
        colors = orderStatusColors;
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

    const formatCurrency = (amount: any) => {
    // Convert to number and handle all edge cases
    const numAmount = Number(amount);
    
    // Handle NaN, undefined, null, or invalid values
    if (isNaN(numAmount) || amount === null || amount === undefined || typeof numAmount !== 'number') {
      return (
        <span className="flex items-center gap-1">
          <CurrencySymbol />0.00
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1">
        <CurrencySymbol />{numAmount.toFixed(2)}
      </span>
    );
  };

  const parseAddons = (addonsData: any) => {
    if (!addonsData) return [];
    
    try {
      // If it's already an array, return it
      if (Array.isArray(addonsData)) {
        return addonsData;
      }
      
      // If it's a string, try to parse it
      if (typeof addonsData === 'string') {
        const parsed = JSON.parse(addonsData);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      // If it's an object but not an array, wrap it in an array
      if (typeof addonsData === 'object') {
        return [addonsData];
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing addons:', error);
      return [];
    }
  };

  const getAddonTitle = (addon: any, index: number) => {
    // First try to get the title from the stored addon data
    if (addon.addonTitle) return addon.addonTitle;
    if (addon.title) return addon.title;
    if (addon.name) return addon.name;
    
    // If no title in stored data, try to find it in the addons table
    if (addon.addonId && addons.length > 0) {
      const addonFromTable = addons.find(a => a.id === addon.addonId);
      if (addonFromTable) {
        return addonFromTable.title;
      }
    }
    
    // Fallback to generic name
    return `Addon ${index + 1}`;
  };

  const getAddonDescription = (addon: any) => {
    // Try to get description from addons table
    if (addon.addonId && addons.length > 0) {
      const addonFromTable = addons.find(a => a.id === addon.addonId);
      if (addonFromTable && addonFromTable.description) {
        return addonFromTable.description;
      }
    }
    return null;
  };

  const getAddonImage = (addon: any) => {
    // Try to get image from addons table
    if (addon.addonId && addons.length > 0) {
      const addonFromTable = addons.find(a => a.id === addon.addonId);
      if (addonFromTable && addonFromTable.image) {
        return addonFromTable.image;
      }
    }
    return null;
  };

  const calculateNewTotal = () => {
    if (!order) return 0;
    
    // Ensure all values are numbers
    const subtotal = Number(order.subtotal) || 0;
    const taxAmount = Number(order.taxAmount) || 0;
    const shippingAmount = Number(editData.shippingAmount) || 0;
    const discountAmount = Number(editData.discountAmount) || 0;
    const pointsDiscountAmount = Number(editData.pointsDiscountAmount) || 0;
    
    // Calculate: subtotal - discount - points discount + tax + shipping
    const discountedSubtotal = subtotal - discountAmount - pointsDiscountAmount;
    const total = discountedSubtotal + taxAmount + shippingAmount;
    
    return Math.max(0, total); // Ensure total is never negative
  };

  const calculatePointsToEarn = () => {
    if (!loyaltySettings.enabled || !order?.userId) {
      return 0;
    }
    
    const subtotal = Number(order.subtotal) || 0;
    const taxAmount = Number(order.taxAmount) || 0;
    const shippingAmount = Number(editData.shippingAmount) || 0;
    const discountAmount = Number(editData.discountAmount) || 0;
    const pointsDiscountAmount = Number(editData.pointsDiscountAmount) || 0;
    
    // Calculate new total for points calculation
    const discountedSubtotal = subtotal - discountAmount - pointsDiscountAmount;
    const newTotal = Math.max(0, discountedSubtotal + taxAmount + shippingAmount);
    
    const baseAmount = loyaltySettings.earningBasis === 'total' ? newTotal : subtotal;
    
    if (baseAmount < loyaltySettings.minimumOrder) {
      return 0;
    }
    
    return Math.floor(baseAmount * loyaltySettings.earningRate);
  };

  if (loading) return <div className="p-8 text-center">Loading order...</div>;
  if (error && !order) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">✏️ Edit Order #{order.orderNumber}</h1>
          <div className="text-sm text-gray-500">Order ID: {order.id}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/orders/${order.id}/invoice`)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            📄 View Invoice
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            ← Back to Orders
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {!stockManagementEnabled && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
            <div>
              <h3 className="font-medium text-orange-800">Stock Management Disabled</h3>
              <p className="text-sm text-orange-600 mt-1">
                Order status changes will not affect inventory levels. Stock management is currently disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {stockManagementEnabled && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
            <div>
              <h3 className="font-medium text-blue-800">Stock Management Enabled</h3>
              <p className="text-sm text-blue-600 mt-1">
                Order status changes will automatically update inventory levels where applicable.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📊 Order Status</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Order Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) => handleStatusChange('status', e.target.value)}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    {orderStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {orderStatuses.find(s => s.value === editData.status)?.description}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={editData.paymentStatus}
                    onChange={(e) => handleStatusChange('paymentStatus', e.target.value)}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    {paymentStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {paymentStatuses.find(s => s.value === editData.paymentStatus)?.description}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Fulfillment Status</label>
                  <select
                    value={editData.fulfillmentStatus}
                    onChange={(e) => handleStatusChange('fulfillmentStatus', e.target.value)}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    {fulfillmentStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {fulfillmentStatuses.find(s => s.value === editData.fulfillmentStatus)?.description}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Order Type</label>
                  <select
                    value={editData.orderType}
                    onChange={(e) => handleStatusChange('orderType', e.target.value)}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="delivery">🚚 Delivery</option>
                    <option value="pickup">📍 Pickup</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {editData.orderType === 'delivery' ? 'Order will be delivered to customer' : 'Customer will pick up at location'}
                  </div>
                </div>

                {editData.orderType === 'pickup' && (
                  <div>
                    <label className="block text-gray-700 mb-2">Pickup Location</label>
                    <select
                      value={editData.pickupLocationId}
                      onChange={(e) => handleStatusChange('pickupLocationId', e.target.value)}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select pickup location --</option>
                      {pickupLocations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.address}
                        </option>
                      ))}
                    </select>
                    {pickupLocations.length === 0 && (
                      <div className="text-xs text-red-500 mt-1">No pickup locations available</div>
                    )}
                    {order.pickupLocation && (
                      <div className="text-xs text-green-600 mt-1">
                        Current: {order.pickupLocation.name} - {order.pickupLocation.address}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 mb-2">Assigned Driver</label>
                  <select
                    value={editData.assignedDriverId}
                    onChange={(e) => handleStatusChange('assignedDriverId', e.target.value)}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- No driver assigned --</option>
                    {availableDrivers.map((driverData) => (
                      <option key={driverData.driver.id} value={driverData.driver.id}>
                        {driverData.user.name} - {driverData.driver.vehicleType} ({driverData.driver.vehiclePlateNumber}) - {driverData.driver.status}
                      </option>
                    ))}
                  </select>
                  {availableDrivers.length === 0 && (
                    <div className="text-xs text-red-500 mt-1">No drivers available</div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Delivery Status</label>
                  <select
                    value={editData.deliveryStatus}
                    onChange={(e) => handleStatusChange('deliveryStatus', e.target.value)}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    {deliveryStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {deliveryStatuses.find(s => s.value === editData.deliveryStatus)?.description}
                  </div>
                </div>
              </div>

              

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Discount Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.discountAmount}
                    onChange={(e) => setEditData({...editData, discountAmount: Number(e.target.value) || 0})}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {editData.status === 'cancelled' && (
                  <div>
                    <label className="block text-gray-700 mb-2">Cancel Reason</label>
                    <input
                      type="text"
                      value={editData.cancelReason}
                      onChange={(e) => setEditData({...editData, cancelReason: e.target.value})}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                      placeholder="Reason for cancellation"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Order Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({...editData, notes: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Internal notes about this order..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Order'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchOrder(orderId)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Reset Changes
                </button>
              </div>
            </form>
          </div>

          {/* Loyalty Points Redemption */}
          {loyaltySettings.enabled && order?.userId && customerPoints.availablePoints > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🎁 Loyalty Points</h3>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">Available Points:</span>
                  <span className="text-lg font-bold text-purple-600">{customerPoints.availablePoints}</span>
                </div>
                <div className="text-xs text-purple-600">
                  Worth up to {formatCurrency(customerPoints.availablePoints * loyaltySettings.redemptionValue)} discount
                </div>
              </div>

              <div className="space-y-4">
                {/* Use All Points Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Use All Available Points</label>
                    <p className="text-xs text-gray-500">
                      Apply maximum discount (up to {loyaltySettings.maxRedemptionPercent}% of order)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseAllPoints}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      editData.useAllPoints ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editData.useAllPoints ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Manual Points Input */}
                {!editData.useAllPoints && (
                  <div>
                    <label className="block text-gray-700 mb-2">Points to Redeem</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={customerPoints.availablePoints}
                        value={editData.pointsToRedeem}
                        onChange={(e) => handlePointsRedemption(parseInt(e.target.value) || 0)}
                        className="flex-1 p-2 border rounded focus:border-purple-500 focus:outline-none"
                        placeholder={`Min: ${loyaltySettings.redemptionMinimum}`}
                      />
                      <button
                        type="button"
                        onClick={() => handlePointsRedemption(customerPoints.availablePoints)}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        Max
                      </button>
                    </div>
                    {editData.pointsToRedeem > 0 && (
                      <div className="mt-2 text-sm text-green-600">
                        Discount: {formatCurrency(editData.pointsDiscountAmount)}
                      </div>
                    )}
                    {editData.pointsToRedeem > 0 && editData.pointsToRedeem < loyaltySettings.redemptionMinimum && (
                      <div className="mt-2 text-sm text-red-600">
                        Minimum {loyaltySettings.redemptionMinimum} points required for redemption
                      </div>
                    )}
                  </div>
                )}

                {/* Points Summary */}
                {editData.pointsToRedeem > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm text-green-800">
                      <div className="flex justify-between">
                        <span>Points to redeem:</span>
                        <span className="font-medium">{editData.pointsToRedeem}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount amount:</span>
                        <span className="font-medium">{formatCurrency(editData.pointsDiscountAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-green-600 mt-1">
                        <span>Remaining points:</span>
                        <span>{customerPoints.availablePoints - editData.pointsToRedeem}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📦 Order Items</h3>
            
            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {item.productImage && (
                          <img 
                            src={item.productImage} 
                            alt={item.productName}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          {item.variantTitle && (
                            <div className="text-sm text-gray-600">{item.variantTitle}</div>
                          )}
                          {item.sku && (
                            <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                          )}
                          {item.isWeightBased && item.weightQuantity && (
                            <div className="text-sm text-blue-600">
                              ⚖️ Weight: {formatWeightAuto(item.weightQuantity).formattedString}
                            </div>
                          )}
                          {(() => {
                            const parsedAddons = parseAddons(item.addons);
                            return parsedAddons.length > 0 && (
                              <div className="text-xs text-blue-600 mt-1">
                                🧩 {parsedAddons.length} addon(s) included
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {(() => {
                            const parsedAddons = parseAddons(item.addons);
                            if (parsedAddons.length > 0) {
                              return (
                                <div>
                                  <div className="text-sm">Base: {formatCurrency(item.price)} x {item.quantity}</div>
                                  <div className="text-xs text-gray-500">
                                    +Addons: {formatCurrency(parsedAddons.reduce((sum, addon) => sum + ((Number(addon.price) || 0) * (Number(addon.quantity) || 1)), 0))} x {item.quantity}
                                  </div>
                                </div>
                              );
                            } else if (item.isWeightBased && item.weightQuantity) {
                              return (
                                <div className="text-sm">
                                  {formatCurrency(item.price)} (for {formatWeightAuto(item.weightQuantity).formattedString})
                                </div>
                              );
                            } else {
                              return <div>{formatCurrency(item.price)} x {item.quantity}</div>;
                            }
                          })()}
                        </div>
                        <div className="text-lg font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Display addons for group products */}
                    {(() => {
                      const parsedAddons = parseAddons(item.addons);
                      return parsedAddons.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-blue-200">
                          <div className="text-sm font-medium text-gray-700 mb-2">🧩 Addons ({parsedAddons.length}):</div>
                          <div className="space-y-2">
                            {parsedAddons.map((addon, addonIndex) => {
                            // Ensure addon has required properties
                            const safeAddon = {
                              addonId: addon.addonId || '',
                              addonTitle: addon.addonTitle || addon.title || addon.name || `Addon ${addonIndex + 1}`,
                              price: Number(addon.price) || 0,
                              quantity: Number(addon.quantity) || 1
                            };
                            
                            const addonDescription = getAddonDescription(addon);
                            const addonImage = getAddonImage(addon);
                            return (
                              <div key={addonIndex} className="flex items-start justify-between text-sm">
                                <div className="flex items-start gap-2 flex-1">
                                  {addonImage && (
                                    <img 
                                      src={addonImage} 
                                      alt={safeAddon.addonTitle}
                                      className="w-6 h-6 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-700">
                                      • {safeAddon.addonTitle} (x{safeAddon.quantity})
                                    </div>
                                    {addonDescription && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {addonDescription}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="font-medium text-gray-700">
                                    {formatCurrency(safeAddon.price)} each
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Total: {formatCurrency(safeAddon.price * safeAddon.quantity)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                            <div className="flex justify-between text-sm font-medium text-gray-700 border-t pt-2 mt-2">
                              <span>Addons subtotal per product:</span>
                              <span>{formatCurrency(parsedAddons.reduce((sum, addon) => sum + ((Number(addon.price) || 0) * (Number(addon.quantity) || 1)), 0))}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No items in this order
              </div>
            )}
          </div>

          {/* Customer Information */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">👤 Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Contact</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2">{order.email}</span>
                  </div>
                  {order.phone && (
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2">{order.phone}</span>
                    </div>
                  )}
                  {order.user && (
                    <div>
                      <span className="text-gray-500">Customer:</span>
                      <span className="ml-2">{order.user.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">Shipping Address</h4>
                <div className="text-sm text-gray-600">
                  {order.shippingFirstName || order.shippingLastName ? (
                    <div>
                      <div>{order.shippingFirstName} {order.shippingLastName}</div>
                      <div>{order.shippingAddress1}</div>
                      {order.shippingAddress2 && <div>{order.shippingAddress2}</div>}
                      <div>
                        {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
                      </div>
                      <div>{order.shippingCountry}</div>
                    </div>
                  ) : (
                    <div className="text-gray-400">No shipping address provided</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">📊 Order Summary</h3>
            
            {/* Current Status */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Order Status:</span>
                {getStatusBadge(order.status, 'order')}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment:</span>
                {getStatusBadge(order.paymentStatus, 'payment')}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fulfillment:</span>
                {getStatusBadge(order.fulfillmentStatus, 'fulfillment')}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>{formatCurrency(editData.shippingAmount)}</span>
              </div>
              
              {editData.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(editData.discountAmount)}</span>
                </div>
              )}
              
              {editData.pointsDiscountAmount > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Points Discount ({editData.pointsToRedeem} pts):</span>
                  <span>-{formatCurrency(editData.pointsDiscountAmount)}</span>
                </div>
              )}
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(calculateNewTotal())}</span>
                </div>
              </div>

              {/* Points Preview */}
              {loyaltySettings.enabled && order.userId && (
                <div className="border-t pt-3">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-purple-800 mb-1">🎁 Loyalty Points</div>
                    <div className="text-sm text-purple-700">
                      Points for this order: <strong>{calculatePointsToEarn()} points</strong>
                      {calculatePointsToEarn() === 0 && loyaltySettings.minimumOrder > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          (Minimum order: {formatCurrency(loyaltySettings.minimumOrder)})
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-purple-600 mt-2">
                      {order.status === 'completed' && editData.status === 'completed' ? (
                        <span className="text-green-600">✅ Points are available</span>
                      ) : editData.status === 'completed' && order.status !== 'completed' ? (
                        <span className="text-green-600">✅ Points will be activated when saved</span>
                      ) : order.status !== 'completed' && editData.status !== 'completed' ? (
                        <span className="text-yellow-600">⏳ Points are pending completion</span>
                      ) : (
                        <span className="text-yellow-600">⏳ Points will remain pending</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Timeline */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Order Timeline</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span>{formatDateTime(order.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <div className="text-sm text-gray-600">
                Items: <strong>{order.items?.length || 0}</strong>
              </div>
              
              {editData.status === 'cancelled' && order.status !== 'cancelled' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-red-800 text-sm font-medium">
                    ⚠️ Status Change Warning
                  </div>
                  <div className="text-red-600 text-sm">
                    Cancelling this order will automatically restore inventory for all items.
                  </div>
                </div>
              )}

              {editData.status === 'confirmed' && order.status === 'pending' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-blue-800 text-sm font-medium">
                    ℹ️ Status Change Info
                  </div>
                  <div className="text-blue-600 text-sm">
                    {stockManagementEnabled 
                      ? 'Confirming this order will validate and reserve inventory for all items. This action may fail if insufficient stock is available.'
                      : 'Confirming this order will not affect inventory levels since stock management is disabled.'
                    }
                  </div>
                </div>
              )}

              {editData.paymentStatus === 'paid' && order.paymentStatus === 'pending' && order.status === 'pending' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-green-800 text-sm font-medium">
                    💳 Payment Status Change Info
                  </div>
                  <div className="text-green-600 text-sm">
                    {stockManagementEnabled 
                      ? 'Marking payment as paid will validate and reserve inventory for all items. This action may fail if insufficient stock is available.'
                      : 'Marking payment as paid will not affect inventory levels since stock management is disabled.'
                    }
                  </div>
                </div>
              )}

              {editData.status === 'completed' && order.status !== 'completed' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-green-800 text-sm font-medium">
                    ✅ Status Change Info
                  </div>
                  <div className="text-green-600 text-sm">
                    {stockManagementEnabled 
                      ? 'Marking as completed will finalize the order and permanently reduce inventory quantities.'
                      : 'Marking as completed will not affect inventory levels since stock management is disabled.'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 