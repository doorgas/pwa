import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, userLoyaltyPoints, loyaltyPointsHistory, settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('\n📊 === LOYALTY SYSTEM STATUS CHECK ===');

    // Check if loyalty is enabled
    const loyaltySettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'loyalty_enabled'));

    // Get test user
    const testEmail = 'test@example.com';
    const testUser = await db
      .select()
      .from(user)
      .where(eq(user.email, testEmail))
      .limit(1);

    let userPointsData = null;
    let historyData: any[] = [];

    if (testUser.length > 0) {
      const userId = testUser[0].id;
      
      // Get user points
      const userPoints = await db
        .select()
        .from(userLoyaltyPoints)
        .where(eq(userLoyaltyPoints.userId, userId))
        .limit(1);

      // Get history
      const history = await db
        .select()
        .from(loyaltyPointsHistory)
        .where(eq(loyaltyPointsHistory.userId, userId));

      userPointsData = userPoints[0] || null;
      historyData = history;
    }

    // Get all loyalty settings
    const allSettings = await db
      .select()
      .from(settings);
    
    const loyaltySettingsObj = allSettings
      .filter(s => s.key.startsWith('loyalty_') || s.key.startsWith('points_'))
      .reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

    const summary = {
      loyaltyEnabled: loyaltySettings[0]?.value === 'true',
      settings: loyaltySettingsObj,
      testUser: testUser[0] || null,
      userPoints: userPointsData,
      historyCount: historyData.length,
      history: historyData
    };

    console.log('Loyalty Status Summary:', summary);

    return NextResponse.json({
      success: true,
      summary: summary
    });

  } catch (error) {
    console.error('Error checking loyalty status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check loyalty status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}