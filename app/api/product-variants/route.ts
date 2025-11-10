import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariants, products } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, inArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    
    // Build query with optional filtering
    const baseQuery = db
      .select({
        variant: productVariants,
        product: {
          id: products.id,
          name: products.name,
          productType: products.productType
        }
      })
      .from(productVariants)
      .leftJoin(products, eq(productVariants.productId, products.id));
    
    // Apply filter if productId is provided
    const allVariants = productId 
      ? await baseQuery.where(eq(productVariants.productId, productId))
      : await baseQuery;
      
    return NextResponse.json(allVariants);
  } catch (error) {
    console.error('Error fetching product variants:', error);
    return NextResponse.json({ error: 'Failed to fetch product variants' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      productId, 
      sku, 
      title, 
      price, 
      comparePrice, 
      costPrice, 
      weight, 
      image, 
      position, 
      inventoryQuantity, 
      inventoryManagement, 
      allowBackorder, 
      variantOptions, 
      isActive 
    } = await req.json();
    
    // Validate required fields
    if (!productId || !title || !price) {
      return NextResponse.json({ error: 'ProductId, title, and price are required' }, { status: 400 });
    }
    
    const newVariant = {
      id: uuidv4(),
      productId,
      sku: sku || null,
      title,
      price: price.toString(),
      comparePrice: comparePrice ? comparePrice.toString() : null,
      costPrice: costPrice ? costPrice.toString() : null,
      weight: weight ? weight.toString() : null,
      image: image || null,
      position: position || 0,
      inventoryQuantity: inventoryQuantity || 0,
      inventoryManagement: inventoryManagement !== undefined ? inventoryManagement : true,
      allowBackorder: allowBackorder || false,
      variantOptions: variantOptions ? JSON.stringify(variantOptions) : null,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    await db.insert(productVariants).values(newVariant);
    
    return NextResponse.json(newVariant, { status: 201 });
  } catch (error) {
    console.error('Error creating product variant:', error);
    return NextResponse.json({ error: 'Failed to create product variant' }, { status: 500 });
  }
} 

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Array of variant IDs is required' }, { status: 400 });
    }
    
    // Delete all variants with the provided IDs
    await db
      .delete(productVariants)
      .where(inArray(productVariants.id, ids));
    
    return NextResponse.json({ 
      message: `Successfully deleted ${ids.length} variant(s)`,
      deletedCount: ids.length 
    });
  } catch (error) {
    console.error('Error deleting product variants:', error);
    return NextResponse.json({ error: 'Failed to delete product variants' }, { status: 500 });
  }
} 