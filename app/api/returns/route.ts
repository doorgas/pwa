import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { returns, orders, user } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allReturns = await db
      .select({
        return: returns,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      })
      .from(returns)
      .leftJoin(orders, eq(returns.orderId, orders.id))
      .leftJoin(user, eq(returns.userId, user.id));
      
    return NextResponse.json(allReturns);
  } catch (error) {
    console.error('Error fetching returns:', error);
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      orderId, 
      userId, 
      reason, 
      description, 
      refundAmount, 
      restockFee, 
      adminNotes 
    } = await req.json();
    
    // Validate required fields
    if (!orderId || !reason) {
      return NextResponse.json({ error: 'OrderId and reason are required' }, { status: 400 });
    }
    
    // Generate return number
    const returnNumber = `RET-${Date.now()}`;
    
    const newReturn = {
      id: uuidv4(),
      returnNumber,
      orderId,
      userId: userId || null,
      status: 'pending',
      reason,
      description: description || null,
      refundAmount: refundAmount ? refundAmount.toString() : null,
      restockFee: restockFee ? restockFee.toString() : '0.00',
      adminNotes: adminNotes || null,
    };
    
    await db.insert(returns).values(newReturn);
    
    return NextResponse.json(newReturn, { status: 201 });
  } catch (error) {
    console.error('Error creating return:', error);
    return NextResponse.json({ error: 'Failed to create return' }, { status: 500 });
  }
} 