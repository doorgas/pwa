import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addons, addonGroups } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    // Fetch addons with their group information
    const allAddons = await db
      .select({
        id: addons.id,
        title: addons.title,
        price: addons.price,
        description: addons.description,
        image: addons.image,
        groupId: addons.groupId,
        isActive: addons.isActive,
        sortOrder: addons.sortOrder,
        createdAt: addons.createdAt,
        updatedAt: addons.updatedAt,
        groupTitle: addonGroups.title,
        groupSortOrder: addonGroups.sortOrder,
      })
      .from(addons)
      .leftJoin(addonGroups, eq(addons.groupId, addonGroups.id))
      .orderBy(
        asc(addonGroups.sortOrder), 
        asc(addons.sortOrder), 
        asc(addons.title)
      );
      
    return NextResponse.json(allAddons);
  } catch (error) {
    console.error('Error fetching addons:', error);
    return NextResponse.json({ error: 'Failed to fetch addons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      title, 
      price, 
      description,
      image,
      groupId,
      sortOrder, 
      isActive 
    } = await req.json();
    
    // Validate required fields
    if (!title || price === undefined || price === null) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
    }
    
    const newAddon = {
      id: uuidv4(),
      title,
      price: price.toString(),
      description: description || null,
      image: image || null,
      groupId: groupId || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    await db.insert(addons).values(newAddon);
    
    return NextResponse.json(newAddon, { status: 201 });
  } catch (error) {
    console.error('Error creating addon:', error);
    return NextResponse.json({ error: 'Failed to create addon' }, { status: 500 });
  }
} 