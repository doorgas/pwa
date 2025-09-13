import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productInventory } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { 
      quantity, 
      lastRestockDate, 
      supplier, 
      location,
      restockRecord 
    } = await req.json();

    // Update the inventory record
    await db
      .update(productInventory)
      .set({
        quantity,
        availableQuantity: quantity, // Assume no reserved quantity change for now
        lastRestockDate: lastRestockDate ? new Date(lastRestockDate) : null,
        supplier: supplier || null,
        location: location || null,
      })
      .where(eq(productInventory.id, id));

    // Get the updated inventory record
    const updatedInventory = await db.query.productInventory.findFirst({
      where: eq(productInventory.id, id),
    });

    if (!updatedInventory) {
      return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 });
    }

    // In a real application, you might want to store the restock record 
    // in a separate restockHistory table for audit purposes
    // For now, we'll just return the updated inventory
    
    return NextResponse.json({
      inventory: updatedInventory,
      restockRecord: restockRecord,
      message: 'Inventory restocked successfully'
    });
  } catch (error) {
    console.error('Error restocking inventory:', error);
    return NextResponse.json({ error: 'Failed to restock inventory' }, { status: 500 });
  }
} 