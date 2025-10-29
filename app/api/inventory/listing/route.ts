import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productInventory, products, productVariants, categories } from '@/lib/schema';
import { eq, isNull, and } from 'drizzle-orm';

export async function GET() {
  try {
    // Fetch all products with their categories
    const allProducts = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));

    // Fetch all product variants
    const allVariants = await db
      .select({
        variant: productVariants,
      })
      .from(productVariants);

    // Fetch all inventory data
    const allInventory = await db
      .select({
        inventory: productInventory,
      })
      .from(productInventory);

    // Process and combine the data
    const inventoryListing = allProducts.map((productItem) => {
      const product = productItem.product;
      const category = productItem.category;
      
      if (product.productType === 'variable') {
        // Get variants for this product
        const productVariants = allVariants.filter((v) => v.variant.productId === product.id);
        
        const variants = productVariants.map((variantItem) => {
          const variant = variantItem.variant;
          const variantInventory = allInventory.find((inv) => 
            inv.inventory.variantId === variant.id
          );
          
          const currentStock = variantInventory?.inventory.quantity || 0;
          const reservedStock = variantInventory?.inventory.reservedQuantity || 0;
          const availableStock = variantInventory?.inventory.availableQuantity || currentStock - reservedStock;
          
          return {
            variantId: variant.id,
            variantTitle: variant.title,
            variantSku: variant.sku || '',
            currentStock,
            reservedStock,
            availableStock,
            reorderPoint: variantInventory?.inventory.reorderPoint || 0,
            lastRestocked: variantInventory?.inventory.lastRestockDate || null,
            isActive: variant.isActive,
          };
        });

        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku || '',
          productType: product.productType || 'simple',
          categoryName: category?.name || 'Uncategorized',
          isActive: product.isActive,
          variants,
        };
      } else {
        // Simple product
        const productInventory = allInventory.find((inv) => 
          inv.inventory.productId === product.id && !inv.inventory.variantId
        );

        const currentStock = productInventory?.inventory.quantity || 0;
        const reservedStock = productInventory?.inventory.reservedQuantity || 0;
        const availableStock = productInventory?.inventory.availableQuantity || currentStock - reservedStock;

        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku || '',
          productType: product.productType || 'simple',
          categoryName: category?.name || 'Uncategorized',
          isActive: product.isActive,
          simpleStock: {
            currentStock,
            reservedStock,
            availableStock,
            reorderPoint: productInventory?.inventory.reorderPoint || 0,
            lastRestocked: productInventory?.inventory.lastRestockDate || null,
          },
        };
      }
    });

    return NextResponse.json(inventoryListing);
  } catch (error) {
    console.error('Error fetching inventory listing:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory listing' }, { status: 500 });
  }
} 