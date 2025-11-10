import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, drivers } from '@/lib/schema';
import { eq, isNull } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting user type migration...');
    
    // Step 1: Get all users who have driver records
    const driversWithUsers = await db
      .select({
        userId: drivers.userId
      })
      .from(drivers);
    
    const driverUserIds = driversWithUsers.map(d => d.userId);
    console.log(`Found ${driverUserIds.length} driver user IDs`);
    
    // Step 2: Update users who are drivers to have userType = 'driver'
    if (driverUserIds.length > 0) {
      for (const userId of driverUserIds) {
        await db
          .update(user)
          .set({ userType: 'driver' })
          .where(eq(user.id, userId));
      }
      console.log(`Updated ${driverUserIds.length} users to have userType = 'driver'`);
    }
    
    // Step 3: Update all remaining users (those without userType or with null) to 'customer'
    const updatedCustomers = await db
      .update(user)
      .set({ userType: 'customer' })
      .where(isNull(user.userType));
    
    console.log('Updated remaining users to have userType = "customer"');
    
    // Step 4: Get final counts for verification
    const customerCount = await db
      .select()
      .from(user)
      .where(eq(user.userType, 'customer'));
    
    const driverCount = await db
      .select()
      .from(user)
      .where(eq(user.userType, 'driver'));
    
    const results = {
      message: 'User type migration completed successfully',
      summary: {
        totalDriversUpdated: driverUserIds.length,
        totalCustomers: customerCount.length,
        totalDriverUsers: driverCount.length,
      }
    };
    
    console.log('Migration completed:', results);
    
    return NextResponse.json(results, { status: 200 });
    
  } catch (error) {
    console.error('Error during user type migration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to migrate user types',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// GET endpoint to check current user type distribution
export async function GET() {
  try {
    const customerCount = await db
      .select()
      .from(user)
      .where(eq(user.userType, 'customer'));
    
    const driverCount = await db
      .select()
      .from(user)
      .where(eq(user.userType, 'driver'));
    
    const nullCount = await db
      .select()
      .from(user)
      .where(isNull(user.userType));
    
    const totalUsers = await db.select().from(user);
    
    return NextResponse.json({
      userTypeDistribution: {
        customers: customerCount.length,
        drivers: driverCount.length,
        nullOrUndefined: nullCount.length,
        total: totalUsers.length
      }
    });
    
  } catch (error) {
    console.error('Error checking user type distribution:', error);
    return NextResponse.json(
      { error: 'Failed to check user types' }, 
      { status: 500 }
    );
  }
}