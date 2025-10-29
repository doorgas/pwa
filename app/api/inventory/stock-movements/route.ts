import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productInventory, products, productVariants, stockMovements } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { convertToGrams, isWeightBasedProduct } from '@/utils/weightUtils';

// This would ideally be a separate table for stock movements
// For now, we'll create a mock implementation that updates inventory directly

export async function GET() {
  try {
    // Fetch stock movements with product and variant information
    const movements = await db
      .select({
        movement: stockMovements,
        product: {
          id: products.id,
          name: products.name,
          stockManagementType: products.stockManagementType,
          baseWeightUnit: products.baseWeightUnit
        },
        variant: productVariants,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(productVariants, eq(stockMovements.variantId, productVariants.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(1000); // Limit to prevent too much data

    const formattedMovements = movements.map(({ movement, product, variant }) => ({
      id: movement.id,
      productName: product?.name || 'Unknown Product',
      variantTitle: variant?.title || null,
      movementType: movement.movementType,
      // Include both quantity and weight fields
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      weightQuantity: movement.weightQuantity,
      previousWeightQuantity: movement.previousWeightQuantity,
      newWeightQuantity: movement.newWeightQuantity,
      stockManagementType: product?.stockManagementType || 'quantity',
      baseWeightUnit: product?.baseWeightUnit || 'grams',
      reason: movement.reason,
      location: movement.location,
      reference: movement.reference,
      notes: movement.notes,
      costPrice: movement.costPrice,
      supplier: movement.supplier,
      processedBy: movement.processedBy,
      createdAt: movement.createdAt?.toISOString() || new Date().toISOString(),
    }));
    
    return NextResponse.json(formattedMovements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json({ error: 'Failed to fetch stock movements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      productId, 
      variantId, 
      movementType, 
      quantity, 
      // Weight-based fields
      weightQuantity,
      weightUnit,
      reason, 
      location, 
      reference, 
      notes,
      costPrice,
      supplier 
    } = await req.json();
    
    // Get product to determine stock management type
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { stockManagementType: true, baseWeightUnit: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const isWeightBased = isWeightBasedProduct(product.stockManagementType || 'quantity');

    // Validate required fields based on stock management type
    if (!productId || !movementType || !reason) {
      return NextResponse.json({ error: 'ProductId, movementType, and reason are required' }, { status: 400 });
    }

    if (isWeightBased) {
      if (!weightQuantity || !weightUnit) {
        return NextResponse.json({ error: 'Weight quantity and unit are required for weight-based products' }, { status: 400 });
      }
    } else {
      if (!quantity) {
        return NextResponse.json({ error: 'Quantity is required for quantity-based products' }, { status: 400 });
      }
    }

    // Find existing inventory record
    let whereConditions = [eq(productInventory.productId, productId)];
    
    if (variantId) {
      whereConditions.push(eq(productInventory.variantId, variantId));
    } else {
      whereConditions.push(isNull(productInventory.variantId));
    }

    const existingInventory = await db
      .select()
      .from(productInventory)
      .where(and(...whereConditions))
      .limit(1);
    
    let newQuantity = 0;
    let newWeightQuantity = 0;
    let inventoryId = '';

    // Convert weight to grams if weight-based
    const weightInGrams = isWeightBased ? convertToGrams(weightQuantity, weightUnit) : 0;

    if (existingInventory.length > 0) {
      const current = existingInventory[0];
      inventoryId = current.id;
      
      if (isWeightBased) {
        // Handle weight-based movements
        const currentWeight = parseFloat(current.weightQuantity || '0');
        
        switch (movementType) {
          case 'in':
            newWeightQuantity = currentWeight + weightInGrams;
            break;
          case 'out':
            newWeightQuantity = currentWeight - weightInGrams;
            if (newWeightQuantity < 0) {
              return NextResponse.json({ error: 'Insufficient stock for this movement' }, { status: 400 });
            }
            break;
          case 'adjustment':
            newWeightQuantity = weightInGrams; // For adjustments, weight is the new total
            break;
          default:
            return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
        }

        // Update existing weight-based inventory
        await db
          .update(productInventory)
          .set({
            weightQuantity: newWeightQuantity.toString(),
            availableWeight: (newWeightQuantity - parseFloat(current.reservedWeight || '0')).toString(),
            lastRestockDate: movementType === 'in' ? new Date() : current.lastRestockDate,
            supplier: (movementType === 'in' && supplier) ? supplier : current.supplier,
          })
          .where(eq(productInventory.id, current.id));
      } else {
        // Handle quantity-based movements
        switch (movementType) {
          case 'in':
            newQuantity = current.quantity + quantity;
            break;
          case 'out':
            newQuantity = current.quantity - quantity;
            if (newQuantity < 0) {
              return NextResponse.json({ error: 'Insufficient stock for this movement' }, { status: 400 });
            }
            break;
          case 'adjustment':
            newQuantity = quantity; // For adjustments, quantity is the new total
            break;
          default:
            return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
        }

        // Update existing quantity-based inventory
        await db
          .update(productInventory)
          .set({
            quantity: newQuantity,
            availableQuantity: newQuantity - (current.reservedQuantity || 0),
            lastRestockDate: movementType === 'in' ? new Date() : current.lastRestockDate,
            supplier: (movementType === 'in' && supplier) ? supplier : current.supplier,
          })
          .where(eq(productInventory.id, current.id));
      }
    } else {
      // Create new inventory record if it doesn't exist
      if (movementType === 'out') {
        return NextResponse.json({ error: 'Cannot remove stock from non-existent inventory' }, { status: 400 });
      }

      inventoryId = uuidv4();

      if (isWeightBased) {
        newWeightQuantity = movementType === 'in' ? weightInGrams : (movementType === 'adjustment' ? weightInGrams : 0);
        
        await db.insert(productInventory).values({
          id: inventoryId,
          productId,
          variantId: variantId || null,
          // Set quantity fields to 0 for weight-based products
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          reorderPoint: 0,
          reorderQuantity: 0,
          // Set weight fields
          weightQuantity: newWeightQuantity.toString(),
          reservedWeight: '0.00',
          availableWeight: newWeightQuantity.toString(),
          reorderWeightPoint: '0.00',
          reorderWeightQuantity: '0.00',
          location: location || null,
          supplier: supplier || null,
          lastRestockDate: movementType === 'in' ? new Date() : null,
        });
      } else {
        newQuantity = movementType === 'in' ? quantity : (movementType === 'adjustment' ? quantity : 0);
        
        await db.insert(productInventory).values({
          id: inventoryId,
          productId,
          variantId: variantId || null,
          quantity: newQuantity,
          reservedQuantity: 0,
          availableQuantity: newQuantity,
          reorderPoint: 0,
          reorderQuantity: 0,
          // Set weight fields to 0 for quantity-based products
          weightQuantity: '0.00',
          reservedWeight: '0.00',
          availableWeight: '0.00',
          reorderWeightPoint: '0.00',
          reorderWeightQuantity: '0.00',
          location: location || null,
          supplier: supplier || null,
          lastRestockDate: movementType === 'in' ? new Date() : null,
        });
      }
    }

    // Insert record into stock_movements table for audit trail
    const movementId = uuidv4();
    const previousQuantity = existingInventory.length > 0 ? existingInventory[0].quantity : 0;
    const previousWeightQuantity = existingInventory.length > 0 ? parseFloat(existingInventory[0].weightQuantity || '0') : 0;
    
    await db.insert(stockMovements).values({
      id: movementId,
      inventoryId,
      productId,
      variantId: variantId || null,
      movementType,
      // Quantity-based fields
      quantity: quantity || 0,
      previousQuantity,
      newQuantity,
      // Weight-based fields
      weightQuantity: weightInGrams.toString(),
      previousWeightQuantity: previousWeightQuantity.toString(),
      newWeightQuantity: newWeightQuantity.toString(),
      reason,
      location: location || null,
      reference: reference || null,
      notes: notes || null,
      costPrice: costPrice || null,
      supplier: supplier || null,
      processedBy: null, // TODO: Add current admin user ID when authentication is implemented
      createdAt: new Date(),
    });
    
    const movementRecord = {
      id: movementId,
      inventoryId,
      productId,
      variantId: variantId || null,
      movementType,
      // Quantity-based fields
      quantity: quantity || 0,
      previousQuantity,
      newQuantity,
      // Weight-based fields
      weightQuantity: weightInGrams,
      previousWeightQuantity,
      newWeightQuantity,
      stockManagementType: product.stockManagementType,
      reason,
      location: location || null,
      reference: reference || null,
      notes: notes || null,
      costPrice: costPrice || null,
      supplier: supplier || null,
      createdAt: new Date(),
    };
    
    return NextResponse.json(movementRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json({ error: 'Failed to create stock movement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Array of stock movement IDs is required' }, { status: 400 });
    }
    
    // Note: Deleting stock movements is generally not recommended in production
    // as it breaks the audit trail. Consider adding a "deleted" flag instead.
    // However, for admin purposes, we'll allow it with a warning.
    
    // Delete all stock movements with the provided IDs
    const deletedMovements = await db
      .delete(stockMovements)
      .where(inArray(stockMovements.id, ids));
    
    return NextResponse.json({ 
      message: `Successfully deleted ${ids.length} stock movement(s)`,
      deletedCount: ids.length,
      warning: 'Deleting stock movements removes audit trail history. Use with caution.'
    });
  } catch (error) {
    console.error('Error deleting stock movements:', error);
    return NextResponse.json({ error: 'Failed to delete stock movements' }, { status: 500 });
  }
} 