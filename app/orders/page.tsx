'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CurrencySymbol from '../components/CurrencySymbol';
import { calculateItemProfit, calculateOrderProfitSummary, getProfitStatus, OrderItemData } from '@/utils/profitUtils';
import { 
  formatWeightAuto, 
  isWeightBasedProduct 
} from '@/utils/weightUtils';
import ResponsiveTable from '../components/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  PlusIcon, 
  MoreVerticalIcon, 
  EditIcon, 
  EyeIcon, 
  TrashIcon,
  RefreshCwIcon,
  FilterIcon,
  CalendarIcon,
  ShoppingCartIcon,
  DollarSignIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  MessageCircleIcon
} from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantTitle?: string;
  quantity: number;
  price: string;
  totalPrice: string;
  addons?: string | null;
  costPrice?: string;
  totalCost?: string;
  // Weight-based fields
  isWeightBased?: boolean;
  weightQuantity?: number; // Weight in grams
  weightUnit?: string; // Display unit (grams, kg)
}

interface Order {
  id: string;
  orderNumber: string;
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
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingAddress1?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingCountry?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  user?: {
    id: string;
    name?: string;
    email: string;
  };
  // Driver assignment fields
  assignedDriverId?: string;
  deliveryStatus?: string;
  assignedDriver?: {
    id: string;
    user: {
      name?: string;
      phone?: string;
    };
    driver: {
      licenseNumber: string;
      vehicleType: string;
      vehiclePlateNumber: string;
      status: string;
    };
  };
}

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      
      // Process orders to add weight-based information to items
      const processedOrders = data.map((order: Order) => {
        if (order.items) {
          order.items = order.items.map((item: any) => {
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
        return order;
      });
      
      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddons = async () => {
    try {
      const res = await fetch('/api/addons');
      const data = await res.json();
      setAddons(data);
    } catch (err) {
      console.error('Error fetching addons:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchAddons();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter, dateRange]);

  const filterOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.shippingFirstName ? order.shippingFirstName.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
        (order.shippingLastName ? order.shippingLastName.toLowerCase().includes(searchTerm.toLowerCase()) : false)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date range filter
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      });
    }

    setFilteredOrders(filtered);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setOrders(orders.filter(order => order.id !== id));
        }
      } catch (error) {
        console.error('Error deleting order:', error);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete ALL orders? This action cannot be undone and will also delete all related data including order items, stock movements, and loyalty points history.')) {
      try {
        setLoading(true);
        const res = await fetch('/api/orders/delete-all', { method: 'DELETE' });
        if (res.ok) {
          setOrders([]);
          setFilteredOrders([]);
          setSelectedOrders(new Set());
          setSelectAll(false);
          alert('All orders have been deleted successfully.');
        } else {
          const errorData = await res.json();
          alert(`Failed to delete orders: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error deleting all orders:', error);
        alert('Error deleting all orders. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
    setSelectAll(newSelected.size === filteredOrders.length && filteredOrders.length > 0);
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedOrders.size} selected order(s)? This action cannot be undone.`)) {
      try {
        setLoading(true);
        const deletePromises = Array.from(selectedOrders).map(orderId =>
          fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
        );
        
        const results = await Promise.all(deletePromises);
        const failedDeletes = results.filter(res => !res.ok);
        
        if (failedDeletes.length === 0) {
          // Remove deleted orders from state
          const remainingOrders = orders.filter(order => !selectedOrders.has(order.id));
          setOrders(remainingOrders);
          setFilteredOrders(remainingOrders.filter(order => {
            // Apply current filters
            let matches = true;
            if (searchTerm) {
              matches = matches && (
                order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.shippingFirstName ? order.shippingFirstName.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
                (order.shippingLastName ? order.shippingLastName.toLowerCase().includes(searchTerm.toLowerCase()) : false)
              );
            }
            if (statusFilter) {
              matches = matches && order.status === statusFilter;
            }
            if (dateRange.startDate || dateRange.endDate) {
              const orderDate = new Date(order.createdAt);
              const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
              const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
              if (startDate && orderDate < startDate) matches = false;
              if (endDate && orderDate > endDate) matches = false;
            }
            return matches;
          }));
          setSelectedOrders(new Set());
          setSelectAll(false);
          alert(`${selectedOrders.size} order(s) deleted successfully.`);
        } else {
          alert(`Failed to delete ${failedDeletes.length} order(s). Please try again.`);
        }
      } catch (error) {
        console.error('Error deleting selected orders:', error);
        alert('Error deleting selected orders. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800'} hover:${colors[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-orange-100 text-orange-800',
    };

    return (
      <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800'} hover:${colors[status] || 'bg-gray-100'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: any) => {
    const numAmount = Number(amount);
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

  const getDeliveryStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', class: 'bg-gray-100 text-gray-800' },
      assigned: { label: 'Assigned', class: 'bg-blue-100 text-blue-800' },
      picked_up: { label: 'Picked Up', class: 'bg-yellow-100 text-yellow-800' },
      out_for_delivery: { label: 'Out for Delivery', class: 'bg-orange-100 text-orange-800' },
      delivered: { label: 'Delivered', class: 'bg-green-100 text-green-800' },
      failed: { label: 'Failed', class: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const renderDriverInfo = (order: Order) => {
    if (!order.assignedDriver) {
      return <span className="text-sm text-gray-500">No driver assigned</span>;
    }

    const driver = order.assignedDriver;
    return (
      <div className="text-sm">
        <div className="font-medium text-gray-900">
          {driver.user.name || 'N/A'}
        </div>
        <div className="text-gray-500">
          {driver.driver.vehicleType} - {driver.driver.vehiclePlateNumber}
        </div>
        {driver.user.phone && (
          <div className="text-gray-500">
            📞 {driver.user.phone}
          </div>
        )}
      </div>
    );
  };

  const calculateOrderProfit = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      return { totalRevenue: 0, totalCost: 0, totalProfit: 0, averageMargin: 0, profitableItems: 0, lossItems: 0, totalItems: 0 };
    }

    const orderItemsData: OrderItemData[] = order.items.map(item => ({
      id: item.id,
      productId: item.productId || '',
      variantId: item.variantId,
      productName: item.productName,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
      price: parseFloat(item.price) || 0,
      totalPrice: parseFloat(item.totalPrice) || 0,
      costPrice: item.costPrice ? parseFloat(item.costPrice) : undefined,
      totalCost: item.totalCost ? parseFloat(item.totalCost) : undefined,
      addons: item.addons
    }));

    return calculateOrderProfitSummary(orderItemsData);
  };

  const parseAddons = (addonsData: any) => {
    if (!addonsData) return [];
    
    try {
      if (Array.isArray(addonsData)) return addonsData;
      if (typeof addonsData === 'string') {
        const parsed = JSON.parse(addonsData);
        return Array.isArray(parsed) ? parsed : [];
      }
      if (typeof addonsData === 'object') return [addonsData];
      return [];
    } catch (error) {
      console.error('Error parsing addons:', error);
      return [];
    }
  };

  const getOrderStats = () => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    
    const { totalProfit, totalCost } = filteredOrders.reduce((acc, order) => {
      const profit = calculateOrderProfit(order);
      return {
        totalProfit: acc.totalProfit + profit.totalProfit,
        totalCost: acc.totalCost + profit.totalCost
      };
    }, { totalProfit: 0, totalCost: 0 });

    const pendingOrders = filteredOrders.filter(order => order.status === 'pending').length;
    const completedOrders = filteredOrders.filter(order => order.status === 'completed').length;

    return { totalOrders, totalRevenue, totalProfit, totalCost, pendingOrders, completedOrders };
  };

  const stats = getOrderStats();

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

  const columns = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          checked={selectAll}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      width: '50px',
      render: (_: any, order: Order) => (
        <input
          type="checkbox"
          checked={selectedOrders.has(order.id)}
          onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      )
    },
    {
      key: 'orderInfo',
      title: 'Order',
      width: '200px',
      render: (_: any, order: Order) => (
        <div className="min-w-0">
          <div className="font-medium text-sm">#{order.orderNumber}</div>
          <div className="text-xs text-muted-foreground truncate">ID: {order.id.slice(0, 8)}...</div>
        </div>
      )
    },
    {
      key: 'customer',
      title: 'Customer',
      width: '200px',
      render: (_: any, order: Order) => (
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">
            {order.shippingFirstName && order.shippingLastName 
              ? `${order.shippingFirstName} ${order.shippingLastName}`
              : order.user?.name || 'Guest'
            }
          </div>
          <div className="text-xs text-muted-foreground truncate">{order.email}</div>
          {order.phone && (
            <div className="text-xs text-muted-foreground">{order.phone}</div>
          )}
        </div>
      ),
      mobileLabel: 'Customer'
    },
    {
      key: 'items',
      title: 'Items',
      width: '250px',
      render: (_: any, order: Order) => (
        <div className="text-sm min-w-0">
          {order.items && order.items.length > 0 ? (
            <div>
              <div className="font-medium text-sm">{order.items.length} item(s)</div>
              <div className="text-muted-foreground space-y-1">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-700 text-xs truncate block">
                          {item.productName} {item.variantTitle && `(${item.variantTitle})`}
                        </span>
                        {item.isWeightBased && item.weightQuantity ? (
                          <span className="text-blue-600 text-xs">⚖️ {formatWeightAuto(item.weightQuantity).formattedString}</span>
                        ) : (
                          <span className="text-gray-500 text-xs"> x{item.quantity}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 flex-shrink-0">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{order.items.length - 2} more items
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">No items</span>
          )}
        </div>
      ),
      mobileHidden: true
    },
    {
      key: 'totalAmount',
      title: 'Total',
      width: '120px',
      render: (_: any, order: Order) => (
        <div className="font-medium text-sm">
          {formatCurrency(order.totalAmount)}
        </div>
      )
    },/*}
    {
      key: 'profit',
      title: 'Profit/Loss',
      width: '120px',
      render: (_: any, order: Order) => {
        const profit = calculateOrderProfit(order);
        const profitStatus = getProfitStatus(profit.totalProfit);
        return (
          <div className={`font-medium text-sm ${profitStatus.color}`}>
            {formatCurrency(profit.totalProfit)}
          </div>
        );
      },
      mobileHidden: true
    },
    {
      key: 'margin',
      title: 'Margin',
      width: '80px',
      render: (_: any, order: Order) => {
        const profit = calculateOrderProfit(order);
        const profitStatus = getProfitStatus(profit.totalProfit);
        return (
          <div className={`text-sm ${profitStatus.color}`}>
            {profit.averageMargin.toFixed(1)}%
          </div>
        );
      },
      mobileHidden: true
    },*/
    {
      key: 'status',
      title: 'Status',
      width: '100px',
      render: (_: any, order: Order) => getStatusBadge(order.status)
    },
    {
      key: 'paymentStatus',
      title: 'Payment',
      width: '100px',
      render: (_: any, order: Order) => getPaymentStatusBadge(order.paymentStatus),
      mobileLabel: 'Payment'
    },
    {
      key: 'driver',
      title: 'Assigned Driver',
      width: '180px',
      render: (_: any, order: Order) => renderDriverInfo(order),
      mobileHidden: true
    },
    {
      key: 'deliveryStatus',
      title: 'Delivery Status',
      width: '130px',
      render: (_: any, order: Order) => getDeliveryStatusBadge(order.deliveryStatus || 'pending'),
      mobileLabel: 'Delivery'
    },
    {
      key: 'createdAt',
      title: 'Date',
      width: '140px',
      render: (_: any, order: Order) => (
        <div className="text-sm">
          {formatDateTime(order.createdAt)}
        </div>
      )
    }
  ];

  const renderActions = (order: Order) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/orders/${order.id}/invoice`} className="flex items-center">
            <EyeIcon className="h-4 w-4 mr-2" />
            View Invoice
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/orders/edit/${order.id}`} className="flex items-center">
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/chat?orderId=${order.id}&customerId=${order.user?.id}`} className="flex items-center">
            <MessageCircleIcon className="h-4 w-4 mr-2" />
            Chat with Customer
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDelete(order.id)}
          className="text-red-600 focus:text-red-600"
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight truncate">Orders Management</h1>
          <p className="text-muted-foreground">
            Manage customer orders and track sales performance
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button onClick={fetchOrders} disabled={loading} variant="outline" size="sm">
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleDeleteSelected} 
            disabled={loading || selectedOrders.size === 0} 
            variant="destructive" 
            size="sm"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Selected ({selectedOrders.size})
          </Button>
          <Button 
            onClick={handleDeleteAll} 
            disabled={loading || orders.length === 0} 
            variant="destructive" 
            size="sm"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete All
          </Button>
          <Button asChild>
            <Link href="/orders/add">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 w-full">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Gross revenue</p>
          </CardContent>
        </Card>

        <Card className="hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUpIcon className={`h-4 w-4 ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Net profit/loss</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CalendarIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully fulfilled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full">
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Order number, email, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <div className="w-full max-w-full min-w-0">
        <ResponsiveTable
          columns={columns}
          data={filteredOrders}
          loading={loading}
          emptyMessage="No orders found"
          actions={renderActions}
        />
      </div>
    </div>
  );
} 