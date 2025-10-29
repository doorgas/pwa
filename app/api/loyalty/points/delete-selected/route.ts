import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loyaltyPointsHistory, userLoyaltyPoints } from '@/lib/schema';
import { eq, inArray, and } from 'drizzle-orm';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, historyIds } = body;

    if (!userId || !historyIds || !Array.isArray(historyIds) || historyIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User ID and history IDs are required' },
        { status: 400 }
      );
    }

    // Get the points being deleted to recalculate user totals
    const deletingRecords = await db
      .select()
      .from(loyaltyPointsHistory)
      .where(
        and(
          eq(loyaltyPointsHistory.userId, userId),
          inArray(loyaltyPointsHistory.id, historyIds)
        )
      );

    if (deletingRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No records found to delete' },
        { status: 404 }
      );
    }

    // Calculate totals from deleted records
    let totalEarnedToSubtract = 0;
    let totalRedeemedToSubtract = 0;
    let availablePointsToSubtract = 0;

    deletingRecords.forEach(record => {
      if (record.transactionType === 'earned' && !record.isExpired) {
        totalEarnedToSubtract += record.points;
        if (record.status === 'available') {
          availablePointsToSubtract += record.points;
        }
      } else if (record.transactionType === 'redeemed') {
        totalRedeemedToSubtract += Math.abs(record.points);
        // Redeemed points reduce available points, so when we delete a redemption,
        // we need to add those points back
        availablePointsToSubtract -= Math.abs(record.points);
      }
    });

    // Delete the selected history records
    await db.delete(loyaltyPointsHistory).where(
      and(
        eq(loyaltyPointsHistory.userId, userId),
        inArray(loyaltyPointsHistory.id, historyIds)
      )
    );

    // Update user loyalty points totals
    const currentUserPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    if (currentUserPoints.length > 0) {
      const current = currentUserPoints[0];
      await db.update(userLoyaltyPoints)
        .set({
          totalPointsEarned: Math.max(0, (current.totalPointsEarned || 0) - totalEarnedToSubtract),
          totalPointsRedeemed: Math.max(0, (current.totalPointsRedeemed || 0) - totalRedeemedToSubtract),
          availablePoints: Math.max(0, (current.availablePoints || 0) - availablePointsToSubtract),
          updatedAt: new Date()
        })
        .where(eq(userLoyaltyPoints.userId, userId));
    }

    return NextResponse.json({ 
      success: true, 
      message: `${historyIds.length} points history record(s) deleted successfully`,
      deletedCount: historyIds.length
    });
  } catch (error) {
    console.error('Error deleting selected points history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete selected points history' },
      { status: 500 }
    );
  }
}