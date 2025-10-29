import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, productVariants, productAddons, productTags, tags } from '@/lib/schema';
import { eq, and, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { generateSlug } from '@/utils/priceUtils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get product' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { 
      variants, 
      variantsToDelete,
      variantChanges,
      addons,
      selectedTags,
      ...productData 
    } = await req.json();

    // If name is being updated, regenerate slug and ensure uniqueness
    if (productData.name) {
      let nextSlug = generateSlug(productData.name);
      if (nextSlug) {
        let suffix = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const existing = await db.query.products.findFirst({
            where: (p, { and, eq, ne }) => and(eq(p.slug, nextSlug), ne(p.id, id)),
          });
          if (!existing) break;
          suffix += 1;
          nextSlug = `${generateSlug(productData.name)}-${suffix}`;
        }
      }
      productData.slug = nextSlug;
    }

    // Handle empty SKU to avoid unique constraint violations
    if (productData.sku === '') {
      productData.sku = null;
    }

    // Convert numeric fields to strings for decimal storage
    if (productData.price) productData.price = productData.price.toString();
    if (productData.comparePrice) productData.comparePrice = productData.comparePrice.toString();
    if (productData.costPrice) productData.costPrice = productData.costPrice.toString();
    if (productData.weight) productData.weight = productData.weight.toString();
    if (productData.pricePerUnit) productData.pricePerUnit = productData.pricePerUnit.toString();
    // Cannabis-specific decimal fields
    if (productData.thc) productData.thc = productData.thc.toString();
    if (productData.cbd) productData.cbd = productData.cbd.toString();

    // Convert arrays/objects to JSON strings
    if (productData.images) productData.images = JSON.stringify(productData.images);
    if (productData.tags) productData.tags = JSON.stringify(productData.tags);
    if (productData.dimensions) productData.dimensions = JSON.stringify(productData.dimensions);
    // Note: Variant deletion is now handled by separate API endpoint
    // /api/products/[id]/variants/[variantId] for immediate deletion

    // Note: variationAttributes column not used - variants are the source of truth

    // Handle variant management for variable products
    if (productData.productType === 'variable' && variants) {

      // Process variants (update existing, create new)
      for (const variant of variants) {
        const variantData = {
          productId: id,
          title: variant.title,
          sku: variant.sku || null,
          price: variant.price ? variant.price.toString() : productData.price,
          comparePrice: variant.comparePrice ? variant.comparePrice.toString() : null,
          costPrice: variant.costPrice ? variant.costPrice.toString() : null,
          weight: variant.weight ? variant.weight.toString() : null,
          image: variant.image || null,
          inventoryQuantity: variant.inventoryQuantity || 0,
          inventoryManagement: true,
          allowBackorder: false,
          isActive: variant.isActive !== undefined ? variant.isActive : true,
          position: 0,
          variantOptions: variant.attributes ? JSON.stringify(variant.attributes) : null,
        };

        if (variant.id) {
          // Update existing variant
          await db
            .update(productVariants)
            .set(variantData)
            .where(eq(productVariants.id, variant.id));
        } else {
          // Create new variant
          await db.insert(productVariants).values({
            id: uuidv4(),
            ...variantData,
          });
        }
      }
    } else if (productData.productType === 'simple') {
      // If changed from variable to simple, delete all variants
      await db
        .delete(productVariants)
        .where(eq(productVariants.productId, id));
    }

    // Handle individual variant changes (from edit form)
    if (variantChanges && Object.keys(variantChanges).length > 0) {
      for (const [variantId, changes] of Object.entries(variantChanges)) {
        const updateData: any = {};
        
        // Convert numeric fields to strings for decimal storage
        Object.entries(changes as Record<string, any>).forEach(([field, value]) => {
          if (['price', 'comparePrice', 'costPrice', 'weight'].includes(field)) {
            updateData[field] = value ? value.toString() : null;
          } else {
            updateData[field] = value;
          }
        });

        await db
          .update(productVariants)
          .set(updateData)
          .where(eq(productVariants.id, variantId));
      }
    }

    // Handle addon management for all product types
    if (addons !== undefined) {
      // First, delete all existing product addons
      await db
        .delete(productAddons)
        .where(eq(productAddons.productId, id));

      // Then create new product addons if any are provided
      if (addons && addons.length > 0) {
        const addonData = addons.map((addon: any) => ({
          id: uuidv4(),
          productId: id,
          addonId: addon.addonId,
          price: addon.price ? addon.price.toString() : '0',
          isRequired: addon.isRequired || false,
          sortOrder: addon.sortOrder || 0,
          isActive: addon.isActive !== undefined ? addon.isActive : true,
        }));
        
        await db.insert(productAddons).values(addonData);
      }
    }

    // Handle product tags (new tag system)
    if (selectedTags !== undefined) {
      // First, delete all existing product tags
      await db
        .delete(productTags)
        .where(eq(productTags.productId, id));

      // Then create new product tags if any are provided
      if (selectedTags && selectedTags.length > 0) {
        const tagAssignments = [];
        
        for (let i = 0; i < selectedTags.length; i++) {
          const selectedTag = selectedTags[i];
          let tagId = selectedTag.tagId;
          
          // If this is a custom tag (has customValue and temporary ID), create the tag first
          if (selectedTag.customValue && selectedTag.tagId.startsWith('custom_')) {
            // Check if a tag with this custom value already exists in the group
            const existingTag = await db.query.tags.findFirst({
              where: (tags, { and, eq }) => and(
                eq(tags.groupId, selectedTag.groupId),
                eq(tags.name, selectedTag.customValue)
              ),
            });
            
            if (existingTag) {
              tagId = existingTag.id;
            } else {
              // Create new custom tag
              const newTagId = nanoid();
              const slug = selectedTag.customValue.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
              
              await db.insert(tags).values({
                id: newTagId,
                name: selectedTag.customValue,
                slug: slug,
                groupId: selectedTag.groupId,
                isCustom: true,
                customValue: selectedTag.customValue,
                isActive: true,
                sortOrder: 0,
              });
              
              tagId = newTagId;
            }
          }
          
          // Create product tag assignment
          tagAssignments.push({
            id: nanoid(),
            productId: id,
            tagId: tagId,
            customValue: selectedTag.customValue || null,
            sortOrder: i,
          });
        }
        
        if (tagAssignments.length > 0) {
          await db.insert(productTags).values(tagAssignments);
        }
      }
    }

    // Update the main product (after all variant operations)
    await db
      .update(products)
      .set(productData)
      .where(eq(products.id, id));

    const updatedProduct = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db
      .delete(products)
      .where(eq(products.id, id));

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
} 