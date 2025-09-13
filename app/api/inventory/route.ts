import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productInventory, products, productVariants } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, inArray } from 'drizzle-orm';
import { convertToGrams, isWeightBasedProduct } from '@/utils/weightUtils';

export async function GET() {
  try {
    const allInventory = await db
      .select({
        inventory: productInventory,
        product: {
          id: products.id,
          name: products.name,
          stockManagementType: products.stockManagementType,
          pricePerUnit: products.pricePerUnit,
          baseWeightUnit: products.baseWeightUnit
        },
        variant: {
          id: productVariants.id,
          title: productVariants.title
        }
      })
      .from(productInventory)
      .leftJoin(products, eq(productInventory.productId, products.id))
      .leftJoin(productVariants, eq(productInventory.variantId, productVariants.id));
      
    return NextResponse.json(allInventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      productId, 
      variantId, 
      quantity, 
      reservedQuantity, 
      reorderPoint, 
      reorderQuantity,
      // Weight-based fields
      weightQuantity,
      weightUnit,
      reservedWeight,
      reservedWeightUnit,
      reorderWeightPoint,
      reorderWeightPointUnit,
      reorderWeightQuantity,
      reorderWeightQuantityUnit,
      location, 
      supplier, 
      lastRestockDate 
    } = await req.json();
    
    // Get product to determine stock management type
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { stockManagementType: true }
    });
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    let newInventory: any = {
      id: uuidv4(),
      productId: productId || null,
      variantId: variantId || null,
      location: location || null,
      supplier: supplier || null,
      lastRestockDate: lastRestockDate ? new Date(lastRestockDate) : null,
    };
    
    if (isWeightBasedProduct(product.stockManagementType || 'quantity')) {
      // Weight-based inventory
      const weightInGrams = convertToGrams(weightQuantity || 0, weightUnit || 'grams');
      const reservedInGrams = convertToGrams(reservedWeight || 0, reservedWeightUnit || 'grams');
      const reorderPointInGrams = convertToGrams(reorderWeightPoint || 0, reorderWeightPointUnit || 'grams');
      const reorderQuantityInGrams = convertToGrams(reorderWeightQuantity || 0, reorderWeightQuantityUnit || 'grams');
      
      newInventory = {
        ...newInventory,
        // Set quantity fields to 0 for weight-based products
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        reorderPoint: 0,
        reorderQuantity: 0,
        // Set weight fields
        weightQuantity: weightInGrams.toString(),
        reservedWeight: reservedInGrams.toString(),
        availableWeight: (weightInGrams - reservedInGrams).toString(),
        reorderWeightPoint: reorderPointInGrams.toString(),
        reorderWeightQuantity: reorderQuantityInGrams.toString(),
      };
    } else {
      // Quantity-based inventory
      const availableQuantity = (quantity || 0) - (reservedQuantity || 0);
      
      newInventory = {
        ...newInventory,
        quantity: quantity || 0,
        reservedQuantity: reservedQuantity || 0,
        availableQuantity,
        reorderPoint: reorderPoint || 0,
        reorderQuantity: reorderQuantity || 0,
        // Set weight fields to 0 for quantity-based products
        weightQuantity: '0.00',
        reservedWeight: '0.00',
        availableWeight: '0.00',
        reorderWeightPoint: '0.00',
        reorderWeightQuantity: '0.00',
      };
    }
    
    await db.insert(productInventory).values(newInventory);
    
    return NextResponse.json(newInventory, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory record:', error);
    return NextResponse.json({ error: 'Failed to create inventory record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Array of inventory IDs is required' }, { status: 400 });
    }
    
    // Delete all inventory records with the provided IDs
    await db
      .delete(productInventory)
      .where(inArray(productInventory.id, ids));
    
    return NextResponse.json({ 
      message: `Successfully deleted ${ids.length} inventory record(s)`,
      deletedCount: ids.length 
    });
  } catch (error) {
    console.error('Error deleting inventory records:', error);
    return NextResponse.json({ error: 'Failed to delete inventory records' }, { status: 500 });
  }
} 