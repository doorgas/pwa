import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userLoyaltyPoints, loyaltyPointsHistory } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete all loyalty points history for the user
    await db.delete(loyaltyPointsHistory).where(eq(loyaltyPointsHistory.userId, userId));
    
    // Reset user loyalty points to zero
    await db.delete(userLoyaltyPoints).where(eq(userLoyaltyPoints.userId, userId));

    return NextResponse.json({ 
      success: true, 
      message: 'All points history deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting points history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete points history' },
      { status: 500 }
    );
  }
}