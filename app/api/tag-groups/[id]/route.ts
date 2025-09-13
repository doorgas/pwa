import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { tagGroups, tags } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/tag-groups/[id] - Get a specific tag group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get the tag group
    const groupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, id)).limit(1);
    const group = groupResult[0];

    if (!group) {
      return NextResponse.json({ error: 'Tag group not found' }, { status: 404 });
    }

    // Get tags for this group
    const groupTags = await db.select().from(tags).where(eq(tags.groupId, id)).orderBy(tags.sortOrder, tags.name);

    // Combine the data
    const groupWithTags = {
      ...group,
      tags: groupTags
    };

    return NextResponse.json(groupWithTags);
  } catch (error) {
    console.error('Error fetching tag group:', error);
    return NextResponse.json({ error: 'Failed to fetch tag group' }, { status: 500 });
  }
}

// PUT /api/tag-groups/[id] - Update a tag group
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
      allowCustomValues,
      isRequired,
      maxSelections,
      sortOrder,
      isActive
    } = body;

    // Check if group exists
    const existingGroupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, id)).limit(1);
    const existingGroup = existingGroupResult[0];

    if (!existingGroup) {
      return NextResponse.json({ error: 'Tag group not found' }, { status: 404 });
    }

    // If slug is being changed, check if it already exists
    if (slug && slug !== existingGroup.slug) {
      const slugExistsResult = await db.select().from(tagGroups).where(eq(tagGroups.slug, slug)).limit(1);
      const slugExists = slugExistsResult[0];

      if (slugExists) {
        return NextResponse.json({ error: 'A tag group with this slug already exists' }, { status: 400 });
      }
    }

    // Update the group
    await db.update(tagGroups)
      .set({
        name: name || existingGroup.name,
        slug: slug || existingGroup.slug,
        description: description !== undefined ? description : existingGroup.description,
        color: color !== undefined ? color : existingGroup.color,
        icon: icon !== undefined ? icon : existingGroup.icon,
        allowCustomValues: allowCustomValues !== undefined ? allowCustomValues : existingGroup.allowCustomValues,
        isRequired: isRequired !== undefined ? isRequired : existingGroup.isRequired,
        maxSelections: maxSelections !== undefined ? maxSelections : existingGroup.maxSelections,
        sortOrder: sortOrder !== undefined ? sortOrder : existingGroup.sortOrder,
        isActive: isActive !== undefined ? isActive : existingGroup.isActive,
        updatedAt: new Date(),
      })
      .where(eq(tagGroups.id, id));

    // Fetch the updated group with relations
    const updatedGroupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, id)).limit(1);
    const updatedGroup = updatedGroupResult[0];
    
    // Get tags for this group
    const updatedGroupTags = await db.select().from(tags).where(eq(tags.groupId, id)).orderBy(tags.sortOrder, tags.name);

    // Combine the data
    const updatedGroupWithTags = {
      ...updatedGroup,
      tags: updatedGroupTags
    };

    return NextResponse.json(updatedGroupWithTags);
  } catch (error) {
    console.error('Error updating tag group:', error);
    return NextResponse.json({ error: 'Failed to update tag group' }, { status: 500 });
  }
}

// DELETE /api/tag-groups/[id] - Delete a tag group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if group exists
    const existingGroupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, id)).limit(1);
    const existingGroup = existingGroupResult[0];

    if (!existingGroup) {
      return NextResponse.json({ error: 'Tag group not found' }, { status: 404 });
    }

    // Check if group has tags
    const groupTags = await db.select().from(tags).where(eq(tags.groupId, id));
    if (groupTags.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tag group that contains tags. Delete all tags first.' },
        { status: 400 }
      );
    }

    // Delete the group
    await db.delete(tagGroups).where(eq(tagGroups.id, id));

    return NextResponse.json({ message: 'Tag group deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag group:', error);
    return NextResponse.json({ error: 'Failed to delete tag group' }, { status: 500 });
  }
}