import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariants, products } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id: productId, variantId } = await params;
    
    console.log('🗑️ API: Deleting variant:', { productId, variantId });
    
    // First, verify the variant exists and belongs to this product
    const variant = await db.query.productVariants.findFirst({
      where: (variants, { and, eq }) => and(
        eq(variants.id, variantId),
        eq(variants.productId, productId)
      ),
    });

    if (!variant) {
      console.warn('⚠️ API: Variant not found or does not belong to product');
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    console.log('🗑️ API: Found variant to delete:', {
      id: variant.id,
      title: variant.title,
      productId: variant.productId
    });

    // Delete the variant
    await db
      .delete(productVariants)
      .where(eq(productVariants.id, variantId));

    console.log('✅ API: Variant deleted successfully from database');

    // Check remaining variants and update product variation attributes if needed
    const remainingVariants = await db.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
    });

    console.log(`📊 API: ${remainingVariants.length} variants remaining for product ${productId}`);
    console.log('ℹ️ API: variation_attributes column is managed by frontend - no database update needed');

    return NextResponse.json({ 
      success: true, 
      message: 'Variant deleted successfully',
      remainingVariants: remainingVariants.length
    });
  } catch (error) {
    console.error('❌ API: Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Failed to delete variant' }, 
      { status: 500 }
    );
  }
}