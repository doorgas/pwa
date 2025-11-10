'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  formatWeightAuto, 
  isWeightBasedProduct, 
  getWeightStockStatus,
  formatWeight 
} from '@/utils/weightUtils';
import CurrencySymbol from '../components/CurrencySymbol';
import ResponsiveTable from '../components/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrashIcon,
  RefreshCwIcon,
  PackageIcon,
  ScaleIcon,
  BarChart3Icon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShoppingCartIcon,
  MinusCircleIcon
} from 'lucide-react';

interface InventoryItem {
  inventory: {
    id: string;
    quantity: number;
    reservedQuantity?: number;
    availableQuantity?: number;
    reorderPoint: number;
    location?: string;
    weightQuantity?: string;
    reservedWeight?: string;
    availableWeight?: string;
    reorderWeightPoint?: string;
    lastRestock?: string;
  };
  product?: {
    id: string;
    name: string;
    price?: string;
    pricePerUnit?: string;
    baseWeightUnit?: string;
    stockManagementType?: string;
  };
  variant?: {
    id: string;
    title: string;
  };
}

export default function InventoryList() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [stockManagementEnabled, setStockManagementEnabled] = useState(true);
  const [updatingStockSetting, setUpdatingStockSetting] = useState(false);
  const [activeTab, setActiveTab] = useState('quantity'); // 'quantity' or 'weight'

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setInventory(data);
      setFilteredInventory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockManagementSetting = async () => {
    try {
      const res = await fetch('/api/settings/stock-management');
      const data = await res.json();
      setStockManagementEnabled(data.stockManagementEnabled);
    } catch (err) {
      console.error('Error fetching stock management setting:', err);
    }
  };

  const toggleStockManagement = async () => {
    setUpdatingStockSetting(true);
    try {
      const res = await fetch('/api/settings/stock-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !stockManagementEnabled })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update stock management setting');
      }
      
      const data = await res.json();
      setStockManagementEnabled(data.stockManagementEnabled);
      
      alert(data.message);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUpdatingStockSetting(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchStockManagementSetting();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchTerm, stockFilter, activeTab]);

  const filterInventory = () => {
    let filtered = inventory;

    // Filter by tab (stock management type)
    filtered = filtered.filter((item: InventoryItem) => {
      const stockManagementType = item.product?.stockManagementType || 'quantity';
      if (activeTab === 'weight') {
        return isWeightBasedProduct(stockManagementType);
      } else {
        return !isWeightBasedProduct(stockManagementType);
      }
    });

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((item: InventoryItem) =>
        item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variant?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.inventory.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Stock status filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter((item: InventoryItem) => {
        const stockManagementType = item.product?.stockManagementType || 'quantity';
        
        if (stockFilter === 'soldout') {
          // Sold out items are those with zero total stock
          if (isWeightBasedProduct(stockManagementType)) {
            const totalWeight = parseFloat(item.inventory.weightQuantity || '0');
            return totalWeight <= 0;
          } else {
            return item.inventory.quantity <= 0;
          }
        } else {
          let stockStatus;
          
          if (isWeightBasedProduct(stockManagementType)) {
            const availableWeight = parseFloat(item.inventory.availableWeight || '0');
            const reorderPoint = parseFloat(item.inventory.reorderWeightPoint || '0');
            const totalWeight = parseFloat(item.inventory.weightQuantity || '0');
            
            if (totalWeight <= 0) {
              stockStatus = { status: 'Sold Out' };
            } else if (availableWeight <= 0) {
              stockStatus = { status: 'Out of Stock' };
            } else {
              stockStatus = getWeightStockStatus(availableWeight, reorderPoint);
            }
          } else {
            const availableQuantity = item.inventory.availableQuantity || item.inventory.quantity;
            
            if (item.inventory.quantity <= 0) {
              stockStatus = { status: 'Sold Out' };
            } else if (availableQuantity <= 0) {
              stockStatus = { status: 'Out of Stock' };
            } else {
              stockStatus = getStockStatus(item.inventory.quantity, item.inventory.reorderPoint);
            }
          }
          
          return stockStatus.status.toLowerCase().replace(' ', '') === stockFilter;
        }
      });
    }

    setFilteredInventory(filtered);
  };

  const getStockStatus = (quantity: number, reorderPoint: number) => {
    if (quantity <= 0) {
      return { status: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    } else if (quantity <= reorderPoint) {
      return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'In Stock', color: 'bg-green-100 text-green-800' };
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
        setInventory(inventory.filter((item) => item.inventory.id !== id));
      } catch (error) {
        console.error('Error deleting inventory item:', error);
      }
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventory.map(item => item.inventory.id));
    }
  };

  const handleBulkRestock = () => {
    if (selectedItems.length === 0) return;
    alert(`Bulk restock for ${selectedItems.length} items - Feature coming soon!`);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedItems.length} inventory items?`)) {
      // Implementation would go here
      alert(`Bulk delete for ${selectedItems.length} items - Feature coming soon!`);
    }
  };

  const getTotalValue = () => {
    return filteredInventory.reduce((total: number, item: InventoryItem) => {
      const stockManagementType = item.product?.stockManagementType || 'quantity';
      const isWeightBased = isWeightBasedProduct(stockManagementType);
      
      let itemValue = 0;
      if (isWeightBased) {
        // Calculate value based on weight and price per unit
        const pricePerUnit = parseFloat(item.product?.pricePerUnit || '0');
        const totalWeight = parseFloat(item.inventory.weightQuantity || '0');
        const baseWeightUnit = item.product?.baseWeightUnit || 'grams';
        
        // Convert price to per gram if stored per kg
        const pricePerGram = baseWeightUnit === 'kg' ? pricePerUnit / 1000 : pricePerUnit;
        itemValue = totalWeight * pricePerGram;
      } else {
        const productPrice = parseFloat(item.product?.price || '0');
        itemValue = item.inventory.quantity * productPrice;
      }
      
      return total + itemValue;
    }, 0);
  };

  const getStats = () => {
    const totalItems = filteredInventory.length;
    const lowStockItems = filteredInventory.filter((item: InventoryItem) => {
      const stockManagementType = item.product?.stockManagementType || 'quantity';
      if (isWeightBasedProduct(stockManagementType)) {
        const availableWeight = parseFloat(item.inventory.availableWeight || '0');
        const reorderPoint = parseFloat(item.inventory.reorderWeightPoint || '0');
        const status = getWeightStockStatus(availableWeight, reorderPoint);
        return status.status === 'Low Stock';
      } else {
        const status = getStockStatus(item.inventory.quantity, item.inventory.reorderPoint);
        return status.status === 'Low Stock';
      }
    }).length;
    
    const outOfStockItems = filteredInventory.filter((item: InventoryItem) => {
      const stockManagementType = item.product?.stockManagementType || 'quantity';
      if (isWeightBasedProduct(stockManagementType)) {
        const availableWeight = parseFloat(item.inventory.availableWeight || '0');
        const totalWeight = parseFloat(item.inventory.weightQuantity || '0');
        return availableWeight <= 0 && totalWeight > 0; // Has inventory record but no available stock
      } else {
        const availableQuantity = item.inventory.availableQuantity || item.inventory.quantity;
        return availableQuantity <= 0 && item.inventory.quantity > 0; // Has inventory record but no available stock
      }
    }).length;

    // Sold out items are those with zero total stock (completely depleted)
    const soldOutItems = filteredInventory.filter((item: InventoryItem) => {
      const stockManagementType = item.product?.stockManagementType || 'quantity';
      if (isWeightBasedProduct(stockManagementType)) {
        const totalWeight = parseFloat(item.inventory.weightQuantity || '0');
        return totalWeight <= 0; // Completely sold out - no stock left
      } else {
        return item.inventory.quantity <= 0; // Completely sold out - no stock left
      }
    }).length;

    const inStockItems = totalItems - lowStockItems - outOfStockItems - soldOutItems;

    const totalValue = getTotalValue();

    return { totalItems, lowStockItems, outOfStockItems, soldOutItems, inStockItems, totalValue };
  };

  const stats = getStats();

  // Define columns for weight-based inventory
  const weightColumns = [
    {
      key: 'select',
      title: '',
      render: (_: any, item: InventoryItem) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(item.inventory.id)}
          onChange={() => handleSelectItem(item.inventory.id)}
          className="rounded"
        />
      ),
      mobileHidden: true
    },
    {
      key: 'product',
      title: 'Product',
      render: (_: any, item: InventoryItem) => (
        <div>
          <div className="font-medium">{item.product?.name || 'N/A'}</div>
          {item.variant && (
            <div className="text-sm text-muted-foreground">{item.variant.title}</div>
          )}
          {item.inventory.location && (
            <div className="text-xs text-muted-foreground">📍 {item.inventory.location}</div>
          )}
        </div>
      )
    },
    {
      key: 'weight',
      title: 'Weight Stock',
      render: (_: any, item: InventoryItem) => (
                 <div className="text-sm">
           <div className="font-medium">
             Total: {formatWeightAuto(parseFloat(item.inventory.weightQuantity || '0')).formattedString}
           </div>
           <div className="text-muted-foreground">
             Available: {formatWeightAuto(parseFloat(item.inventory.availableWeight || '0')).formattedString}
           </div>
           <div className="text-muted-foreground">
             Reserved: {formatWeightAuto(parseFloat(item.inventory.reservedWeight || '0')).formattedString}
           </div>
         </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, item: InventoryItem) => {
        const availableWeight = parseFloat(item.inventory.availableWeight || '0');
        const reorderPoint = parseFloat(item.inventory.reorderWeightPoint || '0');
        const totalWeight = parseFloat(item.inventory.weightQuantity || '0');
        
        let status;
        if (totalWeight <= 0) {
          status = { status: 'Sold Out' };
        } else if (availableWeight <= 0) {
          status = { status: 'Out of Stock' };
        } else {
          status = getWeightStockStatus(availableWeight, reorderPoint);
        }
        
        return (
          <Badge 
            variant={
              status.status === 'In Stock' ? 'default' : 
              status.status === 'Low Stock' ? 'secondary' : 
              status.status === 'Sold Out' ? 'outline' : 'destructive'
            }
          >
            {status.status}
          </Badge>
        );
      }
    },
    {
      key: 'value',
      title: 'Value',
      render: (_: any, item: InventoryItem) => {
        const pricePerUnit = parseFloat(item.product?.pricePerUnit || '0');
        const totalWeight = parseFloat(item.inventory.weightQuantity || '0');
        const baseWeightUnit = item.product?.baseWeightUnit || 'grams';
        const pricePerGram = baseWeightUnit === 'kg' ? pricePerUnit / 1000 : pricePerUnit;
        const itemValue = totalWeight * pricePerGram;
        
        return (
          <div className="font-medium">
            <CurrencySymbol />{itemValue.toFixed(2)}
          </div>
        );
      },
      mobileHidden: true
    },
    {
      key: 'lastRestock',
      title: 'Last Restock',
      render: (_: any, item: InventoryItem) => (
        <div className="text-sm">
          {item.inventory.lastRestock 
            ? new Date(item.inventory.lastRestock).toLocaleDateString()
            : 'Never'
          }
        </div>
      ),
      mobileHidden: true
    }
  ];

  // Define columns for quantity-based inventory
  const quantityColumns = [
    {
      key: 'select',
      title: '',
      render: (_: any, item: InventoryItem) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(item.inventory.id)}
          onChange={() => handleSelectItem(item.inventory.id)}
          className="rounded"
        />
      ),
      mobileHidden: true
    },
    {
      key: 'product',
      title: 'Product',
      render: (_: any, item: InventoryItem) => (
        <div>
          <div className="font-medium">{item.product?.name || 'N/A'}</div>
          {item.variant && (
            <div className="text-sm text-muted-foreground">{item.variant.title}</div>
          )}
          {item.inventory.location && (
            <div className="text-xs text-muted-foreground">📍 {item.inventory.location}</div>
          )}
        </div>
      )
    },
    {
      key: 'quantity',
      title: 'Quantity Stock',
      render: (_: any, item: InventoryItem) => (
        <div className="text-sm">
          <div className="font-medium">Total: {item.inventory.quantity}</div>
          <div className="text-muted-foreground">Available: {item.inventory.availableQuantity || item.inventory.quantity}</div>
          <div className="text-muted-foreground">Reserved: {item.inventory.reservedQuantity || 0}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, item: InventoryItem) => {
        const availableQuantity = item.inventory.availableQuantity || item.inventory.quantity;
        
        let status;
        if (item.inventory.quantity <= 0) {
          status = { status: 'Sold Out' };
        } else if (availableQuantity <= 0) {
          status = { status: 'Out of Stock' };
        } else {
          status = getStockStatus(item.inventory.quantity, item.inventory.reorderPoint);
        }
        
        return (
          <Badge 
            variant={
              status.status === 'In Stock' ? 'default' : 
              status.status === 'Low Stock' ? 'secondary' : 
              status.status === 'Sold Out' ? 'outline' : 'destructive'
            }
          >
            {status.status}
          </Badge>
        );
      }
    },
    {
      key: 'value',
      title: 'Value',
      render: (_: any, item: InventoryItem) => {
        const productPrice = parseFloat(item.product?.price || '0');
        const itemValue = item.inventory.quantity * productPrice;
        
        return (
          <div className="font-medium">
            <CurrencySymbol />{itemValue.toFixed(2)}
          </div>
        );
      },
      mobileHidden: true
    },
    {
      key: 'reorderPoint',
      title: 'Reorder Point',
      render: (_: any, item: InventoryItem) => (
        <div className="text-sm">{item.inventory.reorderPoint}</div>
      ),
      mobileHidden: true
    },
    {
      key: 'lastRestock',
      title: 'Last Restock',
      render: (_: any, item: InventoryItem) => (
        <div className="text-sm">
          {item.inventory.lastRestock 
            ? new Date(item.inventory.lastRestock).toLocaleDateString()
            : 'Never'
          }
        </div>
      ),
      mobileHidden: true
    }
  ];

  const renderActions = (item: InventoryItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/inventory/restock/${item.inventory.id}`} className="flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            Restock
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/inventory/edit/${item.inventory.id}`} className="flex items-center">
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDelete(item.inventory.id)}
          className="text-red-600 focus:text-red-600"
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track and manage your product inventory
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <Button onClick={fetchInventory} disabled={loading} variant="outline" size="sm">
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory/stock-movements/add">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Stock
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory/stock-movements">
              <BarChart3Icon className="h-4 w-4 mr-2" />
              Movements
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory/reports">
              <BarChart3Icon className="h-4 w-4 mr-2" />
              Reports
            </Link>
          </Button>
          <Button
            onClick={toggleStockManagement}
            disabled={updatingStockSetting}
            variant={stockManagementEnabled ? "destructive" : "default"}
            size="sm"
          >
            {updatingStockSetting ? 'Updating...' : stockManagementEnabled ? 'Disable Stock Mgmt' : 'Enable Stock Mgmt'}
          </Button>
        </div>
      </div>

      {/* Stock Management Status */}
      <Card className={stockManagementEnabled ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {stockManagementEnabled ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-orange-600" />
            )}
            <span className="font-medium">
              Stock Management: <span className={stockManagementEnabled ? 'text-green-700' : 'text-orange-700'}>
                {stockManagementEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </span>
            {!stockManagementEnabled && (
              <Badge variant="secondary">
                Inventory tracking is disabled
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircleIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold Out</CardTitle>
            <MinusCircleIcon className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.soldOutItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.inStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <CurrencySymbol />{stats.totalValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Product name, variant, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock Status</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Status</option>
                <option value="instock">In Stock</option>
                <option value="lowstock">Low Stock</option>
                <option value="outofstock">Out of Stock</option>
                <option value="soldout">Sold Out</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bulk Actions</label>
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkRestock}
                  disabled={selectedItems.length === 0}
                  size="sm"
                  variant="outline"
                >
                  Bulk Restock ({selectedItems.length})
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  disabled={selectedItems.length === 0}
                  size="sm"
                  variant="destructive"
                >
                  Bulk Delete ({selectedItems.length})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weight" className="flex items-center gap-2 hidden">
            <ScaleIcon className="h-4 w-4" />
            Weight-Based ({inventory.filter(item => isWeightBasedProduct(item.product?.stockManagementType || 'quantity')).length})
          </TabsTrigger>
          <TabsTrigger value="quantity" className="flex items-center gap-2">
            <PackageIcon className="h-4 w-4" />
            Quantity-Based ({inventory.filter(item => !isWeightBasedProduct(item.product?.stockManagementType || 'quantity')).length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="weight" className="space-y-4">
          <ResponsiveTable
            columns={weightColumns}
            data={filteredInventory}
            loading={loading}
            emptyMessage="No weight-based inventory items found"
            actions={renderActions}
          />
        </TabsContent>
        
        <TabsContent value="quantity" className="space-y-4">
          <ResponsiveTable
            columns={quantityColumns}
            data={filteredInventory}
            loading={loading}
            emptyMessage="No quantity-based inventory items found"
            actions={renderActions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 