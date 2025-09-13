'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface Column {
  key: string;
  title: string | React.ReactNode;
  render?: (value: any, item: any) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean; // Hide on mobile
  mobileLabel?: string; // Custom label for mobile view
  width?: string; // Column width
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  actions?: (item: any) => React.ReactNode;
}

export default function ResponsiveTable({ 
  columns, 
  data, 
  loading = false, 
  emptyMessage = "No data available",
  actions 
}: ResponsiveTableProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column.key} className={column.className} style={{width: column.width}}>
                          {column.title}
                        </TableHead>
                      ))}
                      {actions && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {columns.map((column) => (
                          <TableCell key={column.key}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                        ))}
                        {actions && (
                          <TableCell>
                            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">{emptyMessage}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Desktop Table View */}
      <div className="hidden md:block w-full">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead 
                        key={column.key} 
                        className={`whitespace-nowrap ${column.className || ''}`}
                        style={{width: column.width}}
                      >
                        {column.title}
                      </TableHead>
                    ))}
                    {actions && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow key={item.id || index} className="hover:bg-muted/50">
                      {columns.map((column) => (
                        <TableCell 
                          key={column.key} 
                          className={`${column.className || ''}`}
                        >
                          <div className="max-w-full overflow-hidden">
                            {column.render 
                              ? column.render(item[column.key], item) 
                              : item[column.key]
                            }
                          </div>
                        </TableCell>
                      ))}
                      {actions && (
                        <TableCell className="text-right">
                          {actions(item)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 w-full">
        {data.map((item, index) => (
          <Card key={item.id || index} className="hover:shadow-md transition-shadow w-full">
            <CardContent className="p-4">
              <div className="space-y-3 w-full">
                {columns
                  .filter(column => !column.mobileHidden)
                  .map((column) => (
                    <div key={column.key} className="flex justify-between items-start gap-3 w-full min-w-0">
                      <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
                        {column.mobileLabel || column.title}:
                      </span>
                      <div className="text-sm text-right min-w-0 flex-1 overflow-hidden">
                        {column.render 
                          ? column.render(item[column.key], item) 
                          : item[column.key]
                        }
                      </div>
                    </div>
                  ))}
                
                {actions && (
                  <div className="pt-3 border-t flex justify-end w-full">
                    {actions(item)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 