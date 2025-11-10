import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariants } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, id),
    });

    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json(variant);
  } catch (error) {
    console.error('Error fetching variant:', error);
    return NextResponse.json({ error: 'Failed to fetch variant' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await req.json();

    // Convert numeric fields to strings for decimal storage
    if (updateData.price !== undefined) updateData.price = updateData.price.toString();
    if (updateData.comparePrice !== undefined) updateData.comparePrice = updateData.comparePrice ? updateData.comparePrice.toString() : null;
    if (updateData.costPrice !== undefined) updateData.costPrice = updateData.costPrice ? updateData.costPrice.toString() : null;
    if (updateData.weight !== undefined) updateData.weight = updateData.weight ? updateData.weight.toString() : null;

    // Update the variant
    await db
      .update(productVariants)
      .set(updateData)
      .where(eq(productVariants.id, id));

    // Fetch and return the updated variant
    const updatedVariant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, id),
    });

    return NextResponse.json(updatedVariant);
  } catch (error) {
    console.error('Error updating variant:', error);
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db
      .delete(productVariants)
      .where(eq(productVariants.id, id));

    return NextResponse.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    console.error('Error deleting variant:', error);
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 });
  }
} 