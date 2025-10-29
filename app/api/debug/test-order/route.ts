import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, orders, orderItems, userLoyaltyPoints, loyaltyPointsHistory, settings } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

// Copy the loyalty points function from orders API
async function awardLoyaltyPoints(userId: string, orderId: string, orderAmount: number, subtotal: number, orderStatus: string) {
  console.log('=== AWARD POINTS FUNCTION ===');
  console.log('Parameters:', { userId, orderId, orderAmount, subtotal, orderStatus });

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

  // Get earning settings
  const [earningBasisSetting, earningRateSetting, minimumOrderSetting] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'points_earning_basis')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'points_earning_rate')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'points_minimum_order')).limit(1)
  ]);

  const earningBasis = earningBasisSetting[0]?.value || 'subtotal';
  const earningRate = parseFloat(earningRateSetting[0]?.value || '1');
  const minimumOrder = parseFloat(minimumOrderSetting[0]?.value || '0');

  // Calculate points based on settings
  const baseAmount = earningBasis === 'total' ? orderAmount : (subtotal || orderAmount);
  
  console.log(`Points calculation: baseAmount=${baseAmount}, minimumOrder=${minimumOrder}, earningRate=${earningRate}`);
  
  if (baseAmount < minimumOrder) {
    console.log('Order amount below minimum - no points awarded');
    return;
  }
  
  const pointsToAward = Math.floor(baseAmount * earningRate);

  if (pointsToAward <= 0) {
    console.log('No points to award - calculated points is 0');
    return;
  }

  // Determine if points should be pending or available based on order status
  const isCompleted = orderStatus === 'completed';
  const pointsStatus = isCompleted ? 'available' : 'pending';

  console.log(`Awarding ${pointsToAward} ${pointsStatus} points`);

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
      availablePoints: isCompleted ? pointsToAward : 0,
      pendingPoints: isCompleted ? 0 : pointsToAward,
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
        availablePoints: (current?.availablePoints || 0) + (isCompleted ? pointsToAward : 0),
        pendingPoints: (current?.pendingPoints || 0) + (isCompleted ? 0 : pointsToAward),
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
    status: pointsStatus,
    points: pointsToAward,
    pointsBalance: (existingPoints[0]?.availablePoints || 0) + (isCompleted ? pointsToAward : 0),
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

  console.log(`Successfully awarded ${pointsToAward} ${pointsStatus} points to user ${userId}`);
}

export async function POST() {
  try {
    console.log('\n🧪 === STARTING LOYALTY POINTS TEST ===');

    // First, create a test user if doesn't exist
    const testEmail = 'test@example.com';
    let testUser = await db
      .select()
      .from(user)
      .where(eq(user.email, testEmail))
      .limit(1);

    if (testUser.length === 0) {
      const userId = uuidv4();
      await db.insert(user).values({
        id: userId,
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        emailVerified: null,
        image: null,
        userType: 'customer',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Created test user:', userId);
      
      testUser = await db
        .select()
        .from(user)
        .where(eq(user.email, testEmail))
        .limit(1);
    } else {
      console.log('✅ Using existing test user:', testUser[0].id);
    }

    const userId = testUser[0].id;
    const orderId = uuidv4();
    const orderNumber = 'TEST-' + Date.now();

    // Test loyalty points directly
    console.log('\n🎯 Testing loyalty points function...');
    await awardLoyaltyPoints(userId, orderId, 115.00, 100.00, 'pending');

    // Check if points were created
    const userPoints = await db
      .select()
      .from(userLoyaltyPoints)
      .where(eq(userLoyaltyPoints.userId, userId))
      .limit(1);

    const pointsHistory = await db
      .select()
      .from(loyaltyPointsHistory)
      .where(eq(loyaltyPointsHistory.userId, userId));

    console.log('\n📊 === TEST RESULTS ===');
    console.log('User Points Record:', userPoints[0] || 'None');
    console.log('Points History Count:', pointsHistory.length);
    console.log('Latest History:', pointsHistory[pointsHistory.length - 1] || 'None');

    return NextResponse.json({
      success: true,
      message: 'Loyalty points test completed',
      results: {
        userId: userId,
        orderId: orderId,
        orderNumber: orderNumber,
        userPointsRecord: userPoints[0] || null,
        historyCount: pointsHistory.length,
        latestHistory: pointsHistory[pointsHistory.length - 1] || null
      }
    });

  } catch (error) {
    console.error('❌ Error in loyalty points test:', error);
    return NextResponse.json({
      success: false,
      error: 'Loyalty points test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}