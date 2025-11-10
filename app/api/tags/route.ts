import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { tags, tagGroups } from '../../../lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/tags - Get all tags with optional filtering by group
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let whereConditions: any[] = [];
    
    if (groupId) {
      whereConditions.push(eq(tags.groupId, groupId));
    }
    
    if (!includeInactive) {
      whereConditions.push(eq(tags.isActive, true));
    }

    // Get tags with simple query
    const tagsQuery = db.select().from(tags).orderBy(desc(tags.sortOrder), desc(tags.createdAt));
    const filteredTagsQuery = whereConditions.length > 0 ? tagsQuery.where(and(...whereConditions)) : tagsQuery;
    const allTags = await filteredTagsQuery;

    // Get all tag groups
    const allGroups = await db.select().from(tagGroups);

    // Combine the data
    const tagsWithGroups = allTags.map(tag => ({
      ...tag,
      group: allGroups.find(group => group.id === tag.groupId)
    }));

    return NextResponse.json(tagsWithGroups);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!name || !groupId) {
      return NextResponse.json({ error: 'Name and groupId are required' }, { status: 400 });
    }

    // Verify that the group exists
    const groupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, groupId)).limit(1);
    const group = groupResult[0];

    if (!group) {
      return NextResponse.json({ error: 'Tag group not found' }, { status: 404 });
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');

    // Check if slug already exists within the same group
    const existingTagResult = await db.select().from(tags).where(and(
      eq(tags.slug, finalSlug),
      eq(tags.groupId, groupId)
    )).limit(1);
    const existingTag = existingTagResult[0];

    if (existingTag) {
      return NextResponse.json({ error: 'A tag with this slug already exists in this group' }, { status: 400 });
    }

    const tagId = nanoid();

    const newTag = await db.insert(tags).values({
      id: tagId,
      name,
      slug: finalSlug,
      description: description || null,
      color: color || null,
      icon: icon || null,
      groupId,
      isCustom: isCustom || false,
      customValue: customValue || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Fetch the created tag with relations
    const createdTagResult = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
    const createdTag = createdTagResult[0];
    
    // Get the tag group
    const createdGroupResult = await db.select().from(tagGroups).where(eq(tagGroups.id, createdTag.groupId)).limit(1);
    const createdGroup = createdGroupResult[0];

    // Combine the data
    const createdTagWithGroup = {
      ...createdTag,
      group: createdGroup
    };

    return NextResponse.json(createdTagWithGroup, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}