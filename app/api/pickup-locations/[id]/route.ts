import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pickupLocations } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const location = await db
      .select()
      .from(pickupLocations)
      .where(eq(pickupLocations.id, id))
      .limit(1);

    if (location.length === 0) {
      return NextResponse.json({ error: 'Pickup location not found' }, { status: 404 });
    }

    return NextResponse.json(location[0]);
  } catch (error) {
    console.error('Error fetching pickup location:', error);
    return NextResponse.json({ error: 'Failed to fetch pickup location' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, address, instructions, latitude, longitude, isActive } = body;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json({ error: 'Name and address are required' }, { status: 400 });
    }

    // Check if location exists
    const existingLocation = await db
      .select()
      .from(pickupLocations)
      .where(eq(pickupLocations.id, id))
      .limit(1);

    if (existingLocation.length === 0) {
      return NextResponse.json({ error: 'Pickup location not found' }, { status: 404 });
    }

    // Update the pickup location
    await db
      .update(pickupLocations)
      .set({
        name,
        address,
        instructions: instructions || null,
        latitude: latitude ? latitude.toString() : null,
        longitude: longitude ? longitude.toString() : null,
        isActive: isActive !== undefined ? isActive : existingLocation[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(pickupLocations.id, id));

    // Fetch the updated location
    const updatedLocation = await db
      .select()
      .from(pickupLocations)
      .where(eq(pickupLocations.id, id))
      .limit(1);

    return NextResponse.json(updatedLocation[0]);
  } catch (error) {
    console.error('Error updating pickup location:', error);
    return NextResponse.json({ error: 'Failed to update pickup location' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Check if location exists
    const existingLocation = await db
      .select()
      .from(pickupLocations)
      .where(eq(pickupLocations.id, id))
      .limit(1);

    if (existingLocation.length === 0) {
      return NextResponse.json({ error: 'Pickup location not found' }, { status: 404 });
    }

    // Instead of hard delete, we could soft delete by setting isActive to false
    // But for now, we'll do a hard delete. In production, you might want to check
    // if there are any orders associated with this pickup location first
    
    await db
      .delete(pickupLocations)
      .where(eq(pickupLocations.id, id));

    return NextResponse.json({ message: 'Pickup location deleted successfully' });
  } catch (error) {
    console.error('Error deleting pickup location:', error);
    return NextResponse.json({ error: 'Failed to delete pickup location' }, { status: 500 });
  }
}