import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, products, productVariants } from '@/lib/schema';
import { eq, and, gte, lte, desc, isNotNull } from 'drizzle-orm';
import { calculateItemProfit, calculateOrderProfitSummary, formatProfitDataForExport, OrderItemData } from '@/utils/profitUtils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const productId = searchParams.get('productId');
    const orderType = searchParams.get('orderType'); // pickup, delivery, shipping, or null for all
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

    // Build product filter
    const productFilters = [];
    if (productId) {
      productFilters.push(eq(orderItems.productId, productId));
    }

    // Build order type filter based on business logic
    const orderTypeFilters = [];
    if (orderType === 'pickup') {
      orderTypeFilters.push(eq(orders.orderType, 'pickup'));
    } else if (orderType === 'delivery') {
      // Delivery orders have assigned_driver_id
      orderTypeFilters.push(isNotNull(orders.assignedDriverId));
    } else if (orderType === 'shipping') {
      // Shipping orders have shipping_amount > 1
      orderTypeFilters.push(gte(orders.shippingAmount, '1.00'));
    }

    // Combine all filters
    const whereConditions = [...dateFilters, ...productFilters, ...orderTypeFilters];

    // Fetch orders with items that have cost prices
    const ordersWithItems = await db
      .select({
        order: orders,
        item: orderItems,
        product: products,
        variant: productVariants
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(orders.createdAt));

    // Transform data for profit calculations
    const orderItemsData: OrderItemData[] = ordersWithItems.map(row => {
      // Determine the actual order type based on business logic
      let actualOrderType = 'pickup'; // default
      if (row.order.shippingAmount && parseFloat(row.order.shippingAmount) > 1) {
        actualOrderType = 'shipping';
      } else if (row.order.assignedDriverId) {
        actualOrderType = 'delivery';
      } else if (row.order.orderType === 'pickup') {
        actualOrderType = 'pickup';
      }

      return {
        id: row.item.id,
        productId: row.item.productId,
        variantId: row.item.variantId || undefined,
        productName: row.item.productName,
        variantTitle: row.item.variantTitle || undefined,
        quantity: row.item.quantity,
        weightQuantity: row.item.weightQuantity ? parseFloat(row.item.weightQuantity) : undefined,
        price: parseFloat(row.item.price),
        costPrice: row.item.costPrice ? parseFloat(row.item.costPrice) : undefined,
        totalPrice: parseFloat(row.item.totalPrice),
        totalCost: row.item.totalCost ? parseFloat(row.item.totalCost) : undefined,
        isWeightBased: row.product?.stockManagementType === 'weight',
        orderType: actualOrderType,
        orderId: row.order.id,
        hasAssignedDriver: row.order.assignedDriverId ? true : false
      };
    });

    // Calculate overall summary
    const summary = calculateOrderProfitSummary(orderItemsData);

    // Group by orders for better display
    const orderGroups = new Map();
    ordersWithItems.forEach(row => {
      const orderId = row.order.id;
      if (!orderGroups.has(orderId)) {
        orderGroups.set(orderId, {
          order: row.order,
          items: []
        });
      }
      
      const orderData = orderGroups.get(orderId);
      const itemData = orderItemsData.find(item => item.id === row.item.id);
      if (itemData) {
        orderData.items.push({
          ...itemData,
          profit: calculateItemProfit(itemData, orderItemsData)
        });
      }
    });

    const ordersWithProfits = Array.from(orderGroups.values()).map(orderGroup => {
      // Determine the actual order type for the order display
      let actualOrderType = 'pickup'; // default
      const order = orderGroup.order;
      if (order.shippingAmount && parseFloat(order.shippingAmount) > 1) {
        actualOrderType = 'shipping';
      } else if (order.assignedDriverId) {
        actualOrderType = 'delivery';
      } else if (order.orderType === 'pickup') {
        actualOrderType = 'pickup';
      }

      return {
        ...orderGroup.order,
        orderType: actualOrderType, // Override with the determined order type
        items: orderGroup.items,
        orderSummary: calculateOrderProfitSummary(orderGroup.items)
      };
    });

    // Handle export requests
    if (export_format === 'csv') {
      const csvData = formatProfitDataForExport(orderItemsData);
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
          'Content-Disposition': `attachment; filename="profit-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      summary,
      orders: ordersWithProfits,
      totalOrders: ordersWithProfits.length,
      totalItems: orderItemsData.length,
      dateRange: {
        startDate,
        endDate
      },
      filters: {
        productId,
        orderType
      }
    });

  } catch (error) {
    console.error('Error fetching profit reports:', error);
    return NextResponse.json({ error: 'Failed to fetch profit reports' }, { status: 500 });
  }
} 