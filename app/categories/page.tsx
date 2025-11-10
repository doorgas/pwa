'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  TrashIcon,
  RefreshCwIcon,
  FolderIcon
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function CategoriesList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        setCategories(categories.filter((category) => category.id !== id));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const CategoryImage = ({ image, name }: { image?: string; name: string }) => {
    if (!image) {
      return (
        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
          <FolderIcon className="h-6 w-6 text-gray-400" />
        </div>
      );
    }

    return (
      <img 
        src={image} 
        alt={name}
        className="w-12 h-12 object-cover rounded border border-gray-200"
      />
    );
  };

  const getStats = () => {
    const totalCategories = categories.length;
    const activeCategories = categories.filter(cat => cat.isActive).length;
    const categoriesWithImages = categories.filter(cat => cat.image).length;
    
    return { totalCategories, activeCategories, categoriesWithImages };
  };

  const stats = getStats();

  const columns = [
    {
      key: 'image',
      title: 'Image',
      render: (_: any, category: Category) => (
        <CategoryImage image={category.image} name={category.name} />
      ),
      mobileHidden: true
    },
    {
      key: 'name',
      title: 'Category',
      render: (_: any, category: Category) => (
        <div>
          <div className="font-medium">{category.name}</div>
          <div className="text-sm text-muted-foreground">{category.slug}</div>
        </div>
      )
    },
    {
      key: 'sortOrder',
      title: 'Sort Order',
      render: (_: any, category: Category) => (
        <div className="text-sm">
          {category.sortOrder}
        </div>
      ),
      mobileHidden: true
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, category: Category) => (
        <Badge variant={category.isActive ? 'default' : 'secondary'}>
          {category.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (_: any, category: Category) => (
        <div className="text-sm">
          {new Date(category.createdAt).toLocaleDateString()}
        </div>
      ),
      mobileHidden: true
    }
  ];

  const renderActions = (category: Category) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/categories/edit/${category.id}`} className="flex items-center">
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDelete(category.id)}
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
          <h1 className="text-3xl font-bold tracking-tight">Product Categories</h1>
          <p className="text-muted-foreground">
            Organize your products with categories
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchCategories} disabled={loading} variant="outline" size="sm">
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/categories/add">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Category
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeCategories}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.categoriesWithImages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      <ResponsiveTable
        columns={columns}
        data={categories}
        loading={loading}
        emptyMessage="No categories found"
        actions={renderActions}
      />
    </div>
  );
} 