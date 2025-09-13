import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariants, products } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { normalizeVariantOptions } from '@/utils/jsonUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get product details
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get all variants for this product
    const variants = await db
      .select({
        id: productVariants.id,
        title: productVariants.title,
        sku: productVariants.sku,
        price: productVariants.price,
        comparePrice: productVariants.comparePrice,
        costPrice: productVariants.costPrice,
        weight: productVariants.weight,
        image: productVariants.image,
        inventoryQuantity: productVariants.inventoryQuantity,
        variantOptions: productVariants.variantOptions,
        isActive: productVariants.isActive,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, id),
          eq(productVariants.isActive, true)
        )
      );

    // Transform variants for frontend consumption
    const transformedVariants = variants.map((variant) => {
      // Use our normalization utility
      const variantOptions = normalizeVariantOptions(variant.variantOptions);

      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        price: parseFloat(variant.price),
        comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : undefined,
        costPrice: variant.costPrice ? parseFloat(variant.costPrice) : null,
        weight: variant.weight ? parseFloat(variant.weight) : null,
        image: variant.image,
        inventoryQuantity: variant.inventoryQuantity,
        attributes: variantOptions,
        isActive: variant.isActive,
      };
    });

    // Create a price matrix for easy frontend lookup
    const priceMatrix: { [key: string]: { 
      price: number; 
      comparePrice: number | null; 
      variantId: string;
      inventoryQuantity: number;
      sku: string;
    }} = {};

    transformedVariants.forEach((variant) => {
      // Create a key from the attribute combination
      const attributeKey = Object.entries(variant.attributes)
        .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistent keys
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      
      priceMatrix[attributeKey] = {
        price: variant.price,
        comparePrice: variant.comparePrice ?? null,
        variantId: variant.id,
        inventoryQuantity: variant.inventoryQuantity ?? 0,
        sku: variant.sku || '',
      };
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        productType: product.productType,
        basePrice: parseFloat(product.price),
      },
      variants: transformedVariants,
      priceMatrix,
      totalVariants: variants.length,
    });

  } catch (error) {
    console.error('Error fetching product variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product variants' },
      { status: 500 }
    );
  }
} 