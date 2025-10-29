import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Count pending orders
    const pendingOrders = await db
      .select({ count: orders.id })
      .from(orders)
      .where(eq(orders.status, 'pending'));

    return NextResponse.json({ 
      pendingCount: pendingOrders.length 
    });
  } catch (error) {
    console.error('Error fetching orders count:', error);
    return NextResponse.json({ error: 'Failed to fetch orders count' }, { status: 500 });
  }
} 