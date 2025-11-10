import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { productTags, products, tags, tagGroups } from '../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/product-tags - Get product tags with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const tagId = searchParams.get('tagId');

    let whereConditions: any[] = [];
    
    if (productId) {
      whereConditions.push(eq(productTags.productId, productId));
    }
    
    if (tagId) {
      whereConditions.push(eq(productTags.tagId, tagId));
    }

    // Get product tags with simple query
    const productTagsQuery = db.select().from(productTags).orderBy(productTags.sortOrder, productTags.createdAt);
    const filteredProductTagsQuery = whereConditions.length > 0 ? productTagsQuery.where(and(...whereConditions)) : productTagsQuery;
    const allProductTags = await filteredProductTagsQuery;

    // Get related data
    const allProducts = await db.select().from(products);
    const allTags = await db.select().from(tags);
    const allTagGroups = await db.select().from(tagGroups);

    // Combine the data
    const productTagsWithRelations = allProductTags.map(productTag => {
      const product = allProducts.find(p => p.id === productTag.productId);
      const tag = allTags.find(t => t.id === productTag.tagId);
      const group = tag ? allTagGroups.find(g => g.id === tag.groupId) : null;

      return {
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
    });

    return NextResponse.json(productTagsWithRelations);
  } catch (error) {
    console.error('Error fetching product tags:', error);
    return NextResponse.json({ error: 'Failed to fetch product tags' }, { status: 500 });
  }
}

// POST /api/product-tags - Create/assign tags to a product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, tagAssignments } = body;

    // Validate required fields
    if (!productId || !tagAssignments || !Array.isArray(tagAssignments)) {
      return NextResponse.json({ error: 'ProductId and tagAssignments array are required' }, { status: 400 });
    }

    // Verify that the product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete existing product tags for this product
    await db.delete(productTags).where(eq(productTags.productId, productId));

    // Insert new tag assignments
    const newProductTags = [];
    
    for (let i = 0; i < tagAssignments.length; i++) {
      const assignment = tagAssignments[i];
      const { tagId, customValue } = assignment;

      // Verify tag exists
      const tag = await db.query.tags.findFirst({
        where: eq(tags.id, tagId),
        with: {
          group: true,
        },
      });

      if (!tag) {
        console.warn(`Tag ${tagId} not found, skipping`);
        continue;
      }

      // Validate custom value if provided
      if (customValue && !tag.group.allowCustomValues) {
        return NextResponse.json(
          { error: `Tag group "${tag.group.name}" does not allow custom values` },
          { status: 400 }
        );
      }

      const productTagId = nanoid();
      
      await db.insert(productTags).values({
        id: productTagId,
        productId,
        tagId,
        customValue: customValue || null,
        sortOrder: i,
      });

      // Fetch the created product tag with relations
      const createdProductTag = await db.query.productTags.findFirst({
        where: eq(productTags.id, productTagId),
        with: {
          tag: {
            with: {
              group: true,
            },
          },
        },
      });

      newProductTags.push(createdProductTag);
    }

    return NextResponse.json(newProductTags, { status: 201 });
  } catch (error) {
    console.error('Error creating product tags:', error);
    return NextResponse.json({ error: 'Failed to create product tags' }, { status: 500 });
  }
}

// DELETE /api/product-tags - Remove all tags from a product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'ProductId is required' }, { status: 400 });
    }

    // Delete all product tags for this product
    await db.delete(productTags).where(eq(productTags.productId, productId));

    return NextResponse.json({ message: 'All product tags removed successfully' });
  } catch (error) {
    console.error('Error deleting product tags:', error);
    return NextResponse.json({ error: 'Failed to delete product tags' }, { status: 500 });
  }
}