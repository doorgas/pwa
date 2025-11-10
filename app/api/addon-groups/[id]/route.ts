import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addonGroups, addons } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const group = await db.query.addonGroups.findFirst({
      where: eq(addonGroups.id, id),
    });

    if (!group) {
      return NextResponse.json({ error: 'Addon group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching addon group:', error);
    return NextResponse.json({ error: 'Failed to fetch addon group' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, description, sortOrder, isActive } = await req.json();
    
    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const updateData = {
      title,
      description: description || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    await db
      .update(addonGroups)
      .set(updateData)
      .where(eq(addonGroups.id, id));

    const updatedGroup = await db.query.addonGroups.findFirst({
      where: eq(addonGroups.id, id),
    });

    if (!updatedGroup) {
      return NextResponse.json({ error: 'Addon group not found' }, { status: 404 });
    }

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error updating addon group:', error);
    return NextResponse.json({ error: 'Failed to update addon group' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if any addons are using this group
    const addonsInGroup = await db
      .select()
      .from(addons)
      .where(eq(addons.groupId, id));
    
    if (addonsInGroup.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete group. ${addonsInGroup.length} addon(s) are assigned to this group. Please reassign or delete them first.` 
      }, { status: 400 });
    }
    
    await db
      .delete(addonGroups)
      .where(eq(addonGroups.id, id));

    return NextResponse.json({ message: 'Addon group deleted successfully' });
  } catch (error) {
    console.error('Error deleting addon group:', error);
    return NextResponse.json({ error: 'Failed to delete addon group' }, { status: 500 });
  }
} 