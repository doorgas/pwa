import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subcategories } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subcategory = await db.query.subcategories.findFirst({
      where: eq(subcategories.id, id),
    });

    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    return NextResponse.json(subcategory);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get subcategory' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    await db
      .update(subcategories)
      .set(data)
      .where(eq(subcategories.id, id));

    const updatedSubcategory = await db.query.subcategories.findFirst({
      where: eq(subcategories.id, id),
    });

    if (!updatedSubcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSubcategory);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update subcategory' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db
      .delete(subcategories)
      .where(eq(subcategories.id, id));

    return NextResponse.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 });
  }
} 