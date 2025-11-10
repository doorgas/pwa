import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, userLoyaltyPoints, loyaltyPointsHistory, settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('Checking database schema...');
    // Test if orders table has new fields
    const testOrder = await db.select().from(orders).limit(1);
    console.log('Orders table sample:', testOrder[0]);
    
    // Test if loyalty tables exist
    const testLoyaltyPoints = await db.select().from(userLoyaltyPoints).limit(1);
    console.log('Loyalty points table accessible:', testLoyaltyPoints.length >= 0);
    
    const testLoyaltyHistory = await db.select().from(loyaltyPointsHistory).limit(1);
    console.log('Loyalty history table accessible:', testLoyaltyHistory.length >= 0);
    
    // Test loyalty settings
    const loyaltySettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'loyalty_enabled'));
    console.log('Loyalty settings:', loyaltySettings);
    
    return NextResponse.json({
      success: true,
      message: 'Schema check completed - see console logs',
      ordersTableSample: testOrder[0],
      loyaltyTablesExist: true
    });
  } catch (error) {
    console.error('Schema check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}