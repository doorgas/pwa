import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, userLoyaltyPoints } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { ne, or, isNull, eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Only fetch users that are not drivers (customer type or null for existing users)
    const allUsers = await db
      .select({
        user: user,
        loyaltyPoints: userLoyaltyPoints
      })
      .from(user)
      .leftJoin(userLoyaltyPoints, eq(user.id, userLoyaltyPoints.userId))
      .where(
        or(
          ne(user.userType, 'driver'),
          isNull(user.userType)
        )
      );

    // Transform the data to match the expected format
            const usersWithPoints = allUsers.map(record => ({
          ...record.user,
          loyaltyPoints: record.loyaltyPoints ? {
            availablePoints: record.loyaltyPoints.availablePoints,
            pendingPoints: record.loyaltyPoints.pendingPoints,
            totalPointsEarned: record.loyaltyPoints.totalPointsEarned,
            totalPointsRedeemed: record.loyaltyPoints.totalPointsRedeemed,
            pointsExpiringSoon: record.loyaltyPoints.pointsExpiringSoon
          } : {
            availablePoints: 0,
            pendingPoints: 0,
            totalPointsEarned: 0,
            totalPointsRedeemed: 0,
            pointsExpiringSoon: 0
          }
        }));

    return NextResponse.json(usersWithPoints);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      userType: 'customer', // Set as customer by default
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(user).values(newUser);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 