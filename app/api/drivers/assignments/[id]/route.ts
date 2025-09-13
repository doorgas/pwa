import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  driverAssignments, 
  driverAssignmentHistory, 
  drivers,
  orders
} from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      deliveryStatus,
      deliveryNotes,
      deliveryProof,
      customerSignature,
      failureReason,
      updatedBy
    } = body;

    // Get existing assignment
    const existingAssignment = await db
      .select()
      .from(driverAssignments)
      .where(eq(driverAssignments.id, id))
      .limit(1);

    if (existingAssignment.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignment = existingAssignment[0];
    const updates: any = { updatedAt: new Date() };

    // Update delivery status and related timestamps
    if (deliveryStatus) {
      updates.deliveryStatus = deliveryStatus;

      const now = new Date();
      switch (deliveryStatus) {
        case 'picked_up':
          updates.pickedUpAt = now;
          break;
        case 'out_for_delivery':
          updates.outForDeliveryAt = now;
          break;
        case 'delivered':
          updates.deliveredAt = now;
          // Update driver status back to available
          await db
            .update(drivers)
            .set({ status: 'available', updatedAt: now })
            .where(eq(drivers.id, assignment.driverId));
          break;
        case 'failed':
          updates.failedAt = now;
          // Update driver status back to available
          await db
            .update(drivers)
            .set({ status: 'available', updatedAt: now })
            .where(eq(drivers.id, assignment.driverId));
          break;
      }
    }

    if (deliveryNotes) updates.deliveryNotes = deliveryNotes;
    if (deliveryProof) updates.deliveryProof = deliveryProof;
    if (customerSignature) updates.customerSignature = customerSignature;
    if (failureReason) updates.failureReason = failureReason;

    // Update assignment
    await db
      .update(driverAssignments)
      .set(updates)
      .where(eq(driverAssignments.id, id));

    // Update order delivery status if provided
    if (deliveryStatus) {
      await db
        .update(orders)
        .set({
          deliveryStatus,
          updatedAt: new Date()
        })
        .where(eq(orders.id, assignment.orderId));
    }

    // Create history record for status change
    if (deliveryStatus && updatedBy) {
      const historyId = uuidv4();
      await db.insert(driverAssignmentHistory).values({
        id: historyId,
        orderId: assignment.orderId,
        assignmentId: id,
        newDriverId: assignment.driverId,
        changeType: 'status_update',
        changeReason: `Status changed to ${deliveryStatus}`,
        changedBy: updatedBy,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ message: 'Assignment updated successfully' });

  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
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
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get('reason') || 'Assignment cancelled';
    const cancelledBy = searchParams.get('cancelledBy');

    if (!cancelledBy) {
      return NextResponse.json(
        { error: 'cancelledBy parameter is required' },
        { status: 400 }
      );
    }

    // Get existing assignment
    const existingAssignment = await db
      .select()
      .from(driverAssignments)
      .where(eq(driverAssignments.id, id))
      .limit(1);

    if (existingAssignment.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignment = existingAssignment[0];

    // Check if assignment can be cancelled (not delivered)
    if (assignment.deliveryStatus === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot cancel delivered assignment' },
        { status: 400 }
      );
    }

    // Deactivate assignment
    await db
      .update(driverAssignments)
      .set({
        isActive: false,
        deliveryStatus: 'failed',
        failureReason: reason,
        failedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(driverAssignments.id, id));

    // Update driver status back to available
    await db
      .update(drivers)
      .set({
        status: 'available',
        updatedAt: new Date()
      })
      .where(eq(drivers.id, assignment.driverId));

    // Update order to remove driver assignment
    await db
      .update(orders)
      .set({
        assignedDriverId: null,
        deliveryStatus: 'pending',
        updatedAt: new Date()
      })
      .where(eq(orders.id, assignment.orderId));

    // Create history record
    const historyId = uuidv4();
    await db.insert(driverAssignmentHistory).values({
      id: historyId,
      orderId: assignment.orderId,
      assignmentId: id,
      previousDriverId: assignment.driverId,
      changeType: 'unassigned',
      changeReason: reason,
      changedBy: cancelledBy,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'Assignment cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling assignment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel assignment' },
      { status: 500 }
    );
  }
}