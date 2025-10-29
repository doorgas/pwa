import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, products, productVariants, user } from '@/lib/schema';
import { eq, and, gte, lte, desc, sql, count, sum } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const export_format = searchParams.get('export');
    
    // Build date filters
    const dateFilters = [];
    if (startDate) {
      dateFilters.push(gte(orders.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      dateFilters.push(lte(orders.createdAt, endDatePlusOne));
    }

    // Build status filter
    const statusFilters = [];
    if (status) {
      statusFilters.push(eq(orders.status, status));
    }

    // Build order type filter
    const orderTypeFilters = [];
    if (orderType) {
      orderTypeFilters.push(eq(orders.orderType, orderType));
    }

    // Combine all filters
    const whereConditions = [...dateFilters, ...statusFilters, ...orderTypeFilters];

    // Get sales summary statistics
    const salesSummary = await db
      .select({
        totalOrders: count(),
        totalRevenue: sum(orders.totalAmount),
        averageOrderValue: sql<number>`AVG(${orders.totalAmount})`,
        totalTax: sum(orders.taxAmount),
        totalShipping: sum(orders.shippingAmount),
        totalDiscount: sum(orders.discountAmount)
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Get orders with customer details
    const ordersWithDetails = await db
      .select({
        order: orders,
        user: user
      })
      .from(orders)
      .leftJoin(user, eq(orders.userId, user.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(orders.createdAt));

    // Get top products by revenue
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        totalQuantity: sum(orderItems.quantity),
        totalRevenue: sum(orderItems.totalPrice),
        orderCount: count()
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sum(orderItems.totalPrice)))
      .limit(10);

    // Get sales by status
    const salesByStatus = await db
      .select({
        status: orders.status,
        count: count(),
        totalRevenue: sum(orders.totalAmount)
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(orders.status);

    // Get sales by payment status
    const salesByPaymentStatus = await db
      .select({
        paymentStatus: orders.paymentStatus,
        count: count(),
        totalRevenue: sum(orders.totalAmount)
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(orders.paymentStatus);

    // Get daily sales data for charts (last 30 days or filtered range)
    const dailySales = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        orderCount: count(),
        totalRevenue: sum(orders.totalAmount)
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // Get monthly sales trends
    const monthlySales = await db
      .select({
        month: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m')`,
        orderCount: count(),
        totalRevenue: sum(orders.totalAmount),
        averageOrderValue: sql<number>`AVG(${orders.totalAmount})`
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(sql`DATE_FORMAT(${orders.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${orders.createdAt}, '%Y-%m')`);

    // Handle CSV export
    if (export_format === 'csv') {
      const csvData = ordersWithDetails.map(row => ({
        'Order Number': row.order.orderNumber,
        'Date': new Date(row.order.createdAt || '').toLocaleDateString(),
        'Customer': row.user?.name || 'Guest',
        'Email': row.order.email,
        'Status': row.order.status,
        'Order Type': row.order.orderType || 'delivery',
        'Payment Status': row.order.paymentStatus,
        'Subtotal': parseFloat(row.order.subtotal).toFixed(2),
        'Tax': parseFloat(row.order.taxAmount || '0').toFixed(2),
        'Shipping': parseFloat(row.order.shippingAmount || '0').toFixed(2),
        'Discount': parseFloat(row.order.discountAmount || '0').toFixed(2),
        'Total': parseFloat(row.order.totalAmount).toFixed(2),
        'Currency': row.order.currency
      }));

      const csvHeaders = Object.keys(csvData[0] || {});
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => 
          csvHeaders.map(header => `"${row[header as keyof typeof row] || ''}"`).join(',')
        )
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sales-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Format response
    const summary = salesSummary[0];
    const formattedSummary = {
      totalOrders: summary?.totalOrders || 0,
      totalRevenue: parseFloat(summary?.totalRevenue || '0'),
      averageOrderValue: parseFloat(summary?.averageOrderValue?.toString() || '0'),
      totalTax: parseFloat(summary?.totalTax || '0'),
      totalShipping: parseFloat(summary?.totalShipping || '0'),
      totalDiscount: parseFloat(summary?.totalDiscount || '0')
    };

    return NextResponse.json({
      summary: formattedSummary,
      orders: ordersWithDetails.map(row => ({
        ...row.order,
        customer: row.user
      })),
      topProducts: topProducts.map(product => ({
        ...product,
        totalQuantity: parseInt(product.totalQuantity?.toString() || '0'),
        totalRevenue: parseFloat(product.totalRevenue?.toString() || '0'),
        orderCount: product.orderCount
      })),
      salesByStatus: salesByStatus.map(status => ({
        ...status,
        count: status.count,
        totalRevenue: parseFloat(status.totalRevenue?.toString() || '0')
      })),
      salesByPaymentStatus: salesByPaymentStatus.map(payment => ({
        ...payment,
        count: payment.count,
        totalRevenue: parseFloat(payment.totalRevenue?.toString() || '0')
      })),
      dailySales: dailySales.map(day => ({
        date: day.date,
        orderCount: day.orderCount,
        totalRevenue: parseFloat(day.totalRevenue?.toString() || '0')
      })),
      monthlySales: monthlySales.map(month => ({
        month: month.month,
        orderCount: month.orderCount,
        totalRevenue: parseFloat(month.totalRevenue?.toString() || '0'),
        averageOrderValue: parseFloat(month.averageOrderValue?.toString() || '0')
      })),
      dateRange: {
        startDate,
        endDate
      },
      filters: {
        status,
        orderType
      }
    });

  } catch (error) {
    console.error('Error fetching sales reports:', error);
    return NextResponse.json({ error: 'Failed to fetch sales reports' }, { status: 500 });
  }
} 