import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addons } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const addon = await db.query.addons.findFirst({
      where: eq(addons.id, id),
    });

    if (!addon) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 });
    }

    return NextResponse.json(addon);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get addon' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    // Convert price to string for decimal storage
    if (data.price) data.price = data.price.toString();

    await db
      .update(addons)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(addons.id, id));

    const updatedAddon = await db.query.addons.findFirst({
      where: eq(addons.id, id),
    });

    if (!updatedAddon) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 });
    }

    return NextResponse.json(updatedAddon);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update addon' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db
      .delete(addons)
      .where(eq(addons.id, id));

    return NextResponse.json({ message: 'Addon deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete addon' }, { status: 500 });
  }
} 