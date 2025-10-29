import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, productInventory, stockMovements, user, products, userLoyaltyPoints, loyaltyPointsHistory, settings, pickupLocations } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull } from 'drizzle-orm';
import { getStockManagementSettingDirect } from '@/lib/stockManagement';
import { isWeightBasedProduct } from '@/utils/weightUtils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;

    // Fetch order with customer information and pickup location
    const orderData = await db
      .select({
        order: orders,
        user: user,
        pickupLocation: pickupLocations,
      })
      .from(orders)
      .leftJoin(user, eq(orders.userId, user.id))
      .leftJoin(pickupLocations, eq(orders.pickupLocationId, pickupLocations.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderData.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Parse addons JSON for each item
    const itemsWithParsedAddons = items.map(item => ({
      ...item,
      addons: item.addons ? JSON.parse(item.addons as string) : null
    }));

    const order = {
      ...orderData[0].order,
      user: orderData[0].user,
      pickupLocation: orderData[0].pickupLocation,
      items: itemsWithParsedAddons
    };

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;
    const body = await req.json();
    
    const {
      status,
      paymentStatus,
      fulfillmentStatus,
      shippingAmount,
      discountAmount,
      notes,
      shippingMethod,
      trackingNumber,
      cancelReason,
      assignedDriverId,
      deliveryStatus,
      previousStatus,
      previousPaymentStatus,
      // Order type and pickup location fields
      orderType,
      pickupLocationId,
      // Loyalty points fields
      pointsToRedeem,
      pointsDiscountAmount
    } = body;

    // Get current order and items for stock management
    const currentOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (currentOrder.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderItemsData = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const order = currentOrder[0];

    // Check if stock management is enabled
    const stockManagementEnabled = await getStockManagementSettingDirect();

    // Handle stock management based on status changes (only if stock management is enabled)
    if (stockManagementEnabled && status && status !== previousStatus) {
      await handleStockManagement(
        orderItemsData,
        previousStatus,
        status,
        order.orderNumber
      );
    }

    // Note: Payment status changes no longer affect inventory since stock is deducted at order creation

    // Calculate new total if shipping, discount, or points discount changed
    let newTotalAmount: number = Number(order.totalAmount);
    if (shippingAmount !== undefined || discountAmount !== undefined || pointsDiscountAmount !== undefined) {
      const newShipping = shippingAmount !== undefined ? shippingAmount : Number(order.shippingAmount);
      const newDiscount = discountAmount !== undefined ? discountAmount : Number(order.discountAmount);
      const newPointsDiscount = pointsDiscountAmount !== undefined ? pointsDiscountAmount : Number(order.pointsDiscountAmount);
      
      // Recalculate: subtotal - discount - points discount + tax + shipping
      const subtotalAfterDiscounts = Number(order.subtotal) - newDiscount - newPointsDiscount;
      newTotalAmount = Math.max(0, subtotalAfterDiscounts + Number(order.taxAmount || 0) + newShipping);
    }

    // Update the order
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (fulfillmentStatus !== undefined) updateData.fulfillmentStatus = fulfillmentStatus;
    if (shippingAmount !== undefined) updateData.shippingAmount = shippingAmount;
    if (discountAmount !== undefined) updateData.discountAmount = discountAmount;
    if (notes !== undefined) updateData.notes = notes;
    if (shippingMethod !== undefined) updateData.shippingMethod = shippingMethod;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason;
    if (assignedDriverId !== undefined) updateData.assignedDriverId = assignedDriverId || null;
    if (deliveryStatus !== undefined) updateData.deliveryStatus = deliveryStatus;
    // Order type and pickup location fields
    if (orderType !== undefined) updateData.orderType = orderType;
    if (pickupLocationId !== undefined) updateData.pickupLocationId = pickupLocationId || null;
    if (pointsToRedeem !== undefined) updateData.pointsToRedeem = pointsToRedeem;
    if (pointsDiscountAmount !== undefined) updateData.pointsDiscountAmount = pointsDiscountAmount;
    if (newTotalAmount !== Number(order.totalAmount)) updateData.totalAmount = newTotalAmount;

    await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));

    // Handle points redemption changes if points were modified
    if (pointsToRedeem !== undefined && order.userId && pointsToRedeem > 0) {
      const currentPointsRedeemed = Number(order.pointsToRedeem) || 0;
      const pointsDifference = pointsToRedeem - currentPointsRedeemed;
      
      if (pointsDifference !== 0) {
        console.log(`\n=== POINTS REDEMPTION UPDATE ===`);
        console.log(`Order: ${order.orderNumber}, UserId: ${order.userId}, Points difference: ${pointsDifference}, New discount: ${pointsDiscountAmount}`);
        
        try {
          if (pointsDifference > 0) {
            // Additional points being redeemed
            await redeemLoyaltyPointsForEdit(
              order.userId, 
              orderId, 
              pointsDifference, 
              (Number(pointsDiscountAmount) || 0) - (Number(order.pointsDiscountAmount) || 0),
              `Additional redemption for order #${order.orderNumber}`
            );
            console.log(`✅ Successfully redeemed additional ${pointsDifference} points for user ${order.userId}`);
          } else {
            // Points being refunded (negative difference)
            await refundLoyaltyPoints(
              order.userId,
              Math.abs(pointsDifference),
              `Points refund for order #${order.orderNumber} adjustment`
            );
            console.log(`✅ Successfully refunded ${Math.abs(pointsDifference)} points for user ${order.userId}`);
          }
        } catch (pointsError) {
          console.error('❌ Error processing points redemption update:', pointsError);
          // Don't fail the order update if points processing fails
        }
        console.log(`=== END POINTS REDEMPTION UPDATE ===\n`);
      }
    }

    // Handle loyalty points when order status changes (integrated logic)
    console.log(`Points check: status=${status}, previousStatus=${previousStatus}, userId=${order.userId}`);
    if (status && status !== previousStatus && order.userId) {
      console.log(`Order status changed from ${previousStatus} to ${status} for order ${order.orderNumber} for user ${order.userId}`);
      try {
        await updateLoyaltyPointsStatus(order.userId, orderId, previousStatus, status);
        console.log(`Successfully processed points status update for user ${order.userId} for order ${order.orderNumber}`);
      } catch (pointsError) {
        console.error('Error updating loyalty points status:', pointsError);
        // Don't fail the order update if points update fails
      }
    } else {
      console.log(`Points status not updated - conditions not met: statusChanged=${status !== previousStatus}, hasUser=${!!order.userId}`);
    }

    // Fetch updated order with items
    const updatedOrderData = await db
      .select({
        order: orders,
        user: user,
      })
      .from(orders)
      .leftJoin(user, eq(orders.userId, user.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    const updatedItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const updatedOrder = {
      ...updatedOrderData[0].order,
      user: updatedOrderData[0].user,
      items: updatedItems
    };

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;

    // Get order items for stock restoration
    const orderItemsData = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if stock management is enabled for deletion
    const stockManagementEnabledForDeletion = await getStockManagementSettingDirect();

    // Restore inventory if order was not cancelled (only if stock management is enabled)
    // Since inventory is now reserved when orders are created, we need to restore it unless it was already cancelled
    if (stockManagementEnabledForDeletion && order[0].status !== 'cancelled') {
      await restoreInventoryFromOrder(orderItemsData, order[0].orderNumber);
    }

    // Delete order items first (foreign key constraint)
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    
    // Delete the order
    await db.delete(orders).where(eq(orders.id, orderId));

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}

// Helper function to handle stock management based on status changes
async function handleStockManagement(
  orderItems: any[],
  previousStatus: string,
  newStatus: string,
  orderNumber: string
) {
  for (const item of orderItems) {
    // Get product to determine stock management type
    const product = await db.query.products.findFirst({
      where: eq(products.id, item.productId),
      columns: { stockManagementType: true }
    });

    if (!product) {
      console.warn(`Product not found for status change: ${item.productName}`);
      continue;
    }

    const isWeightBased = isWeightBasedProduct(product.stockManagementType || 'quantity');

    const inventoryConditions = [eq(productInventory.productId, item.productId)];
    
    if (item.variantId) {
      inventoryConditions.push(eq(productInventory.variantId, item.variantId));
    } else {
      inventoryConditions.push(isNull(productInventory.variantId));
    }

    const currentInventory = await db
      .select()
      .from(productInventory)
      .where(and(...inventoryConditions))
      .limit(1);

    if (currentInventory.length === 0) continue;

    const inventory = currentInventory[0];
    let updateNeeded = false;
    let movementType = '';
    let reason = '';

    if (isWeightBased) {
      // Handle weight-based inventory
      let newWeightQuantity = parseFloat(inventory.weightQuantity || '0');
      let newReservedWeight = parseFloat(inventory.reservedWeight || '0');
      let newAvailableWeight = parseFloat(inventory.availableWeight || '0');
      const itemWeight = parseFloat(item.weightQuantity || '0');

      // Handle status transitions for weight-based products
      if (newStatus === 'cancelled') {
        // Restore weight when order is cancelled (inventory was deducted when order was created)
        newWeightQuantity += itemWeight;
        newAvailableWeight = newWeightQuantity - newReservedWeight;
        movementType = 'in';
        reason = 'Order Cancelled - Weight Restored';
        updateNeeded = true;
      }
      // Note: No action needed for 'completed' status since stock was already deducted at order creation

      if (updateNeeded) {
        // Update weight-based inventory
        await db
          .update(productInventory)
          .set({
            weightQuantity: newWeightQuantity.toString(),
            reservedWeight: newReservedWeight.toString(),
            availableWeight: newAvailableWeight.toString(),
            updatedAt: new Date(),
          })
          .where(eq(productInventory.id, inventory.id));

        // Create stock movement record
        await db.insert(stockMovements).values({
          id: uuidv4(),
          inventoryId: inventory.id,
          productId: item.productId,
          variantId: item.variantId || null,
          movementType,
          quantity: 0, // No quantity change for weight-based
          previousQuantity: inventory.quantity,
          newQuantity: inventory.quantity,
          weightQuantity: itemWeight.toString(),
          previousWeightQuantity: parseFloat(inventory.weightQuantity || '0').toString(),
          newWeightQuantity: newWeightQuantity.toString(),
          reason,
          reference: orderNumber,
          notes: `Status changed from ${previousStatus} to ${newStatus}`,
          processedBy: null,
          createdAt: new Date(),
        });
      }
    } else {
      // Handle quantity-based inventory
      let newQuantity = inventory.quantity;
      let newReservedQuantity = inventory.reservedQuantity || 0;
      let newAvailableQuantity = inventory.availableQuantity || 0;

      // Handle status transitions for quantity-based products
      if (newStatus === 'cancelled') {
        // Restore quantity when order is cancelled (inventory was deducted when order was created)
        newQuantity += item.quantity;
        newAvailableQuantity = newQuantity - newReservedQuantity;
        movementType = 'in';
        reason = 'Order Cancelled - Quantity Restored';
        updateNeeded = true;
      }
      // Note: No action needed for 'completed' status since stock was already deducted at order creation

      if (updateNeeded) {
        // Update quantity-based inventory
        await db
          .update(productInventory)
          .set({
            quantity: newQuantity,
            reservedQuantity: newReservedQuantity,
            availableQuantity: newAvailableQuantity,
            updatedAt: new Date(),
          })
          .where(eq(productInventory.id, inventory.id));

        // Create stock movement record
        await db.insert(stockMovements).values({
          id: uuidv4(),
          inventoryId: inventory.id,
          productId: item.productId,
          variantId: item.variantId || null,
          movementType,
          quantity: item.quantity,
          previousQuantity: inventory.quantity,
          newQuantity: newQuantity,
          weightQuantity: '0.00',
          previousWeightQuantity: '0.00',
          newWeightQuantity: '0.00',
          reason,
          reference: orderNumber,
          notes: `Status changed from ${previousStatus} to ${newStatus}`,
          processedBy: null,
          createdAt: new Date(),
        });
      }
    }
  }
}



// Helper function to restore inventory when order is deleted
async function restoreInventoryFromOrder(orderItems: any[], orderNumber: string) {
  for (const item of orderItems) {
    // Get product to determine stock management type
    const product = await db.query.products.findFirst({
      where: eq(products.id, item.productId),
      columns: { stockManagementType: true }
    });

    if (!product) {
      console.warn(`Product not found for inventory restoration: ${item.productName}`);
      continue;
    }

    const isWeightBased = isWeightBasedProduct(product.stockManagementType || 'quantity');

    const inventoryConditions = [eq(productInventory.productId, item.productId)];
    
    if (item.variantId) {
      inventoryConditions.push(eq(productInventory.variantId, item.variantId));
    } else {
      inventoryConditions.push(isNull(productInventory.variantId));
    }

    const currentInventory = await db
      .select()
      .from(productInventory)
      .where(and(...inventoryConditions))
      .limit(1);

    if (currentInventory.length === 0) continue;

    const inventory = currentInventory[0];

    if (isWeightBased) {
      // Handle weight-based inventory restoration
      const currentReservedWeight = parseFloat(inventory.reservedWeight || '0');
      const currentWeightQuantity = parseFloat(inventory.weightQuantity || '0');
      const itemWeight = parseFloat(item.weightQuantity || '0');
      
      const newWeightQuantity = currentWeightQuantity + itemWeight;
      const newAvailableWeight = newWeightQuantity - currentReservedWeight;

      // Update inventory
      await db
        .update(productInventory)
        .set({
          weightQuantity: newWeightQuantity.toString(),
          availableWeight: newAvailableWeight.toString(),
          updatedAt: new Date(),
        })
        .where(eq(productInventory.id, inventory.id));

      // Create stock movement record
      await db.insert(stockMovements).values({
        id: uuidv4(),
        inventoryId: inventory.id,
        productId: item.productId,
        variantId: item.variantId || null,
        movementType: 'in',
        quantity: 0, // No quantity change for weight-based
        previousQuantity: inventory.quantity,
        newQuantity: inventory.quantity,
        weightQuantity: itemWeight.toString(),
        previousWeightQuantity: currentWeightQuantity.toString(),
        newWeightQuantity: newWeightQuantity.toString(),
        reason: 'Order Deleted - Weight Restored',
        reference: orderNumber,
        notes: `Order ${orderNumber} was deleted, ${itemWeight}g restored to inventory`,
        processedBy: null,
        createdAt: new Date(),
      });
    } else {
      // Handle quantity-based inventory restoration
      const currentReservedQuantity = inventory.reservedQuantity || 0;
      const newQuantity = inventory.quantity + item.quantity;
      const newAvailableQuantity = newQuantity - currentReservedQuantity;

      // Update inventory
      await db
        .update(productInventory)
        .set({
          quantity: newQuantity,
          availableQuantity: newAvailableQuantity,
          updatedAt: new Date(),
        })
        .where(eq(productInventory.id, inventory.id));

      // Create stock movement record
      await db.insert(stockMovements).values({
        id: uuidv4(),
        inventoryId: inventory.id,
        productId: item.productId,
        variantId: item.variantId || null,
        movementType: 'in',
        quantity: item.quantity,
        previousQuantity: inventory.quantity,
        newQuantity: newQuantity,
        weightQuantity: '0.00',
        previousWeightQuantity: '0.00',
        newWeightQuantity: '0.00',
        reason: 'Order Deleted - Quantity Restored',
        reference: orderNumber,
        notes: `Order ${orderNumber} was deleted, ${item.quantity} units restored to inventory`,
        processedBy: null,
        createdAt: new Date(),
      });
    }
  }
}

// Helper function to update loyalty points status
async function updateLoyaltyPointsStatus(userId: string, orderId: string, previousStatus: string, newStatus: string) {
  console.log('=== UPDATE POINTS STATUS FUNCTION ===');
  console.log('Parameters:', { userId, orderId, previousStatus, newStatus });

  // Check if loyalty is enabled
  const loyaltyEnabled = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'loyalty_enabled'))
    .limit(1);

  if (loyaltyEnabled.length === 0 || loyaltyEnabled[0]?.value !== 'true') {
    console.log('Loyalty system is disabled');
    return;
  }

  // Handle status change to completed - activate pending points
  if (newStatus === 'completed' && previousStatus !== 'completed') {
    console.log('Activating pending points for completed order');
    
    try {
      // Get pending points for this order
      const pendingHistory = await db
        .select()
        .from(loyaltyPointsHistory)
        .where(
          and(
            eq(loyaltyPointsHistory.userId, userId),
            eq(loyaltyPointsHistory.orderId, orderId),
            eq(loyaltyPointsHistory.status, 'pending'),
            eq(loyaltyPointsHistory.transactionType, 'earned')
          )
        );

      if (pendingHistory.length === 0) {
        console.log('No pending points found for this order');
        return;
      }

      const pointsToActivate = pendingHistory.reduce((sum, record) => sum + (record.points || 0), 0);
      console.log(`Points to activate: ${pointsToActivate}`);

      // Update user points - move from pending to available
      const userPoints = await db
        .select()
        .from(userLoyaltyPoints)
        .where(eq(userLoyaltyPoints.userId, userId))
        .limit(1);

      if (userPoints.length > 0) {
        const current = userPoints[0];
        await db.update(userLoyaltyPoints)
          .set({
            availablePoints: (current?.availablePoints || 0) + pointsToActivate,
            pendingPoints: Math.max(0, (current?.pendingPoints || 0) - pointsToActivate),
            updatedAt: new Date()
          })
          .where(eq(userLoyaltyPoints.userId, userId));
        console.log('Updated user points - moved from pending to available');
      }

      // Update history records to available status
      for (const record of pendingHistory) {
        await db.update(loyaltyPointsHistory)
          .set({
            status: 'available',
            pointsBalance: (userPoints[0]?.availablePoints || 0) + pointsToActivate
          })
          .where(eq(loyaltyPointsHistory.id, record.id));
      }
      console.log('Updated history records to available status');

      console.log(`Successfully activated ${pointsToActivate} points for user ${userId}`);

    } catch (dbError) {
      console.error('Database error in update points status:', dbError);
      throw dbError;
    }
  }

  // Handle other status changes (if needed in the future)
  console.log(`No action needed for status change from ${previousStatus} to ${newStatus}`);
}

// Helper function to redeem loyalty points for edit order
async function redeemLoyaltyPointsForEdit(userId: string, orderId: string, pointsToRedeem: number, discountAmount: number, description: string) {
  console.log('=== REDEEM POINTS FOR EDIT FUNCTION ===');
  console.log('Parameters:', { userId, orderId, pointsToRedeem, discountAmount, description });

  // Check if loyalty is enabled
  const loyaltyEnabled = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'loyalty_enabled'))
    .limit(1);

  if (loyaltyEnabled.length === 0 || loyaltyEnabled[0]?.value !== 'true') {
    console.log('Loyalty system is disabled');
    throw new Error('Loyalty points system is disabled');
  }

  // Get user's available points
  const userPoints = await db
    .select()
    .from(userLoyaltyPoints)
    .where(eq(userLoyaltyPoints.userId, userId))
    .limit(1);

  if (userPoints.length === 0 || (userPoints[0]?.availablePoints || 0) < pointsToRedeem) {
    console.log(`Insufficient points. Available: ${userPoints[0]?.availablePoints || 0}, Requested: ${pointsToRedeem}`);
    throw new Error('Insufficient points available');
  }

  const newBalance = (userPoints[0]?.availablePoints || 0) - pointsToRedeem;

  // Update user points
  await db.update(userLoyaltyPoints)
    .set({
      totalPointsRedeemed: (userPoints[0]?.totalPointsRedeemed || 0) + pointsToRedeem,
      availablePoints: newBalance,
      lastRedeemedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(userLoyaltyPoints.userId, userId));

  // Add history record
  await db.insert(loyaltyPointsHistory).values({
    id: uuidv4(),
    userId,
    orderId,
    transactionType: 'redeemed',
    status: 'available',
    points: -pointsToRedeem, // negative for redeemed
    pointsBalance: newBalance,
    description: description,
    orderAmount: null,
    discountAmount: discountAmount.toString(),
    expiresAt: null,
    isExpired: false,
    processedBy: null,
    metadata: {
      pointsToRedeem,
      discountAmount
    },
    createdAt: new Date()
  });

  console.log(`Successfully redeemed ${pointsToRedeem} points for user ${userId}. New balance: ${newBalance}`);
}

// Helper function to refund loyalty points
async function refundLoyaltyPoints(userId: string, pointsToRefund: number, reason: string) {
  console.log('=== REFUND POINTS FUNCTION ===');
  console.log('Parameters:', { userId, pointsToRefund, reason });

  // Get user's current points
  const userPoints = await db
    .select()
    .from(userLoyaltyPoints)
    .where(eq(userLoyaltyPoints.userId, userId))
    .limit(1);

  if (userPoints.length === 0) {
    console.log('User loyalty points record not found, creating one');
    // Create new record if it doesn't exist
    await db.insert(userLoyaltyPoints).values({
      id: uuidv4(),
      userId,
      totalPointsEarned: 0,
      totalPointsRedeemed: Math.max(0, -pointsToRefund), // Adjust if refunding
      availablePoints: pointsToRefund,
      pendingPoints: 0,
      pointsExpiringSoon: 0,
      lastEarnedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } else {
    const currentRecord = userPoints[0];
    const newBalance = (currentRecord.availablePoints || 0) + pointsToRefund;
    const newTotalRedeemed = Math.max(0, (currentRecord.totalPointsRedeemed || 0) - pointsToRefund);

    // Update existing record
    await db.update(userLoyaltyPoints)
      .set({
        availablePoints: newBalance,
        totalPointsRedeemed: newTotalRedeemed,
        updatedAt: new Date()
      })
      .where(eq(userLoyaltyPoints.userId, userId));
  }

  // Add history record
  const currentBalance = (userPoints[0]?.availablePoints || 0) + pointsToRefund;
  await db.insert(loyaltyPointsHistory).values({
    id: uuidv4(),
    userId,
    orderId: null,
    transactionType: 'manual_adjustment',
    status: 'available',
    points: pointsToRefund, // positive for refund
    pointsBalance: currentBalance,
    description: reason,
    orderAmount: null,
    discountAmount: null,
    expiresAt: null,
    isExpired: false,
    processedBy: 'system',
    metadata: {
      adjustmentType: 'refund',
      previousBalance: userPoints[0]?.availablePoints || 0
    },
    createdAt: new Date()
  });

  console.log(`Successfully refunded ${pointsToRefund} points for user ${userId}. New balance: ${currentBalance}`);
} 