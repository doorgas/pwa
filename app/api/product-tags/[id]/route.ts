import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { productTags, products, tags, tagGroups } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/product-tags/[id] - Get a specific product tag
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get the product tag
    const productTagResult = await db.select().from(productTags).where(eq(productTags.id, id)).limit(1);
    const productTag = productTagResult[0];

    if (!productTag) {
      return NextResponse.json({ error: 'Product tag not found' }, { status: 404 });
    }

    // Get related data
    const productResult = await db.select().from(products).where(eq(products.id, productTag.productId)).limit(1);
    const product = productResult[0];
    
    const tagResult = await db.select().from(tags).where(eq(tags.id, productTag.tagId)).limit(1);
    const tag = tagResult[0];
    
    const groupResult = tag ? await db.select().from(tagGroups).where(eq(tagGroups.id, tag.groupId)).limit(1) : [];
    const group = groupResult[0];

    // Combine the data
    const productTagWithRelations = {
      ...productTag,
      product: product ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
      } : null,
      tag: tag ? {
        ...tag,
        group: group
      } : null,
    };

    return NextResponse.json(productTagWithRelations);
  } catch (error) {
    console.error('Error fetching product tag:', error);
    return NextResponse.json({ error: 'Failed to fetch product tag' }, { status: 500 });
  }
}

// PUT /api/product-tags/[id] - Update a product tag (mainly for custom values)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { customValue, sortOrder } = body;

    // Check if product tag exists
    const existingProductTagResult = await db.select().from(productTags).where(eq(productTags.id, id)).limit(1);
    const existingProductTag = existingProductTagResult[0];

    if (!existingProductTag) {
      return NextResponse.json({ error: 'Product tag not found' }, { status: 404 });
    }

    // Get tag and group for validation
    const tagResult = await db.select().from(tags).where(eq(tags.id, existingProductTag.tagId)).limit(1);
    const tag = tagResult[0];
    
    if (!tag) {
      return NextResponse.json({ error: 'Associated tag not found' }, { status: 404 });
    }
    
    const groupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, tag.groupId)).limit(1);
    const group = groupResult[0];
    
    if (!group) {
      return NextResponse.json({ error: 'Associated tag group not found' }, { status: 404 });
    }

    // Validate custom value if provided
    if (customValue && !group.allowCustomValues) {
      return NextResponse.json(
        { error: `Tag group "${group.name}" does not allow custom values` },
        { status: 400 }
      );
    }

    // Update the product tag
    await db.update(productTags)
      .set({
        customValue: customValue !== undefined ? customValue : existingProductTag.customValue,
        sortOrder: sortOrder !== undefined ? sortOrder : existingProductTag.sortOrder,
      })
      .where(eq(productTags.id, id));

    // Fetch the updated product tag with relations
    const updatedProductTagResult = await db.select().from(productTags).where(eq(productTags.id, id)).limit(1);
    const updatedProductTag = updatedProductTagResult[0];
    
    // Get related data for response
    const productResult = await db.select().from(products).where(eq(products.id, updatedProductTag.productId)).limit(1);
    const product = productResult[0];

    // Combine the data
    const updatedProductTagWithRelations = {
      ...updatedProductTag,
      product: product ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
      } : null,
      tag: {
        ...tag,
        group: group
      },
    };

    return NextResponse.json(updatedProductTagWithRelations);
  } catch (error) {
    console.error('Error updating product tag:', error);
    return NextResponse.json({ error: 'Failed to update product tag' }, { status: 500 });
  }
}

// DELETE /api/product-tags/[id] - Delete a specific product tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if product tag exists
    const existingProductTagResult = await db.select().from(productTags).where(eq(productTags.id, id)).limit(1);
    const existingProductTag = existingProductTagResult[0];

    if (!existingProductTag) {
      return NextResponse.json({ error: 'Product tag not found' }, { status: 404 });
    }

    // Delete the product tag
    await db.delete(productTags).where(eq(productTags.id, id));

    return NextResponse.json({ message: 'Product tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting product tag:', error);
    return NextResponse.json({ error: 'Failed to delete product tag' }, { status: 500 });
  }
}