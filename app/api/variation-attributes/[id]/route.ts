import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variationAttributes, variationAttributeValues } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeValues = searchParams.get('includeValues') === 'true';

    if (includeValues) {
      // Fetch attribute with its values
      const attributeWithValues = await db
        .select({
          attribute: variationAttributes,
          value: variationAttributeValues
        })
        .from(variationAttributes)
        .leftJoin(variationAttributeValues, eq(variationAttributes.id, variationAttributeValues.attributeId))
        .where(eq(variationAttributes.id, id));

      if (attributeWithValues.length === 0) {
        return NextResponse.json({ error: 'Variation attribute not found' }, { status: 404 });
      }

      const attribute = attributeWithValues[0].attribute;
      const values = attributeWithValues
        .filter(row => row.value !== null)
        .map(row => row.value);

      return NextResponse.json({ ...attribute, values });
    } else {
      // Fetch only attribute
      const attribute = await db.query.variationAttributes.findFirst({
        where: eq(variationAttributes.id, id),
      });

      if (!attribute) {
        return NextResponse.json({ error: 'Variation attribute not found' }, { status: 404 });
      }

      return NextResponse.json(attribute);
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get variation attribute' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    // Remove values from data if present, as they should be handled separately
    const { values, ...attributeData } = data;

    await db
      .update(variationAttributes)
      .set(attributeData)
      .where(eq(variationAttributes.id, id));

    const updatedAttribute = await db.query.variationAttributes.findFirst({
      where: eq(variationAttributes.id, id),
    });

    if (!updatedAttribute) {
      return NextResponse.json({ error: 'Variation attribute not found' }, { status: 404 });
    }

    return NextResponse.json(updatedAttribute);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Attribute name or slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update variation attribute' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if attribute exists
    const attribute = await db.query.variationAttributes.findFirst({
      where: eq(variationAttributes.id, id),
    });

    if (!attribute) {
      return NextResponse.json({ error: 'Variation attribute not found' }, { status: 404 });
    }

    // Delete attribute (this will cascade delete values due to foreign key constraint)
    await db
      .delete(variationAttributes)
      .where(eq(variationAttributes.id, id));

    return NextResponse.json({ message: 'Variation attribute deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete variation attribute' }, { status: 500 });
  }
} 