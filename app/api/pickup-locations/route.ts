import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pickupLocations } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    const baseQuery = db.select().from(pickupLocations);
    
    let locations;
    if (activeOnly) {
      locations = await baseQuery
        .where(eq(pickupLocations.isActive, true))
        .orderBy(desc(pickupLocations.createdAt));
    } else {
      locations = await baseQuery
        .orderBy(desc(pickupLocations.createdAt));
    }
    
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching pickup locations:', error);
    return NextResponse.json({ error: 'Failed to fetch pickup locations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, address, instructions, latitude, longitude, isActive = true } = body;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json({ error: 'Name and address are required' }, { status: 400 });
    }

    const locationId = uuidv4();
    
    // Create the pickup location
    await db.insert(pickupLocations).values({
      id: locationId,
      name,
      address,
      instructions: instructions || null,
      latitude: latitude ? latitude.toString() : null,
      longitude: longitude ? longitude.toString() : null,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fetch the created location
    const createdLocation = await db
      .select()
      .from(pickupLocations)
      .where(eq(pickupLocations.id, locationId))
      .limit(1);

    return NextResponse.json(createdLocation[0], { status: 201 });
  } catch (error) {
    console.error('Error creating pickup location:', error);
    return NextResponse.json({ error: 'Failed to create pickup location' }, { status: 500 });
  }
}