import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drivers, user, driverAssignments, orders } from '@/lib/schema';
import { eq, and, like, or, desc, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          like(user.name, `%${search}%`),
          like(user.email, `%${search}%`),
          like(user.phone, `%${search}%`),
          and(drivers.licenseNumber, like(drivers.licenseNumber, `%${search}%`)),
          and(drivers.vehiclePlateNumber, like(drivers.vehiclePlateNumber, `%${search}%`))
        )
      );
    }

    if (status) {
      whereConditions.push(eq(drivers.status, status));
    }

    // Get drivers with user details
    const driversData = await db
      .select({
        driver: drivers,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          city: user.city,
          address: user.address,
          createdAt: user.createdAt,
        }
      })
      .from(drivers)
      .innerJoin(user, eq(drivers.userId, user.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(drivers.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(drivers)
      .innerJoin(user, eq(drivers.userId, user.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const totalCount = totalCountResult[0]?.count || 0;

    // Get comprehensive statistics for each driver using orders table only
    const driversWithStats = await Promise.all(
      driversData.map(async (item) => {
        // Get total orders assigned to this driver
        const totalAssignments = await db
          .select({ count: count() })
          .from(orders)
          .where(eq(orders.assignedDriverId, item.driver.id));

        // Get active assignments (in progress)
        const activeAssignments = await db
          .select({ count: count() })
          .from(orders)
          .where(
            and(
              eq(orders.assignedDriverId, item.driver.id),
              or(
                eq(orders.deliveryStatus, 'assigned'),
                eq(orders.deliveryStatus, 'picked_up'),
                eq(orders.deliveryStatus, 'out_for_delivery')
              )
            )
          );

        // Get completed deliveries
        const completedDeliveries = await db
          .select({ count: count() })
          .from(orders)
          .where(
            and(
              eq(orders.assignedDriverId, item.driver.id),
              eq(orders.deliveryStatus, 'delivered')
            )
          );

        // Get failed deliveries
        const failedDeliveries = await db
          .select({ count: count() })
          .from(orders)
          .where(
            and(
              eq(orders.assignedDriverId, item.driver.id),
              eq(orders.deliveryStatus, 'failed')
            )
          );

        return {
          ...item,
          activeAssignments: activeAssignments[0]?.count || 0,
          totalAssignments: totalAssignments[0]?.count || 0,
          completedDeliveries: completedDeliveries[0]?.count || 0,
          failedDeliveries: failedDeliveries[0]?.count || 0,
          directOrderAssignments: 0, // Simplified: all assignments are in orders table now
          successRate: totalAssignments[0]?.count > 0 
            ? Math.round((completedDeliveries[0]?.count || 0) / totalAssignments[0]?.count * 100)
            : 0
        };
      })
    );

    return NextResponse.json({
      drivers: driversWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drivers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      // User fields
      name,
      email,
      phone,
      password,
      city,
      address,
      state,
      postalCode,
      country,
      
      // Driver fields
      licenseNumber,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehiclePlateNumber,
      vehicleColor,
      baseLocation,
      baseLatitude,
      baseLongitude,
      maxDeliveryRadius,
      emergencyContact,
      emergencyContactName,
      status = 'offline'
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if license number already exists (only if license number is provided)
    if (licenseNumber) {
      const existingDriver = await db
        .select()
        .from(drivers)
        .where(eq(drivers.licenseNumber, licenseNumber))
        .limit(1);

      if (existingDriver.length > 0) {
        return NextResponse.json(
          { error: 'License number already exists' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user first
    const userId = uuidv4();
    await db.insert(user).values({
      id: userId,
      name,
      email,
      phone,
      city,
      address,
      state,
      postalCode,
      country,
      userType: 'driver', // Mark this user as a driver
      status: 'approved', // Set status to approved for new drivers
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create driver record
    const driverId = uuidv4();
    await db.insert(drivers).values({
      id: driverId,
      userId,
      licenseNumber: licenseNumber || null,
      vehicleType: vehicleType || null,
      vehicleMake: vehicleMake || null,
      vehicleModel: vehicleModel || null,
      vehicleYear: vehicleYear || null,
      vehiclePlateNumber: vehiclePlateNumber || null,
      vehicleColor: vehicleColor || null,
      baseLocation: baseLocation || null,
      baseLatitude: baseLatitude || null,
      baseLongitude: baseLongitude || null,
      maxDeliveryRadius: maxDeliveryRadius || 50,
      emergencyContact: emergencyContact || null,
      emergencyContactName: emergencyContactName || null,
      status,
      isActive: true,
      dateOfJoining: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: 'Driver created successfully', driverId },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json(
      { error: 'Failed to create driver' },
      { status: 500 }
    );
  }
}