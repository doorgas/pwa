import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { tags, tagGroups, productTags } from '../../../../lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/tags/[id] - Get a specific tag
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get the tag
    const tagResult = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    const tag = tagResult[0];

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Get the tag group
    const groupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, tag.groupId)).limit(1);
    const group = groupResult[0];

    // Combine the data
    const tagWithGroup = {
      ...tag,
      group: group
    };

    return NextResponse.json(tagWithGroup);
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}

// PUT /api/tags/[id] - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      slug,
      description,
      color,
      icon,
      groupId,
      isCustom,
      customValue,
      sortOrder,
      isActive
    } = body;

    // Check if tag exists
    const existingTagResult = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    const existingTag = existingTagResult[0];

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // If slug or groupId is being changed, check if it already exists
    if ((slug && slug !== existingTag.slug) || (groupId && groupId !== existingTag.groupId)) {
      const finalGroupId = groupId || existingTag.groupId;
      const finalSlug = slug || existingTag.slug;
      
      const slugExistsResult = await db.select().from(tags).where(and(
        eq(tags.slug, finalSlug),
        eq(tags.groupId, finalGroupId)
      )).limit(1);
      const slugExists = slugExistsResult[0];

      if (slugExists && slugExists.id !== id) {
        return NextResponse.json({ error: 'A tag with this slug already exists in this group' }, { status: 400 });
      }
    }

    // Update the tag
    await db.update(tags)
      .set({
        name: name || existingTag.name,
        slug: slug || existingTag.slug,
        description: description !== undefined ? description : existingTag.description,
        color: color !== undefined ? color : existingTag.color,
        icon: icon !== undefined ? icon : existingTag.icon,
        groupId: groupId || existingTag.groupId,
        isCustom: isCustom !== undefined ? isCustom : existingTag.isCustom,
        customValue: customValue !== undefined ? customValue : existingTag.customValue,
        sortOrder: sortOrder !== undefined ? sortOrder : existingTag.sortOrder,
        isActive: isActive !== undefined ? isActive : existingTag.isActive,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, id));

    // Fetch the updated tag with relations
    const updatedTagResult = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    const updatedTag = updatedTagResult[0];
    
    // Get the tag group
    const updatedGroupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, updatedTag.groupId)).limit(1);
    const updatedGroup = updatedGroupResult[0];

    // Combine the data
    const updatedTagWithGroup = {
      ...updatedTag,
      group: updatedGroup
    };

    return NextResponse.json(updatedTagWithGroup);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if tag exists
    const existingTagResult = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    const existingTag = existingTagResult[0];

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Check if tag is being used by products
    const productTagsUsingThis = await db.select().from(productTags).where(eq(productTags.tagId, id));
    if (productTagsUsingThis.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete tag that is used by ${productTagsUsingThis.length} product(s). Remove from products first.` },
        { status: 400 }
      );
    }

    // Delete the tag
    await db.delete(tags).where(eq(tags.id, id));

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}