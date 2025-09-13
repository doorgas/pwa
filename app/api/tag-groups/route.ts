import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { tagGroups, tags } from '../../../lib/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/tag-groups - Get all tag groups
export async function GET() {
  try {
    // First get all tag groups
    const groups = await db.select().from(tagGroups).orderBy(desc(tagGroups.sortOrder), desc(tagGroups.createdAt));

    // Then get all active tags and group them
    const allTags = await db.select().from(tags).where(eq(tags.isActive, true)).orderBy(tags.sortOrder, tags.name);

    // Combine the data
    const groupsWithTags = groups.map(group => ({
      ...group,
      tags: allTags.filter(tag => tag.groupId === group.id)
    }));

    return NextResponse.json(groupsWithTags);
  } catch (error) {
    console.error('Error fetching tag groups:', error);
    return NextResponse.json({ error: 'Failed to fetch tag groups' }, { status: 500 });
  }
}

// POST /api/tag-groups - Create a new tag group
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');

    // Check if slug already exists
    const existingGroupResult = await db.select().from(tagGroups).where(eq(tagGroups.slug, finalSlug)).limit(1);
    const existingGroup = existingGroupResult[0];

    if (existingGroup) {
      return NextResponse.json({ error: 'A tag group with this slug already exists' }, { status: 400 });
    }

    const tagGroupId = nanoid();

    const newGroup = await db.insert(tagGroups).values({
      id: tagGroupId,
      name,
      slug: finalSlug,
      description: description || null,
      color: color || null,
      icon: icon || null,
      allowCustomValues: allowCustomValues || false,
      isRequired: isRequired || false,
      maxSelections: maxSelections || 0,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Fetch the created group with relations
    const createdGroupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, tagGroupId)).limit(1);
    const createdGroup = createdGroupResult[0];
    
    // Get tags for this group (should be empty for new group)
    const createdGroupTags = await db.select().from(tags).where(eq(tags.groupId, tagGroupId));

    // Combine the data
    const createdGroupWithTags = {
      ...createdGroup,
      tags: createdGroupTags
    };

    return NextResponse.json(createdGroupWithTags, { status: 201 });
  } catch (error) {
    console.error('Error creating tag group:', error);
    return NextResponse.json({ error: 'Failed to create tag group' }, { status: 500 });
  }
}