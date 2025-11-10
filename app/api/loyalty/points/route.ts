import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userLoyaltyPoints, loyaltyPointsHistory, user, orders, settings } from '@/lib/schema';
import { eq, and, or, desc, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Get loyalty settings
async function getLoyaltySettings() {
  const loyaltySettings = await db
    .select()
    .from(settings)
    .where(
      or(
        eq(settings.key, 'loyalty_enabled'),
        eq(settings.key, 'points_earning_rate'),
        eq(settings.key, 'points_earning_basis'),
        eq(settings.key, 'points_redemption_value'),
        eq(settings.key, 'points_expiry_months'),
        eq(settings.key, 'points_minimum_order'),
        eq(settings.key, 'points_max_redemption_percent'),
        eq(settings.key, 'points_redemption_minimum')
      )
    );

  const settingsObj: { [key: string]: any } = {};
  loyaltySettings.forEach(setting => {
    let value: any = setting.value;
    
    // Convert values based on the setting key
    if (setting.key === 'loyalty_enabled') {
      value = value === 'true';
    } else if (setting.key.includes('rate') || setting.key.includes('value') || setting.key.includes('minimum') || setting.key.includes('percent') || setting.key.includes('months')) {
      value = parseFloat(value) || 0;
    }
    
    settingsObj[setting.key] = value;
  });

  return {
    enabled: settingsObj.loyalty_enabled === true || settingsObj.loyalty_enabled === 'true',
    earningRate: Number(settingsObj.points_earning_rate) || 1,
    earningBasis: settingsObj.points_earning_basis || 'subtotal',
    redemptionValue: Number(settingsObj.points_redemption_value) || 0.01,
    expiryMonths: Number(settingsObj.points_expiry_months) || 12,
    minimumOrder: Number(settingsObj.points_minimum_order) || 0,
    maxRedemptionPercent: Number(settingsObj.points_max_redemption_percent) || 50,
    redemptionMinimum: Number(settingsObj.points_redemption_minimum) || 100
  };
}

// Award points for an order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, orderId, orderAmount, subtotalAmount, description, adminUserId } = body;
    
    console.log(`Loyalty API called with action: ${action}, userId: ${userId}, orderId: ${orderId}`);

    if (!action) {
      console.log('Loyalty API error: No action provided');
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    const loyaltySettings = await getLoyaltySettings();
    console.log(`Loyalty settings: enabled=${loyaltySettings.enabled}, earningRate=${loyaltySettings.earningRate}`);

    if (!loyaltySettings.enabled) {
      console.log('Loyalty API error: Loyalty system is disabled');
      return NextResponse.json(
        { success: false, error: 'Loyalty points system is disabled' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'award_pending_points':
        if (!userId || !orderId || orderAmount === undefined || subtotalAmount === undefined) {
          console.log('Missing parameters for award_pending_points:', { userId, orderId, orderAmount, subtotalAmount });
          return NextResponse.json(
            { success: false, error: 'Missing required parameters for award_pending_points' },
            { status: 400 }
          );
        }
        console.log('Calling awardPendingPoints function...');
        try {
          const result = await awardPendingPoints(userId, orderId, orderAmount, subtotalAmount, loyaltySettings, description);
          console.log('awardPendingPoints completed successfully');
          return result;
        } catch (error) {
          console.error('Error in awardPendingPoints:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to award pending points', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }
      
      case 'activate_pending_points':
        return await activatePendingPoints(userId, orderId, description);
      
      case 'award_points':
        // Legacy - still support direct awarding
        return await awardPoints(userId, orderId, orderAmount, subtotalAmount, loyaltySettings, description);
      
      case 'redeem_points':
        const { pointsToRedeem, discountAmount } = body;
        return await redeemPoints(userId, orderId, pointsToRedeem, discountAmount, loyaltySettings, description);
      
      case 'manual_adjustment':
        const { points, reason } = body;
        return await manualAdjustment(userId, points, reason, adminUserId);
      
      case 'expire_points':
        return await expirePoints();
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing loyalty points:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process loyalty points',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Award pending points when order is created
async function awardPendingPoints(
  userId: string, 
  orderId: string, 
  orderAmount: number, 
  subtotalAmount: number, 
  settings: any,
  description?: string
) {
  console.log('=== AWARD PENDING POINTS FUNCTION CALLED ===');
  console.log(`Parameters: userId=${userId}, orderId=${orderId}, orderAmount=${orderAmount}, subtotalAmount=${subtotalAmount}`);
  console.log(`Settings:`, JSON.stringify(settings, null, 2));
  
  // Calculate points based on settings
  const baseAmount = settings.earningBasis === 'total' ? orderAmount : subtotalAmount;
  console.log(`Base amount for points calculation: ${baseAmount} (basis: ${settings.earningBasis})`);
  
  if (baseAmount < settings.minimumOrder) {
    console.log(`Order amount ${baseAmount} is below minimum ${settings.minimumOrder}`);
    return NextResponse.json({
      success: false,
      error: `Order amount must be at least ${settings.minimumOrder} to earn points`
    });
  }

  const pointsToAward = Math.floor(baseAmount * settings.earningRate);
  console.log(`Pending points to award: ${pointsToAward} (rate: ${settings.earningRate})`);
  
  if (pointsToAward <= 0) {
    console.log('No points to award - calculated points is 0 or negative');
    return NextResponse.json({
      success: false,
      error: 'No points to award for this order'
    });
  }

  // Calculate expiry date
  let expiresAt = null;
  if (settings.expiryMonths > 0) {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + settings.expiryMonths);
  }

  // Get or create user loyalty points record
  console.log('Fetching user loyalty points record...');
  let userPoints;
  try {
    userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);
  } catch (dbError) {
    console.error('Database error fetching user loyalty points:', dbError);
    return NextResponse.json({
      success: false,
      error: 'Database error fetching user points',
      details: dbError instanceof Error ? dbError.message : 'Unknown database error'
    }, { status: 500 });
  }
  
  console.log(`Found ${userPoints.length} existing user points records`);

  if (userPoints.length === 0) {
    console.log('Creating new user loyalty points record...');
    // Create new user loyalty points record
    const newRecord = {
      id: uuidv4(),
      userId,
      totalPointsEarned: pointsToAward,
      totalPointsRedeemed: 0,
      availablePoints: 0, // Still 0 - points are pending
      pendingPoints: pointsToAward, // New pending points
      pointsExpiringSoon: 0,
      lastEarnedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log('New record data:', JSON.stringify(newRecord, null, 2));
    
    try {
      await db.insert(userLoyaltyPoints).values(newRecord);
      console.log('Successfully created new user loyalty points record');
    } catch (insertError) {
      console.error('Database error creating user loyalty points record:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Database error creating user points record',
        details: insertError instanceof Error ? insertError.message : 'Unknown insert error'
      }, { status: 500 });
    }
  } else {
    console.log('Updating existing user loyalty points record...');
    // Update existing record
    const currentRecord = userPoints[0]!;
    console.log('Current record:', JSON.stringify(currentRecord, null, 2));
    
    const updateData = {
      totalPointsEarned: (currentRecord.totalPointsEarned || 0) + pointsToAward,
      pendingPoints: (currentRecord.pendingPoints || 0) + pointsToAward,
      lastEarnedAt: new Date(),
      updatedAt: new Date()
    };
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    try {
      await db.update(userLoyaltyPoints)
        .set(updateData)
        .where(eq(userLoyaltyPoints.userId, userId));
      console.log('Successfully updated user loyalty points record');
    } catch (updateError) {
      console.error('Database error updating user loyalty points record:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Database error updating user points record',
        details: updateError instanceof Error ? updateError.message : 'Unknown update error'
      }, { status: 500 });
    }
  }

  // Add history record with pending status
  console.log('Creating loyalty points history record...');
  const historyRecord = {
    id: uuidv4(),
    userId,
    orderId,
    transactionType: 'earned',
    status: 'pending', // Key difference - points are pending
    points: pointsToAward,
    pointsBalance: (userPoints[0]?.availablePoints || 0), // Available balance unchanged
    description: description || `Pending points from order #${orderId}`,
    orderAmount: orderAmount.toString(),
    expiresAt,
    isExpired: false,
    metadata: {
      earningRate: settings.earningRate,
      earningBasis: settings.earningBasis,
      baseAmount
    },
    createdAt: new Date()
  };
  console.log('History record data:', JSON.stringify(historyRecord, null, 2));
  
  try {
    await db.insert(loyaltyPointsHistory).values(historyRecord);
    console.log('Successfully created loyalty points history record');
  } catch (historyError) {
    console.error('Database error creating loyalty points history record:', historyError);
    return NextResponse.json({
      success: false,
      error: 'Database error creating points history record',
      details: historyError instanceof Error ? historyError.message : 'Unknown history error'
    }, { status: 500 });
  }

  console.log(`Successfully awarded ${pointsToAward} pending points to user ${userId}`);

  return NextResponse.json({
    success: true,
    pointsAwarded: pointsToAward,
    status: 'pending',
    message: `${pointsToAward} points awarded (pending delivery)`
  });
}

// Activate pending points when order is delivered
async function activatePendingPoints(
  userId: string,
  orderId: string,
  description?: string
) {
  console.log(`activatePendingPoints called: userId=${userId}, orderId=${orderId}`);

  // Find pending points for this order
  const pendingPoints = await db
    .select()
    .from(loyaltyPointsHistory)
    .where(
      and(
        eq(loyaltyPointsHistory.userId, userId),
        eq(loyaltyPointsHistory.orderId, orderId),
        eq(loyaltyPointsHistory.transactionType, 'earned'),
        eq(loyaltyPointsHistory.status, 'pending')
      )
    );

  if (pendingPoints.length === 0) {
    console.log('No pending points found for this order');
    return NextResponse.json({
      success: false,
      error: 'No pending points found for this order'
    });
  }

  const totalPendingPoints = pendingPoints.reduce((sum, record) => sum + record.points, 0);
  console.log(`Activating ${totalPendingPoints} pending points`);

  // Update user loyalty points
  const userPoints = await db
    .select()
    .from(userLoyaltyPoints)
    .where(eq(userLoyaltyPoints.userId, userId))
    .limit(1);

  if (userPoints.length === 0) {
    console.log('User loyalty points record not found');
    return NextResponse.json({
      success: false,
      error: 'User loyalty points record not found'
    });
  }

  const currentRecord = userPoints[0]!;
  const newAvailableBalance = (currentRecord.availablePoints || 0) + totalPendingPoints;

  // Update user points - move from pending to available
  await db.update(userLoyaltyPoints)
    .set({
      availablePoints: newAvailableBalance,
      pendingPoints: Math.max(0, (currentRecord.pendingPoints || 0) - totalPendingPoints),
      updatedAt: new Date()
    })
    .where(eq(userLoyaltyPoints.userId, userId));

  // Update history records from pending to available
  for (const record of pendingPoints) {
    await db.update(loyaltyPointsHistory)
      .set({
        status: 'available',
        pointsBalance: newAvailableBalance,
        description: description || `Points activated from delivered order #${orderId}`
      })
      .where(eq(loyaltyPointsHistory.id, record.id));
  }

  console.log(`Successfully activated ${totalPendingPoints} points for user ${userId}`);

  return NextResponse.json({
    success: true,
    pointsActivated: totalPendingPoints,
    newAvailableBalance,
    message: `${totalPendingPoints} points are now available`
  });
}

// Award points for order delivery (legacy function)
async function awardPoints(
  userId: string, 
  orderId: string, 
  orderAmount: number, 
  subtotalAmount: number, 
  settings: any,
  description?: string
) {
  console.log(`awardPoints called: userId=${userId}, orderId=${orderId}, orderAmount=${orderAmount}, subtotalAmount=${subtotalAmount}`);
  
  // Calculate points based on settings
  const baseAmount = settings.earningBasis === 'total' ? orderAmount : subtotalAmount;
  console.log(`Base amount for points calculation: ${baseAmount} (basis: ${settings.earningBasis})`);
  
  if (baseAmount < settings.minimumOrder) {
    console.log(`Order amount ${baseAmount} is below minimum ${settings.minimumOrder}`);
    return NextResponse.json({
      success: false,
      error: `Order amount must be at least ${settings.minimumOrder} to earn points`
    });
  }

  const pointsToAward = Math.floor(baseAmount * settings.earningRate);
  console.log(`Points to award: ${pointsToAward} (rate: ${settings.earningRate})`);
  
  if (pointsToAward <= 0) {
    console.log('No points to award - calculated points is 0 or negative');
    return NextResponse.json({
      success: false,
      error: 'No points to award for this order'
    });
  }

  // Calculate expiry date
  let expiresAt = null;
  if (settings.expiryMonths > 0) {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + settings.expiryMonths);
  }

  // Get or create user loyalty points record
  let userPoints = await db
    .select()
    .from(userLoyaltyPoints)
    .where(eq(userLoyaltyPoints.userId, userId))
    .limit(1);

  const newBalance = (userPoints[0]?.availablePoints || 0) + pointsToAward;

  if (userPoints.length === 0) {
    // Create new record
    await db.insert(userLoyaltyPoints).values({
      id: uuidv4(),
      userId,
      totalPointsEarned: pointsToAward,
      totalPointsRedeemed: 0,
      availablePoints: pointsToAward,
      pointsExpiringSoon: 0,
      lastEarnedAt: new Date(),
    });
  } else {
    // Update existing record
    await db.update(userLoyaltyPoints)
      .set({
        totalPointsEarned: (userPoints[0]?.totalPointsEarned || 0) + pointsToAward,
        availablePoints: newBalance,
        lastEarnedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userLoyaltyPoints.userId, userId));
  }

  // Add history record
  await db.insert(loyaltyPointsHistory).values({
    id: uuidv4(),
    userId,
    orderId,
    transactionType: 'earned',
    status: 'available',
    points: pointsToAward,
    pointsBalance: newBalance,
    description: description || `Earned from order #${orderId}`,
    orderAmount: baseAmount.toString(),
    discountAmount: null,
    expiresAt,
    isExpired: false,
    processedBy: null,
    metadata: {
      earningRate: settings.earningRate,
      earningBasis: settings.earningBasis,
      orderAmount,
      subtotalAmount
    },
    createdAt: new Date()
  });

  return NextResponse.json({
    success: true,
    message: `Awarded ${pointsToAward} points`,
    pointsAwarded: pointsToAward,
    newBalance: newBalance,
    expiresAt
  });
}

// Redeem points at checkout
async function redeemPoints(
  userId: string,
  orderId: string,
  pointsToRedeem: number,
  discountAmount: number,
  settings: any,
  description?: string
) {
  // Get user's available points
  const userPoints = await db
    .select()
    .from(userLoyaltyPoints)
    .where(eq(userLoyaltyPoints.userId, userId))
    .limit(1);

  if (userPoints.length === 0 || (userPoints[0]?.availablePoints || 0) < pointsToRedeem) {
    return NextResponse.json({
      success: false,
      error: 'Insufficient points available'
    });
  }

  if (pointsToRedeem < settings.redemptionMinimum) {
    return NextResponse.json({
      success: false,
      error: `Minimum ${settings.redemptionMinimum} points required for redemption`
    });
  }

  const newBalance = (userPoints[0]?.availablePoints || 0) - pointsToRedeem;

  // Update user points
  await db.update(userLoyaltyPoints)
    .set({
      totalPointsRedeemed: (userPoints[0]?.totalPointsRedeemed || 0) + pointsToRedeem,
      availablePoints: newBalance,
      lastRedeemedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(userLoyaltyPoints.userId, userId));

  // Add history record
  await db.insert(loyaltyPointsHistory).values({
    id: uuidv4(),
    userId,
    orderId,
    transactionType: 'redeemed',
    status: 'available',
    points: -pointsToRedeem, // negative for redeemed
    pointsBalance: newBalance,
    description: description || `Redeemed at checkout`,
    orderAmount: null,
    discountAmount: discountAmount.toString(),
    expiresAt: null,
    isExpired: false,
    processedBy: null,
    metadata: {
      redemptionValue: settings.redemptionValue,
      pointsToRedeem,
      discountAmount
    },
    createdAt: new Date()
  });

  return NextResponse.json({
    success: true,
    message: `Redeemed ${pointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
    pointsRedeemed: pointsToRedeem,
    discountAmount,
    newBalance
  });
}

// Manual adjustment by admin
async function manualAdjustment(
  userId: string,
  points: number,
  reason: string,
  adminUserId: string
) {
  if (!adminUserId) {
    return NextResponse.json({
      success: false,
      error: 'Admin user ID required for manual adjustments'
    });
  }

  // Get or create user loyalty points record
  let userPoints = await db
    .select()
    .from(userLoyaltyPoints)
    .where(eq(userLoyaltyPoints.userId, userId))
    .limit(1);

  const currentBalance = userPoints[0]?.availablePoints || 0;
  const newBalance = Math.max(0, currentBalance + points); // Don't allow negative balance

  if (userPoints.length === 0) {
    // Create new record
    await db.insert(userLoyaltyPoints).values({
      id: uuidv4(),
      userId,
      totalPointsEarned: Math.max(0, points),
      totalPointsRedeemed: Math.max(0, -points),
      availablePoints: newBalance,
      pointsExpiringSoon: 0,
      lastEarnedAt: points > 0 ? new Date() : null,
      lastRedeemedAt: points < 0 ? new Date() : null,
    });
  } else {
    // Update existing record
    const updates: any = {
      availablePoints: newBalance,
      updatedAt: new Date()
    };

    if (points > 0) {
      updates.totalPointsEarned = (userPoints[0]?.totalPointsEarned || 0) + points;
      updates.lastEarnedAt = new Date();
    } else if (points < 0) {
      updates.totalPointsRedeemed = (userPoints[0]?.totalPointsRedeemed || 0) + Math.abs(points);
      updates.lastRedeemedAt = new Date();
    }

    await db.update(userLoyaltyPoints)
      .set(updates)
      .where(eq(userLoyaltyPoints.userId, userId));
  }

  // Add history record
  await db.insert(loyaltyPointsHistory).values({
    id: uuidv4(),
    userId,
    orderId: null,
    transactionType: 'manual_adjustment',
    status: 'available',
    points,
    pointsBalance: newBalance,
    description: reason,
    orderAmount: null,
    discountAmount: null,
    expiresAt: null,
    isExpired: false,
    processedBy: adminUserId,
    metadata: {
      adjustmentType: points > 0 ? 'credit' : 'debit',
      previousBalance: currentBalance
    },
    createdAt: new Date()
  });

  return NextResponse.json({
    success: true,
    message: `Manual adjustment of ${points} points completed`,
    pointsAdjusted: points,
    newBalance
  });
}

// Expire old points (called by cron job or manually)
async function expirePoints() {
  const now = new Date();
  
  // Find points that should expire
  const expiredPointsHistory = await db
    .select()
    .from(loyaltyPointsHistory)
    .where(
      and(
        eq(loyaltyPointsHistory.transactionType, 'earned'),
        lte(loyaltyPointsHistory.expiresAt, now),
        eq(loyaltyPointsHistory.isExpired, false)
      )
    );

  const expirationPromises = [];
  const userUpdates: { [userId: string]: number } = {};

  for (const historyRecord of expiredPointsHistory) {
    // Mark as expired
    expirationPromises.push(
      db.update(loyaltyPointsHistory)
        .set({ isExpired: true })
        .where(eq(loyaltyPointsHistory.id, historyRecord.id))
    );

    // Track points to deduct per user
    if (!userUpdates[historyRecord.userId]) {
      userUpdates[historyRecord.userId] = 0;
    }
    userUpdates[historyRecord.userId] += historyRecord.points;

    // Add expiration history record
    expirationPromises.push(
      db.insert(loyaltyPointsHistory).values({
        id: uuidv4(),
        userId: historyRecord.userId,
        orderId: null,
        transactionType: 'expired',
        status: 'expired',
        points: -historyRecord.points,
        pointsBalance: 0, // Will be updated after calculating new balance
        description: `Points expired from ${historyRecord.createdAt?.toDateString() || 'unknown date'}`,
        orderAmount: null,
        discountAmount: null,
        expiresAt: null,
        isExpired: true,
        processedBy: null,
        metadata: {
          originalEarnedDate: historyRecord.createdAt,
          originalOrderId: historyRecord.orderId
        },
        createdAt: new Date()
      })
    );
  }

  // Update user balances
  for (const [userId, expiredPoints] of Object.entries(userUpdates)) {
    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    if (userPoints.length > 0) {
      const newBalance = Math.max(0, (userPoints[0]?.availablePoints || 0) - expiredPoints);
      
      expirationPromises.push(
        db.update(userLoyaltyPoints)
          .set({
            availablePoints: newBalance,
            updatedAt: new Date()
          })
          .where(eq(userLoyaltyPoints.userId, userId))
      );

      // Update the balance in the expiration history record
      expirationPromises.push(
        db.update(loyaltyPointsHistory)
          .set({ pointsBalance: newBalance })
          .where(
            and(
              eq(loyaltyPointsHistory.userId, userId),
              eq(loyaltyPointsHistory.transactionType, 'expired'),
              eq(loyaltyPointsHistory.pointsBalance, 0) // Find the record we just created
            )
          )
      );
    }
  }

  await Promise.all(expirationPromises);

  return NextResponse.json({
    success: true,
    message: `Expired ${expiredPointsHistory.length} point records`,
    expiredRecords: expiredPointsHistory.length,
    affectedUsers: Object.keys(userUpdates).length
  });
}

// Get user points and history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (action === 'expire_points') {
      return await expirePoints();
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user points
    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    // Get points history
    const history = await db
      .select()
      .from(loyaltyPointsHistory)
      .where(eq(loyaltyPointsHistory.userId, userId))
      .orderBy(desc(loyaltyPointsHistory.createdAt))
      .limit(50);

    // Calculate points expiring soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const pointsExpiringSoon = await db
      .select()
      .from(loyaltyPointsHistory)
      .where(
        and(
          eq(loyaltyPointsHistory.userId, userId),
          eq(loyaltyPointsHistory.transactionType, 'earned'),
          eq(loyaltyPointsHistory.isExpired, false),
          lte(loyaltyPointsHistory.expiresAt, thirtyDaysFromNow),
          gte(loyaltyPointsHistory.expiresAt, new Date())
        )
      );

    const expiringSoonTotal = pointsExpiringSoon.reduce((sum, record) => sum + record.points, 0);

    // Update points expiring soon if different
    if (userPoints.length > 0 && userPoints[0].pointsExpiringSoon !== expiringSoonTotal) {
      await db.update(userLoyaltyPoints)
        .set({ 
          pointsExpiringSoon: expiringSoonTotal,
          updatedAt: new Date()
        })
        .where(eq(userLoyaltyPoints.userId, userId));
    }

    // Calculate total money saved from points redemptions
    const totalMoneySaved = await db
      .select({
        totalSaved: sql<number>`SUM(CAST(${loyaltyPointsHistory.discountAmount} AS DECIMAL(10,2)))`
      })
      .from(loyaltyPointsHistory)
      .where(
        and(
          eq(loyaltyPointsHistory.userId, userId),
          eq(loyaltyPointsHistory.transactionType, 'redeemed'),
          sql`${loyaltyPointsHistory.discountAmount} > 0`
        )
      );

    const totalMoneySavedAmount = totalMoneySaved[0]?.totalSaved || 0;

    return NextResponse.json({
      success: true,
      points: userPoints[0] || {
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        availablePoints: 0,
        pointsExpiringSoon: expiringSoonTotal
      },
      totalMoneySaved: totalMoneySavedAmount,
      history,
      expiringSoon: pointsExpiringSoon
    });

  } catch (error) {
    console.error('Error fetching loyalty points:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch loyalty points',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}