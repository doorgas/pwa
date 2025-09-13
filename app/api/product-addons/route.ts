import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productAddons, addons, products } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    
    // Build query with optional filtering
    const baseQuery = db
      .select({
        productAddon: productAddons,
        addon: addons,
        product: {
          id: products.id,
          name: products.name,
          productType: products.productType
        }
      })
      .from(productAddons)
      .leftJoin(addons, eq(productAddons.addonId, addons.id))
      .leftJoin(products, eq(productAddons.productId, products.id));
    
    // Apply filter if productId is provided
    const allProductAddons = productId 
      ? await baseQuery.where(eq(productAddons.productId, productId))
      : await baseQuery;
      
    return NextResponse.json(allProductAddons);
  } catch (error) {
    console.error('Error fetching product addons:', error);
    return NextResponse.json({ error: 'Failed to fetch product addons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      productId, 
      addonId, 
      price, 
      isRequired, 
      sortOrder, 
      isActive 
    } = await req.json();
    
    // Validate required fields
    if (!productId || !addonId || price === undefined || price === null) {
      return NextResponse.json({ error: 'ProductId, addonId, and price are required' }, { status: 400 });
    }
    
    const newProductAddon = {
      id: uuidv4(),
      productId,
      addonId,
      price: price.toString(),
      isRequired: isRequired || false,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    await db.insert(productAddons).values(newProductAddon);
    
    return NextResponse.json(newProductAddon, { status: 201 });
  } catch (error) {
    console.error('Error creating product addon:', error);
    return NextResponse.json({ error: 'Failed to create product addon' }, { status: 500 });
  }
} 