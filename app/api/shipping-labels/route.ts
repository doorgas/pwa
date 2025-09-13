import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shippingLabels, orders } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allShippingLabels = await db
      .select({
        shippingLabel: shippingLabels,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          email: orders.email
        }
      })
      .from(shippingLabels)
      .leftJoin(orders, eq(shippingLabels.orderId, orders.id));
      
    return NextResponse.json(allShippingLabels);
  } catch (error) {
    console.error('Error fetching shipping labels:', error);
    return NextResponse.json({ error: 'Failed to fetch shipping labels' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      orderId, 
      carrier, 
      service, 
      trackingNumber, 
      labelUrl, 
      cost, 
      weight, 
      dimensions 
    } = await req.json();
    
    // Validate required fields
    if (!orderId || !carrier || !trackingNumber) {
      return NextResponse.json({ error: 'OrderId, carrier, and trackingNumber are required' }, { status: 400 });
    }
    
    const newShippingLabel = {
      id: uuidv4(),
      orderId,
      carrier,
      service: service || null,
      trackingNumber,
      labelUrl: labelUrl || null,
      cost: cost ? cost.toString() : null,
      weight: weight ? weight.toString() : null,
      dimensions: dimensions ? JSON.stringify(dimensions) : null,
      status: 'created',
    };
    
    await db.insert(shippingLabels).values(newShippingLabel);
    
    return NextResponse.json(newShippingLabel, { status: 201 });
  } catch (error) {
    console.error('Error creating shipping label:', error);
    return NextResponse.json({ error: 'Failed to create shipping label' }, { status: 500 });
  }
} 