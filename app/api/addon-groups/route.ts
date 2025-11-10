import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addonGroups } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { desc, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const allGroups = await db
      .select()
      .from(addonGroups)
      .orderBy(asc(addonGroups.sortOrder), asc(addonGroups.title));
      
    return NextResponse.json(allGroups);
  } catch (error) {
    console.error('Error fetching addon groups:', error);
    return NextResponse.json({ error: 'Failed to fetch addon groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, sortOrder, isActive } = await req.json();
    
    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const newGroup = {
      id: uuidv4(),
      title,
      description: description || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    await db.insert(addonGroups).values(newGroup);
    
    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error('Error creating addon group:', error);
    return NextResponse.json({ error: 'Failed to create addon group' }, { status: 500 });
  }
} 