import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variationAttributeValues } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const value = await db.query.variationAttributeValues.findFirst({
      where: eq(variationAttributeValues.id, id),
    });

    if (!value) {
      return NextResponse.json({ error: 'Variation attribute value not found' }, { status: 404 });
    }

    return NextResponse.json(value);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get variation attribute value' }, { status: 500 });
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
      .update(variationAttributeValues)
      .set(data)
      .where(eq(variationAttributeValues.id, id));

    const updatedValue = await db.query.variationAttributeValues.findFirst({
      where: eq(variationAttributeValues.id, id),
    });

    if (!updatedValue) {
      return NextResponse.json({ error: 'Variation attribute value not found' }, { status: 404 });
    }

    return NextResponse.json(updatedValue);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Value slug already exists for this attribute' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update variation attribute value' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if value exists
    const value = await db.query.variationAttributeValues.findFirst({
      where: eq(variationAttributeValues.id, id),
    });

    if (!value) {
      return NextResponse.json({ error: 'Variation attribute value not found' }, { status: 404 });
    }

    await db
      .delete(variationAttributeValues)
      .where(eq(variationAttributeValues.id, id));

    return NextResponse.json({ message: 'Variation attribute value deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete variation attribute value' }, { status: 500 });
  }
} 