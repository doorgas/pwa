import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const allCategories = await db.select().from(categories);
    return NextResponse.json(allCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, slug, description, image, icon, iconName, isFeatured, parentId, sortOrder, isActive } = await req.json();
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const newCategory = {
      id: uuidv4(),
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || null,
      image: image || null,
      icon: icon || null,
      iconName: iconName || null,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      parentId: parentId || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    };
    
    await db.insert(categories).values(newCategory);
    
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
} 