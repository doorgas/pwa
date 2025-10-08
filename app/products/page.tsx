'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { normalizeProductImageObjects } from '../../utils/jsonUtils';
import CurrencySymbol from '../../components/CurrencySymbol';
import ResponsiveTable from '../components/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  PackageIcon
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: string;
  productType: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: string;
  images?: any;
  createdAt: string;
}

interface ProductWithCategory {
  product: Product;
  category: {
    id: string;
    name: string;
  } | null;
}

export default function ProductsList() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        setProducts(products.filter((item) => item.product.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const formatPrice = (price: string, productType?: string) => {
    const numPrice = parseFloat(price);
    if (productType === 'group' && numPrice === 0) {
      return 'From addons';
    }
    return (
      <span className="flex items-center gap-1">
        <CurrencySymbol />
        {numPrice.toFixed(2)}
      </span>
    );
  };

  const getFirstProductImage = (imagesData: any): string | null => {
    const imageObjects = normalizeProductImageObjects(imagesData);
    return imageObjects.length > 0 ? imageObjects[0].url : null;
  };

  const ProductImage = ({ imagesData, productName }: { imagesData: any; productName: string }) => {
    const imageUrl = getFirstProductImage(imagesData);
    
    if (!imageUrl) {
      return (
        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
          <PackageIcon className="h-6 w-6 text-gray-400" />
        </div>
      );
    }

    return (
      <img 
        src={imageUrl}
        alt={productName}
        className="w-12 h-12 object-cover rounded border border-gray-200"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          const fallback = (e.target as HTMLElement).parentElement?.querySelector('.fallback-image') as HTMLElement;
          if (fallback) {
            fallback.style.display = 'flex';
          }
        }}
      />
    );
  };

  const getStats = () => {
    const totalProducts = products.length;
    const activeProducts = products.filter(item => item.product.isActive).length;
    const featuredProducts = products.filter(item => item.product.isFeatured).length;
    const groupProducts = products.filter(item => item.product.productType === 'group').length;
    
    return { totalProducts, activeProducts, featuredProducts, groupProducts };
  };

  const stats = getStats();

  const columns = [
    {
      key: 'image',
      title: 'Image',
      render: (_: any, item: ProductWithCategory) => (
        <ProductImage 
          imagesData={item.product.images} 
          productName={item.product.name}
        />
      ),
      mobileHidden: true
    },
    {
      key: 'name',
      title: 'Product',
      render: (_: any, item: ProductWithCategory) => (
        <div>
          <div className="font-medium">{item.product.name}</div>
          {item.product.sku && (
            <div className="text-sm text-muted-foreground">SKU: {item.product.sku}</div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      title: 'Type',
      render: (_: any, item: ProductWithCategory) => (
        <Badge variant={item.product.productType === 'group' ? 'secondary' : 'outline'}>
          {item.product.productType === 'group' ? 'Group' : 'Simple'}
        </Badge>
      ),
      mobileHidden: true
    },
    {
      key: 'price',
      title: 'Price',
      render: (_: any, item: ProductWithCategory) => (
        <div className="font-medium">
          {formatPrice(item.product.price, item.product.productType)}
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      render: (_: any, item: ProductWithCategory) => (
        <div className="text-sm">
          {item.category ? item.category.name : 'No Category'}
        </div>
      ),
      mobileHidden: true
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, item: ProductWithCategory) => (
        <div className="space-y-1">
          <Badge variant={item.product.isActive ? 'default' : 'secondary'}>
            {item.product.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {item.product.isFeatured && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Featured
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (_: any, item: ProductWithCategory) => (
        <div className="text-sm">
          {new Date(item.product.createdAt).toLocaleDateString()}
        </div>
      ),
      mobileHidden: true
    }
  ];

  const renderActions = (item: ProductWithCategory) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/products/edit/${item.product.id}`} className="flex items-center">
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDelete(item.product.id)}
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
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your products and services
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchProducts} disabled={loading} variant="outline" size="sm">
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/products/add">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.featuredProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Group Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.groupProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <ResponsiveTable
        columns={columns}
        data={products}
        loading={loading}
        emptyMessage="No products found"
        actions={renderActions}
      />
    </div>
  );
} 