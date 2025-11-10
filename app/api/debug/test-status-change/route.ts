import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, userLoyaltyPoints, loyaltyPointsHistory, settings } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

// Copy the updateLoyaltyPointsStatus function
async function updateLoyaltyPointsStatus(userId: string, orderId: string, previousStatus: string, newStatus: string) {
  console.log('=== UPDATE POINTS STATUS FUNCTION ===');
  console.log('Parameters:', { userId, orderId, previousStatus, newStatus });

  // Check if loyalty is enabled
  const loyaltyEnabled = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'loyalty_enabled'))
    .limit(1);

  if (loyaltyEnabled.length === 0 || loyaltyEnabled[0]?.value !== 'true') {
    console.log('Loyalty system is disabled');
    return;
  }

  // Handle status change to completed - activate pending points
  if (newStatus === 'completed' && previousStatus !== 'completed') {
    console.log('Activating pending points for completed order');
    
    try {
      // Get pending points for this order
      const pendingHistory = await db
        .select()
        .from(loyaltyPointsHistory)
        .where(
          and(
            eq(loyaltyPointsHistory.userId, userId),
            eq(loyaltyPointsHistory.orderId, orderId),
            eq(loyaltyPointsHistory.status, 'pending'),
            eq(loyaltyPointsHistory.transactionType, 'earned')
          )
        );

      if (pendingHistory.length === 0) {
        console.log('No pending points found for this order');
        return;
      }

      const pointsToActivate = pendingHistory.reduce((sum, record) => sum + (record.points || 0), 0);
      console.log(`Points to activate: ${pointsToActivate}`);

      // Update user points - move from pending to available
      const userPoints = await db
        .select()
        .from(userLoyaltyPoints)
        .where(eq(userLoyaltyPoints.userId, userId))
        .limit(1);

      if (userPoints.length > 0) {
        const current = userPoints[0];
        await db.update(userLoyaltyPoints)
          .set({
            availablePoints: (current?.availablePoints || 0) + pointsToActivate,
            pendingPoints: Math.max(0, (current?.pendingPoints || 0) - pointsToActivate),
            updatedAt: new Date()
          })
          .where(eq(userLoyaltyPoints.userId, userId));
        console.log('Updated user points - moved from pending to available');
      }

      // Update history records to available status
      for (const record of pendingHistory) {
        await db.update(loyaltyPointsHistory)
          .set({
            status: 'available',
            pointsBalance: (userPoints[0]?.availablePoints || 0) + pointsToActivate
          })
          .where(eq(loyaltyPointsHistory.id, record.id));
      }
      console.log('Updated history records to available status');

      console.log(`Successfully activated ${pointsToActivate} points for user ${userId}`);

    } catch (dbError) {
      console.error('Database error in update points status:', dbError);
      throw dbError;
    }
  }

  // Handle other status changes (if needed in the future)
  console.log(`No action needed for status change from ${previousStatus} to ${newStatus}`);
}

export async function POST() {
  try {
    console.log('\n🧪 === STARTING STATUS CHANGE TEST ===');

    // Get the test user
    const testEmail = 'test@example.com';
    const testUser = await db
      .select()
      .from(user)
      .where(eq(user.email, testEmail))
      .limit(1);

    if (testUser.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Test user not found. Run /api/debug/test-order first.'
      }, { status: 400 });
    }

    const userId = testUser[0].id;

    // Get the latest pending points for this user
    const pendingHistory = await db
      .select()
      .from(loyaltyPointsHistory)
      .where(
        and(
          eq(loyaltyPointsHistory.userId, userId),
          eq(loyaltyPointsHistory.status, 'pending'),
          eq(loyaltyPointsHistory.transactionType, 'earned')
        )
      );

    if (pendingHistory.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No pending points found. Run /api/debug/test-order first.'
      }, { status: 400 });
    }

    const latestPendingOrder = pendingHistory[pendingHistory.length - 1];
    const orderId = latestPendingOrder.orderId;

    console.log(`\n🎯 Testing status change for order: ${orderId}`);
    console.log(`User: ${userId}`);

    // Get user points before
    const userPointsBefore = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    console.log('Before status change:', userPointsBefore[0]);

    // Test status change
    if (orderId) {
      await updateLoyaltyPointsStatus(userId, orderId, 'pending', 'completed');
    }

    // Get user points after
    const userPointsAfter = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    const historyAfter = await db
      .select()
      .from(loyaltyPointsHistory)
      .where(eq(loyaltyPointsHistory.userId, userId));

    console.log('\n📊 === TEST RESULTS ===');
    console.log('After status change:', userPointsAfter[0]);
    console.log('Total history records:', historyAfter.length);

    return NextResponse.json({
      success: true,
      message: 'Status change test completed',
      results: {
        userId: userId,
        orderId: orderId,
        userPointsBefore: userPointsBefore[0] || null,
        userPointsAfter: userPointsAfter[0] || null,
        totalHistoryRecords: historyAfter.length,
        pointsActivated: (userPointsAfter[0]?.availablePoints || 0) - (userPointsBefore[0]?.availablePoints || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error in status change test:', error);
    return NextResponse.json({
      success: false,
      error: 'Status change test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}