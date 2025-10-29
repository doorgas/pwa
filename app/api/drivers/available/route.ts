import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drivers, user } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('includeAll') === 'true';

    // Build where conditions
    const whereConditions = [eq(drivers.isActive, true)];
    
    if (!includeAll) {
      whereConditions.push(eq(drivers.status, 'available'));
    }

    // Get available drivers with user details
    const availableDrivers = await db
      .select({
        driver: {
          id: drivers.id,
          licenseNumber: drivers.licenseNumber,
          vehicleType: drivers.vehicleType,
          vehicleMake: drivers.vehicleMake,
          vehicleModel: drivers.vehicleModel,
          vehiclePlateNumber: drivers.vehiclePlateNumber,
          vehicleColor: drivers.vehicleColor,
          baseLocation: drivers.baseLocation,
          status: drivers.status,
          maxDeliveryRadius: drivers.maxDeliveryRadius,
        },
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        }
      })
      .from(drivers)
      .innerJoin(user, eq(drivers.userId, user.id))
      .where(and(...whereConditions))
      .orderBy(user.name);

    return NextResponse.json({
      drivers: availableDrivers,
      count: availableDrivers.length
    });

  } catch (error) {
    console.error('Error fetching available drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available drivers' },
      { status: 500 }
    );
  }
}