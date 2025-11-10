'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CurrencySymbol from '../components/CurrencySymbol';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  UsersIcon, 
  PackageIcon, 
  FolderIcon, 
  ShoppingCartIcon, 
  UserCheckIcon,
  DollarSignIcon,
  BarChart3Icon,
  PlusIcon,
  RefreshCwIcon,
  FilterIcon,
  TargetIcon
} from 'lucide-react';

interface DashboardStats {
  customers: number;
  products: number;
  categories: number;
  orders: number;
  adminUsers: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageOrderValue: number;
  profitableItems: number;
  lossItems: number;
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    customers: 0,
    products: 0,
    categories: 0,
    orders: 0,
    adminUsers: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitMargin: 0,
    averageOrderValue: 0,
    profitableItems: 0,
    lossItems: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = () => {
    fetchStats();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    // Fetch stats without date filters
    setTimeout(() => fetchStats(), 100);
  };

  const setPresetDates = (preset: string) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (preset) {
      case 'today':
        setStartDate(startOfToday.toISOString().split('T')[0]);
        setEndDate(startOfToday.toISOString().split('T')[0]);
        break;
      case 'week':
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(weekAgo.toISOString().split('T')[0]);
        setEndDate(startOfToday.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthAgo = new Date(startOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setStartDate(monthAgo.toISOString().split('T')[0]);
        setEndDate(startOfToday.toISOString().split('T')[0]);
        break;
    }
    setTimeout(() => fetchStats(), 100);
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    trend, 
    onClick,
    loading: cardLoading 
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description: string;
    trend?: 'up' | 'down' | 'neutral';
    onClick?: () => void;
    loading?: boolean;
  }) => (
    <Card 
      className={`transition-all duration-200 hover:shadow-lg ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {cardLoading ? <Skeleton className="h-8 w-20" /> : value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
        {trend && !cardLoading && (
          <div className={`flex items-center mt-2 text-xs ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' && <TrendingUpIcon className="h-3 w-3 mr-1" />}
            {trend === 'down' && <TrendingDownIcon className="h-3 w-3 mr-1" />}
            {trend === 'neutral' && <TargetIcon className="h-3 w-3 mr-1" />}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const FinancialCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    color = "default",
    onClick,
    loading: cardLoading 
  }: {
    title: string;
    value: React.ReactNode;
    icon: React.ElementType;
    description: string;
    color?: "default" | "green" | "red" | "blue" | "purple";
    onClick?: () => void;
    loading?: boolean;
  }) => {
    const colorClasses = {
      default: "border-gray-200 hover:border-gray-300",
      green: "border-green-200 hover:border-green-300 bg-green-50/30",
      red: "border-red-200 hover:border-red-300 bg-red-50/30",
      blue: "border-blue-200 hover:border-blue-300 bg-blue-50/30",
      purple: "border-purple-200 hover:border-purple-300 bg-purple-50/30"
    };

    const iconColorClasses = {
      default: "text-gray-600",
      green: "text-green-600",
      red: "text-red-600",
      blue: "text-blue-600",
      purple: "text-purple-600"
    };

    return (
      <Card 
        className={`transition-all duration-200 hover:shadow-lg ${colorClasses[color]} ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        }`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={`h-5 w-5 ${iconColorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${iconColorClasses[color]}`}>
            {cardLoading ? <Skeleton className="h-9 w-24" /> : value}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={fetchStats}
            disabled={loading}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filter by Date Range
          </CardTitle>
          <CardDescription>
            Customize your dashboard view with date filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleDateFilterChange} className="w-full">
                Apply Filter
              </Button>
            </div>
            
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setPresetDates('today')}
              variant="secondary"
              size="sm"
            >
              Today
            </Button>
            <Button
              onClick={() => setPresetDates('week')}
              variant="secondary"
              size="sm"
            >
              Last 7 Days
            </Button>
            <Button
              onClick={() => setPresetDates('month')}
              variant="secondary"
              size="sm"
            >
              Last 30 Days
            </Button>
          </div>

          {/* Active Filter Display */}
          {(startDate || endDate) && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Active Filter:</span>
              <span className="text-sm text-blue-600">
                {startDate && `From ${new Date(startDate).toLocaleDateString()}`}
                {endDate && ` To ${new Date(endDate).toLocaleDateString()}`}
                {!startDate && endDate && `Up to ${new Date(endDate).toLocaleDateString()}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-red-500">⚠️</span>
              <span className="font-medium">Error loading dashboard statistics:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Customers"
          value={loading ? 0 : stats.customers}
          icon={UsersIcon}
          description="Total customers"
          trend="up"
          onClick={() => router.push('/customers')}
          loading={loading}
        />
        <StatCard
          title="Services"
          value={loading ? 0 : stats.products}
          icon={PackageIcon}
          description="Total services"
          trend="up"
          onClick={() => router.push('/products')}
          loading={loading}
        />
        <StatCard
          title="Categories"
          value={loading ? 0 : stats.categories}
          icon={FolderIcon}
          description="Product categories"
          trend="neutral"
          onClick={() => router.push('/categories')}
          loading={loading}
        />
        <StatCard
          title="Orders"
          value={loading ? 0 : stats.orders}
          icon={ShoppingCartIcon}
          description="Total orders"
          trend="up"
          onClick={() => router.push('/orders')}
          loading={loading}
        />
        <StatCard
          title="Admin Users"
          value={loading ? 0 : stats.adminUsers}
          icon={UserCheckIcon}
          description="System administrators"
          trend="neutral"
          onClick={() => router.push('/admins')}
          loading={loading}
        />
      </div>

      {/* Financial Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 hidden">
        <FinancialCard
          title="Revenue"
          value={loading ? <Skeleton className="h-9 w-24" /> : (
            <div className="flex items-center gap-1">
              <CurrencySymbol />
              {stats.totalRevenue.toFixed(2)}
            </div>
          )}
          icon={DollarSignIcon}
          description="Total revenue"
          color="green"
          onClick={() => router.push('/reports/sales')}
          loading={loading}
        />

        <FinancialCard
          title="Profit/Loss"
          value={loading ? <Skeleton className="h-9 w-24" /> : (
            <div className="flex items-center gap-1">
              <CurrencySymbol />
              {stats.totalProfit.toFixed(2)}
            </div>
          )}
          icon={stats.totalProfit >= 0 ? TrendingUpIcon : TrendingDownIcon}
          description={stats.totalProfit >= 0 ? 'Net profit' : 'Net loss'}
          color={stats.totalProfit >= 0 ? "green" : "red"}
          onClick={() => router.push('/reports/profits')}
          loading={loading}
        />

        <FinancialCard
          title="Margin"
          value={loading ? <Skeleton className="h-9 w-20" /> : `${stats.profitMargin.toFixed(1)}%`}
          icon={BarChart3Icon}
          description="Profit margin"
          color={stats.profitMargin >= 0 ? "blue" : "red"}
          loading={loading}
        />

        <FinancialCard
          title="Avg Order"
          value={loading ? <Skeleton className="h-9 w-24" /> : (
            <div className="flex items-center gap-1">
              <CurrencySymbol />
              {stats.averageOrderValue.toFixed(2)}
            </div>
          )}
          icon={ShoppingCartIcon}
          description="Average order value"
          color="purple"
          loading={loading}
        />
      </div>

      {/* Additional Dashboard Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks to get things done quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button 
                onClick={() => router.push('/products/add')}
                variant="outline"
                className="h-auto p-4 justify-start gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <PlusIcon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Add Product</div>
                  <div className="text-sm text-muted-foreground">Create new service</div>
                </div>
              </Button>
              <Button 
                onClick={() => router.push('/orders/add')}
                variant="outline"
                className="h-auto p-4 justify-start gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <ShoppingCartIcon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">New Order</div>
                  <div className="text-sm text-muted-foreground">Create order</div>
                </div>
              </Button>
              <Button 
                onClick={() => router.push('/users/add')}
                variant="outline"
                className="h-auto p-4 justify-start gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <UsersIcon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Add User</div>
                  <div className="text-sm text-muted-foreground">New customer</div>
                </div>
              </Button>
              <Button 
                onClick={() => router.push('/categories/add')}
                variant="outline"
                className="h-auto p-4 justify-start gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                  <FolderIcon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Add Category</div>
                  <div className="text-sm text-muted-foreground">Organize services</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                ✅ Healthy
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Status</span>
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                ✅ Online
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                ⚠️ 75% Used
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 