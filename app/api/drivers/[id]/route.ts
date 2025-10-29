import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drivers, user, driverAssignments, orders } from '@/lib/schema';
import { eq, and, or, count } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get driver with user details
    const driverData = await db
      .select({
        driver: drivers,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          city: user.city,
          address: user.address,
          state: user.state,
          postalCode: user.postalCode,
          country: user.country,
          createdAt: user.createdAt,
        }
      })
      .from(drivers)
      .innerJoin(user, eq(drivers.userId, user.id))
      .where(eq(drivers.id, id))
      .limit(1);

    if (driverData.length === 0) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Get comprehensive statistics using orders table only
    const driverInfo = driverData[0];
    
    // Get total orders assigned to this driver
    const totalAssignments = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.assignedDriverId, id));

    // Get active assignments (in progress)
    const activeAssignments = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.assignedDriverId, id),
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
          eq(orders.assignedDriverId, id),
          eq(orders.deliveryStatus, 'delivered')
        )
      );

    // Get failed deliveries
    const failedDeliveries = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.assignedDriverId, id),
          eq(orders.deliveryStatus, 'failed')
        )
      );

    const driverWithStats = {
      ...driverInfo,
      activeAssignments: activeAssignments[0]?.count || 0,
      totalAssignments: totalAssignments[0]?.count || 0,
      completedDeliveries: completedDeliveries[0]?.count || 0,
      failedDeliveries: failedDeliveries[0]?.count || 0,
      directOrderAssignments: 0, // Simplified: all assignments are in orders table now
      successRate: totalAssignments[0]?.count > 0 
        ? Math.round((completedDeliveries[0]?.count || 0) / totalAssignments[0]?.count * 100)
        : 0
    };

    return NextResponse.json(driverWithStats);

  } catch (error) {
    console.error('Error fetching driver:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      // User fields
      name,
      phone,
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
      currentLatitude,
      currentLongitude,
      maxDeliveryRadius,
      emergencyContact,
      emergencyContactName,
      status,
      isActive
    } = body;

    // Get existing driver
    const existingDriver = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, id))
      .limit(1);

    if (existingDriver.length === 0) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    const driverRecord = existingDriver[0];

    // Check if license number is being changed and if it already exists
    if (licenseNumber && licenseNumber !== driverRecord.licenseNumber) {
      const existingLicense = await db
        .select()
        .from(drivers)
        .where(and(
          eq(drivers.licenseNumber, licenseNumber),
          eq(drivers.id, id) // Exclude current driver
        ))
        .limit(1);

      if (existingLicense.length > 0) {
        return NextResponse.json(
          { error: 'License number already exists' },
          { status: 400 }
        );
      }
    }

    // Update user record
    if (name || phone || city || address || state || postalCode || country) {
      const userUpdates: any = { 
        updatedAt: new Date(),
        userType: 'driver' // Ensure userType remains as 'driver'
      };
      if (name) userUpdates.name = name;
      if (phone) userUpdates.phone = phone;
      if (city) userUpdates.city = city;
      if (address) userUpdates.address = address;
      if (state) userUpdates.state = state;
      if (postalCode) userUpdates.postalCode = postalCode;
      if (country) userUpdates.country = country;

      await db
        .update(user)
        .set(userUpdates)
        .where(eq(user.id, driverRecord.userId));
    }

    // Update driver record
    const driverUpdates: any = { updatedAt: new Date() };
    if (licenseNumber) driverUpdates.licenseNumber = licenseNumber;
    if (vehicleType) driverUpdates.vehicleType = vehicleType;
    if (vehicleMake) driverUpdates.vehicleMake = vehicleMake;
    if (vehicleModel) driverUpdates.vehicleModel = vehicleModel;
    if (vehicleYear) driverUpdates.vehicleYear = vehicleYear;
    if (vehiclePlateNumber) driverUpdates.vehiclePlateNumber = vehiclePlateNumber;
    if (vehicleColor) driverUpdates.vehicleColor = vehicleColor;
    if (baseLocation) driverUpdates.baseLocation = baseLocation;
    if (baseLatitude !== undefined) driverUpdates.baseLatitude = baseLatitude ? parseFloat(baseLatitude) : null;
    if (baseLongitude !== undefined) driverUpdates.baseLongitude = baseLongitude ? parseFloat(baseLongitude) : null;
    if (currentLatitude !== undefined) driverUpdates.currentLatitude = currentLatitude ? parseFloat(currentLatitude) : null;
    if (currentLongitude !== undefined) driverUpdates.currentLongitude = currentLongitude ? parseFloat(currentLongitude) : null;
    if (maxDeliveryRadius) driverUpdates.maxDeliveryRadius = maxDeliveryRadius;
    if (emergencyContact) driverUpdates.emergencyContact = emergencyContact;
    if (emergencyContactName) driverUpdates.emergencyContactName = emergencyContactName;
    if (status) driverUpdates.status = status;
    if (isActive !== undefined) driverUpdates.isActive = isActive;

    await db
      .update(drivers)
      .set(driverUpdates)
      .where(eq(drivers.id, id));

    return NextResponse.json({ message: 'Driver updated successfully' });

  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      { error: 'Failed to update driver' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if driver exists
    const existingDriver = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, id))
      .limit(1);

    if (existingDriver.length === 0) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Check if driver has active assignments
    const activeAssignments = await db
      .select()
      .from(driverAssignments)
      .where(
        and(
          eq(driverAssignments.driverId, id),
          eq(driverAssignments.isActive, true),
          or(
            eq(driverAssignments.deliveryStatus, 'assigned'),
            eq(driverAssignments.deliveryStatus, 'picked_up'),
            eq(driverAssignments.deliveryStatus, 'out_for_delivery')
          )
        )
      )
      .limit(1);

    if (activeAssignments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete driver with active assignments' },
        { status: 400 }
      );
    }

    const driverRecord = existingDriver[0];

    // Delete driver record (this will cascade to assignments via foreign key)
    await db.delete(drivers).where(eq(drivers.id, id));

    // Optionally delete the user record as well
    // Note: You might want to keep the user record for audit purposes
    // await db.delete(user).where(eq(user.id, driverRecord.userId));

    return NextResponse.json({ message: 'Driver deleted successfully' });

  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json(
      { error: 'Failed to delete driver' },
      { status: 500 }
    );
  }
}