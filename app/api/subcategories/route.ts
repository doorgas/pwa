import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subcategories } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const allSubcategories = await db.select().from(subcategories);
    return NextResponse.json(allSubcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, slug, description, image, categoryId, sortOrder, isActive } = await req.json();
    
    // Validate required fields
    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Name and categoryId are required' }, { status: 400 });
    }
    
    const newSubcategory = {
      id: uuidv4(),
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || null,
      image: image || null,
      categoryId,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    await db.insert(subcategories).values(newSubcategory);
    
    return NextResponse.json(newSubcategory, { status: 201 });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 });
  }
} 