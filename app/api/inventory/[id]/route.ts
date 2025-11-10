import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productInventory, products, productVariants } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { convertToGrams, isWeightBasedProduct } from '@/utils/weightUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const inventoryRecord = await db
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
      .leftJoin(productVariants, eq(productInventory.variantId, productVariants.id))
      .where(eq(productInventory.id, id))
      .limit(1);

    if (inventoryRecord.length === 0) {
      return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 });
    }

    return NextResponse.json(inventoryRecord[0]);
  } catch (error) {
    console.error('Error fetching inventory record:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory record' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData = await req.json();

    // Get current record and product info
    const currentRecord = await db
      .select({
        inventory: productInventory,
        product: {
          stockManagementType: products.stockManagementType
        }
      })
      .from(productInventory)
      .leftJoin(products, eq(productInventory.productId, products.id))
      .where(eq(productInventory.id, id))
      .limit(1);

    if (currentRecord.length === 0) {
      return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 });
    }

    const current = currentRecord[0];
    const stockManagementType = current.product?.stockManagementType || 'quantity';

    // Handle weight-based or quantity-based updates
    if (isWeightBasedProduct(stockManagementType)) {
      // Weight-based inventory updates
      if (updateData.weightQuantity !== undefined || updateData.reservedWeight !== undefined) {
        const newWeightQuantity = updateData.weightQuantity !== undefined 
          ? (typeof updateData.weightQuantity === 'string' ? parseFloat(updateData.weightQuantity) : updateData.weightQuantity)
          : parseFloat(current.inventory.weightQuantity || '0');
        
        const newReservedWeight = updateData.reservedWeight !== undefined 
          ? (typeof updateData.reservedWeight === 'string' ? parseFloat(updateData.reservedWeight) : updateData.reservedWeight)
          : parseFloat(current.inventory.reservedWeight || '0');
        
        updateData.availableWeight = (newWeightQuantity - newReservedWeight).toString();
      }

      // Convert weight units if provided
      if (updateData.weightQuantityInput && updateData.weightUnit) {
        const weightInGrams = convertToGrams(updateData.weightQuantityInput, updateData.weightUnit);
        updateData.weightQuantity = weightInGrams.toString();
        delete updateData.weightQuantityInput;
        delete updateData.weightUnit;
      }

      if (updateData.reservedWeightInput && updateData.reservedWeightUnit) {
        const reservedInGrams = convertToGrams(updateData.reservedWeightInput, updateData.reservedWeightUnit);
        updateData.reservedWeight = reservedInGrams.toString();
        delete updateData.reservedWeightInput;
        delete updateData.reservedWeightUnit;
      }
    } else {
      // Quantity-based inventory updates
      if (updateData.quantity !== undefined || updateData.reservedQuantity !== undefined) {
        const newQuantity = updateData.quantity !== undefined ? updateData.quantity : current.inventory.quantity;
        const newReserved = updateData.reservedQuantity !== undefined ? updateData.reservedQuantity : current.inventory.reservedQuantity;
        
        updateData.availableQuantity = newQuantity - newReserved;
      }
    }

    // Handle date conversion
    if (updateData.lastRestockDate) {
      updateData.lastRestockDate = new Date(updateData.lastRestockDate);
    }

    // Update the inventory record
    await db
      .update(productInventory)
      .set(updateData)
      .where(eq(productInventory.id, id));

    // Fetch and return the updated record
    const updatedRecord = await db
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
      .leftJoin(productVariants, eq(productInventory.variantId, productVariants.id))
      .where(eq(productInventory.id, id))
      .limit(1);

    return NextResponse.json(updatedRecord[0]);
  } catch (error) {
    console.error('Error updating inventory record:', error);
    return NextResponse.json({ error: 'Failed to update inventory record' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if the inventory record exists
    const existingRecord = await db
      .select()
      .from(productInventory)
      .where(eq(productInventory.id, id))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 });
    }

    // Delete the inventory record
    await db
      .delete(productInventory)
      .where(eq(productInventory.id, id));

    return NextResponse.json({ message: 'Inventory record deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory record:', error);
    return NextResponse.json({ error: 'Failed to delete inventory record' }, { status: 500 });
  }
} 