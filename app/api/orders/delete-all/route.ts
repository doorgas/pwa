import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, stockMovements, loyaltyPointsHistory } from '@/lib/schema';

export async function DELETE(req: NextRequest) {
  try {
    // Delete in the correct order to avoid foreign key constraints
    
    // 1. Delete loyalty points history related to orders
    await db.delete(loyaltyPointsHistory);
    
    // 2. Delete stock movements related to orders
    await db.delete(stockMovements);
    
    // 3. Delete order items
    await db.delete(orderItems);
    
    // 4. Delete orders
    await db.delete(orders);

    return NextResponse.json({ 
      success: true, 
      message: 'All orders and related data deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting all orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete all orders' },
      { status: 500 }
    );
  }
}