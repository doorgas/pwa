import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userLoyaltyPoints, loyaltyPointsHistory, settings, orders } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Simple loyalty points API - rewritten from scratch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('=== SIMPLE LOYALTY POINTS API ===');
    console.log('Request:', JSON.stringify(body, null, 2));
    
    const { action, userId, orderId, orderAmount } = body;

    if (!action || !userId) {
      console.log('Missing required parameters');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing action or userId' 
      }, { status: 400 });
    }

    // Check if loyalty is enabled
    const loyaltyEnabled = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'loyalty_enabled'))
      .limit(1);

    if (loyaltyEnabled.length === 0 || loyaltyEnabled[0]?.value !== 'true') {
      console.log('Loyalty system is disabled');
      return NextResponse.json({ 
        success: false, 
        error: 'Loyalty system is disabled' 
      }, { status: 400 });
    }

    switch (action) {
      case 'award_points':
        return await awardPointsSimple(userId, orderId, orderAmount || 0);
      
      case 'award_pending_points':
        return await awardPendingPointsSimple(userId, orderId, orderAmount || 0);
      
      case 'activate_pending_points':
        return await activatePendingPointsSimple(userId, orderId);
      
      case 'get_points':
        return await getUserPointsSimple(userId);
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Loyalty points API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function awardPointsSimple(userId: string, orderId: string, orderAmount: number) {
  console.log(`=== AWARDING POINTS SIMPLE ===`);
  console.log(`userId: ${userId}, orderId: ${orderId}, orderAmount: ${orderAmount}`);
  
  // Simple calculation: 1 point per 1 currency unit
  const pointsToAward = Math.floor(orderAmount);
  
  if (pointsToAward <= 0) {
    console.log('No points to award');
    return NextResponse.json({ 
      success: true, 
      pointsAwarded: 0,
      message: 'No points awarded - order amount too low'
    });
  }

  console.log(`Points to award: ${pointsToAward}`);

  try {
    // Check if user already has a loyalty points record
    const existingPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    if (existingPoints.length === 0) {
      // Create new record
      console.log('Creating new loyalty points record');
      await db.insert(userLoyaltyPoints).values({
        id: uuidv4(),
        userId: userId,
        totalPointsEarned: pointsToAward,
        totalPointsRedeemed: 0,
        availablePoints: pointsToAward,
        pendingPoints: 0,
        pointsExpiringSoon: 0,
        lastEarnedAt: new Date(),
        lastRedeemedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created new loyalty points record');
    } else {
      // Update existing record
      console.log('Updating existing loyalty points record');
      const current = existingPoints[0];
      await db.update(userLoyaltyPoints)
        .set({
          totalPointsEarned: (current?.totalPointsEarned || 0) + pointsToAward,
          availablePoints: (current?.availablePoints || 0) + pointsToAward,
          lastEarnedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userLoyaltyPoints.userId, userId));
      console.log('Updated existing loyalty points record');
    }

    // Add history record
    console.log('Creating history record');
    await db.insert(loyaltyPointsHistory).values({
      id: uuidv4(),
      userId: userId,
      orderId: orderId,
      transactionType: 'earned',
      status: 'available',
      points: pointsToAward,
      pointsBalance: (existingPoints[0]?.availablePoints || 0) + pointsToAward,
      description: `Points earned from order ${orderId}`,
      orderAmount: orderAmount.toString(),
      discountAmount: null,
      expiresAt: null,
      isExpired: false,
      processedBy: null,
      metadata: null,
      createdAt: new Date()
    });
    console.log('Created history record');

    console.log(`Successfully awarded ${pointsToAward} points to user ${userId}`);
    
    return NextResponse.json({
      success: true,
      pointsAwarded: pointsToAward,
      message: `${pointsToAward} points awarded successfully`
    });

  } catch (dbError) {
    console.error('Database error in awardPointsSimple:', dbError);
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: dbError instanceof Error ? dbError.message : 'Unknown database error'
    }, { status: 500 });
  }
}

async function getUserPointsSimple(userId: string) {
  try {
    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    if (userPoints.length === 0) {
      return NextResponse.json({
        success: true,
        points: {
          availablePoints: 0,
          pendingPoints: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0
        }
      });
    }

    const points = userPoints[0];
    return NextResponse.json({
      success: true,
      points: {
        availablePoints: points?.availablePoints || 0,
        pendingPoints: points?.pendingPoints || 0,
        totalPointsEarned: points?.totalPointsEarned || 0,
        totalPointsRedeemed: points?.totalPointsRedeemed || 0
      }
    });

  } catch (error) {
    console.error('Error getting user points:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get user points'
    }, { status: 500 });
  }
}

async function awardPendingPointsSimple(userId: string, orderId: string, orderAmount: number) {
  console.log(`=== AWARDING PENDING POINTS SIMPLE ===`);
  console.log(`userId: ${userId}, orderId: ${orderId}, orderAmount: ${orderAmount}`);
  
  // Simple calculation: 1 point per 1 currency unit
  const pointsToAward = Math.floor(orderAmount);
  
  if (pointsToAward <= 0) {
    console.log('No points to award');
    return NextResponse.json({ 
      success: true, 
      pointsAwarded: 0,
      message: 'No points awarded - order amount too low'
    });
  }

  console.log(`Pending points to award: ${pointsToAward}`);

  try {
    // Check if user already has a loyalty points record
    const existingPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    if (existingPoints.length === 0) {
      // Create new record with pending points
      console.log('Creating new loyalty points record with pending points');
      await db.insert(userLoyaltyPoints).values({
        id: uuidv4(),
        userId: userId,
        totalPointsEarned: pointsToAward,
        totalPointsRedeemed: 0,
        availablePoints: 0, // Available = 0, points are pending
        pendingPoints: pointsToAward, // Pending points
        pointsExpiringSoon: 0,
        lastEarnedAt: new Date(),
        lastRedeemedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created new loyalty points record with pending points');
    } else {
      // Update existing record
      console.log('Updating existing loyalty points record with pending points');
      const current = existingPoints[0];
      await db.update(userLoyaltyPoints)
        .set({
          totalPointsEarned: (current?.totalPointsEarned || 0) + pointsToAward,
          pendingPoints: (current?.pendingPoints || 0) + pointsToAward,
          lastEarnedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userLoyaltyPoints.userId, userId));
      console.log('Updated existing loyalty points record with pending points');
    }

    // Add history record with pending status
    console.log('Creating pending history record');
    await db.insert(loyaltyPointsHistory).values({
      id: uuidv4(),
      userId: userId,
      orderId: orderId,
      transactionType: 'earned',
      status: 'pending', // Pending status
      points: pointsToAward,
      pointsBalance: existingPoints[0]?.availablePoints || 0, // Available balance unchanged
      description: `Pending points from order ${orderId}`,
      orderAmount: orderAmount.toString(),
      discountAmount: null,
      expiresAt: null,
      isExpired: false,
      processedBy: null,
      metadata: null,
      createdAt: new Date()
    });
    console.log('Created pending history record');

    console.log(`Successfully awarded ${pointsToAward} pending points to user ${userId}`);
    
    return NextResponse.json({
      success: true,
      pointsAwarded: pointsToAward,
      status: 'pending',
      message: `${pointsToAward} pending points awarded successfully`
    });

  } catch (dbError) {
    console.error('Database error in awardPendingPointsSimple:', dbError);
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: dbError instanceof Error ? dbError.message : 'Unknown database error'
    }, { status: 500 });
  }
}

async function activatePendingPointsSimple(userId: string, orderId: string) {
  console.log(`=== ACTIVATING PENDING POINTS SIMPLE ===`);
  console.log(`userId: ${userId}, orderId: ${orderId}`);

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
      return NextResponse.json({
        success: true,
        pointsActivated: 0,
        message: 'No pending points found for this order'
      });
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
    
    return NextResponse.json({
      success: true,
      pointsActivated: pointsToActivate,
      message: `${pointsToActivate} points activated successfully`
    });

  } catch (dbError) {
    console.error('Database error in activatePendingPointsSimple:', dbError);
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: dbError instanceof Error ? dbError.message : 'Unknown database error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ 
      success: false, 
      error: 'userId is required' 
    }, { status: 400 });
  }

  return await getUserPointsSimple(userId);
}