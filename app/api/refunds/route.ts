import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refunds, orders, returns } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allRefunds = await db
      .select({
        refund: refunds,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber
        },
        return: {
          id: returns.id,
          returnNumber: returns.returnNumber
        }
      })
      .from(refunds)
      .leftJoin(orders, eq(refunds.orderId, orders.id))
      .leftJoin(returns, eq(refunds.returnId, returns.id));
      
    return NextResponse.json(allRefunds);
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      orderId, 
      returnId, 
      amount, 
      reason, 
      method, 
      transactionId, 
      processedBy, 
      notes 
    } = await req.json();
    
    // Validate required fields
    if (!orderId || !amount) {
      return NextResponse.json({ error: 'OrderId and amount are required' }, { status: 400 });
    }
    
    const newRefund = {
      id: uuidv4(),
      orderId,
      returnId: returnId || null,
      amount: amount.toString(),
      reason: reason || null,
      method: method || 'original_payment',
      transactionId: transactionId || null,
      status: 'pending',
      processedBy: processedBy || null,
      notes: notes || null,
    };
    
    await db.insert(refunds).values(newRefund);
    
    return NextResponse.json(newRefund, { status: 201 });
  } catch (error) {
    console.error('Error creating refund:', error);
    return NextResponse.json({ error: 'Failed to create refund' }, { status: 500 });
  }
} 