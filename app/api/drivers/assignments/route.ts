import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  drivers, 
  user, 
  driverAssignments, 
  driverAssignmentHistory, 
  orders 
} from '@/lib/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Simple geocoding function (in production, use a real geocoding service)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // This is a placeholder - in production, integrate with Google Maps API, OpenStreetMap, etc.
    // For now, return some default coordinates for major cities
    const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'abu dhabi': { lat: 24.4539, lng: 54.3773 },
      'sharjah': { lat: 25.3463, lng: 55.4209 },
      'ajman': { lat: 25.4052, lng: 55.5136 },
      'ras al khaimah': { lat: 25.7889, lng: 55.9598 },
      'fujairah': { lat: 25.1164, lng: 56.3269 },
      'umm al quwain': { lat: 25.5641, lng: 55.6550 },
    };

    const lowerAddress = address.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (lowerAddress.includes(city)) {
        return coords;
      }
    }

    // Default to Dubai coordinates if no match found
    return { lat: 25.2048, lng: 55.2708 };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      driverId, 
      assignedBy, 
      assignmentType = 'manual',
      priority = 'normal',
      deliveryNotes 
    } = body;

    if (!orderId || !assignedBy) {
      return NextResponse.json(
        { error: 'Order ID and assigned by are required' },
        { status: 400 }
      );
    }

    // Get order details
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    let selectedDriverId = driverId;
    let nearestDriver: any = null;

    // If no driver specified, find the nearest available driver
    if (!selectedDriverId && assignmentType === 'automatic') {
      const orderData = order[0];
      
      // Build delivery address
      const deliveryAddress = [
        orderData.shippingAddress1,
        orderData.shippingCity,
        orderData.shippingState,
        orderData.shippingCountry
      ].filter(Boolean).join(', ');

      // Get coordinates for delivery address
      const deliveryCoords = await geocodeAddress(deliveryAddress);
      
      if (!deliveryCoords) {
        return NextResponse.json(
          { error: 'Could not geocode delivery address' },
          { status: 400 }
        );
      }

      // Get available drivers with their base locations
      const availableDrivers = await db
        .select({
          driver: drivers,
          user: {
            name: user.name,
            phone: user.phone,
          }
        })
        .from(drivers)
        .innerJoin(user, eq(drivers.userId, user.id))
        .where(
          and(
            eq(drivers.status, 'available'),
            eq(drivers.isActive, true)
          )
        );

      if (availableDrivers.length === 0) {
        return NextResponse.json(
          { error: 'No available drivers found' },
          { status: 404 }
        );
      }

      // Calculate distances and find nearest driver
      let minDistance = Infinity;

      for (const driverData of availableDrivers) {
        const driver = driverData.driver;
        
        if (driver.baseLatitude && driver.baseLongitude) {
          const distance = calculateDistance(
            parseFloat(driver.baseLatitude.toString()),
            parseFloat(driver.baseLongitude.toString()),
            deliveryCoords.lat,
            deliveryCoords.lng
          );

          // Check if driver can cover this distance
          if (distance <= (driver.maxDeliveryRadius || 50) && distance < minDistance) {
            minDistance = distance;
            nearestDriver = {
              ...driverData,
              distance
            };
          }
        }
      }

      if (!nearestDriver) {
        return NextResponse.json(
          { error: 'No drivers available within delivery radius' },
          { status: 404 }
        );
      }

      selectedDriverId = nearestDriver.driver.id;
    }

    if (!selectedDriverId) {
      return NextResponse.json(
        { error: 'Driver ID is required for manual assignment' },
        { status: 400 }
      );
    }

    // Check if driver exists and is available
    const driver = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, selectedDriverId))
      .limit(1);

    if (driver.length === 0) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    if (assignmentType === 'manual' && driver[0].status !== 'available') {
      return NextResponse.json(
        { error: 'Driver is not available' },
        { status: 400 }
      );
    }

    // Check if order is already assigned to an active driver
    const existingAssignment = await db
      .select()
      .from(driverAssignments)
      .where(
        and(
          eq(driverAssignments.orderId, orderId),
          eq(driverAssignments.isActive, true)
        )
      )
      .limit(1);

    let previousDriverId = null;
    if (existingAssignment.length > 0) {
      // Deactivate existing assignment
      previousDriverId = existingAssignment[0].driverId;
      await db
        .update(driverAssignments)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(driverAssignments.id, existingAssignment[0].id));
    }

    // Create new assignment
    const assignmentId = uuidv4();
    await db.insert(driverAssignments).values({
      id: assignmentId,
      orderId,
      driverId: selectedDriverId,
      assignedBy,
      assignmentType,
      priority,
      deliveryStatus: 'assigned',
      deliveryNotes,
      estimatedDistance: assignmentType === 'automatic' && nearestDriver ? nearestDriver.distance : null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update order with assigned driver
    await db
      .update(orders)
      .set({
        assignedDriverId: selectedDriverId,
        deliveryStatus: 'assigned',
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));

    // Update driver status to busy
    await db
      .update(drivers)
      .set({
        status: 'busy',
        updatedAt: new Date()
      })
      .where(eq(drivers.id, selectedDriverId));

    // Create assignment history record
    const historyId = uuidv4();
    await db.insert(driverAssignmentHistory).values({
      id: historyId,
      orderId,
      assignmentId,
      previousDriverId,
      newDriverId: selectedDriverId,
      changeType: previousDriverId ? 'reassigned' : 'assigned',
      changeReason: previousDriverId ? 'Driver reassignment' : 'Initial assignment',
      changedBy: assignedBy,
      createdAt: new Date(),
    });

    return NextResponse.json({
      message: 'Driver assigned successfully',
      assignmentId,
      driverId: selectedDriverId,
      assignmentType
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating driver assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create driver assignment' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const driverId = searchParams.get('driverId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(driverAssignments.isActive, true)];
    
    if (orderId) {
      whereConditions.push(eq(driverAssignments.orderId, orderId));
    }

    if (driverId) {
      whereConditions.push(eq(driverAssignments.driverId, driverId));
    }

    if (status) {
      whereConditions.push(eq(driverAssignments.deliveryStatus, status));
    }

    // Get assignments with related data
    const assignments = await db
      .select({
        assignment: driverAssignments,
        driver: {
          id: drivers.id,
          licenseNumber: drivers.licenseNumber,
          vehicleType: drivers.vehicleType,
          vehiclePlateNumber: drivers.vehiclePlateNumber,
          status: drivers.status,
        },
        user: {
          name: user.name,
          phone: user.phone,
        },
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          email: orders.email,
          status: orders.status,
          totalAmount: orders.totalAmount,
          shippingAddress1: orders.shippingAddress1,
          shippingCity: orders.shippingCity,
          createdAt: orders.createdAt,
        }
      })
      .from(driverAssignments)
      .innerJoin(drivers, eq(driverAssignments.driverId, drivers.id))
      .innerJoin(user, eq(drivers.userId, user.id))
      .innerJoin(orders, eq(driverAssignments.orderId, orders.id))
      .where(and(...whereConditions))
      .orderBy(desc(driverAssignments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      assignments,
      pagination: {
        page,
        limit,
        total: assignments.length,
        pages: Math.ceil(assignments.length / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching driver assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver assignments' },
      { status: 500 }
    );
  }
}