import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, userLoyaltyPoints } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
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
    const { name, phone, email, notes } = await request.json();
    
    // Validation: name is required
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Validation: either email or phone is required
    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json({ error: 'Either email or phone is required' }, { status: 400 });
    }
    
    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    // Check for existing users by email or phone
    if (email) {
      const existingUserByEmail = await db.query.user.findFirst({
        where: eq(user.email, email)
      });
      if (existingUserByEmail) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
    }
    
    if (phone) {
      const existingUserByPhone = await db.query.user.findFirst({
        where: eq(user.phone, phone)
      });
      if (existingUserByPhone) {
        return NextResponse.json({ error: 'User with this phone number already exists' }, { status: 400 });
      }
    }
    
    const newUser = {
      id: uuidv4(),
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      note: notes?.trim() || null,
      userType: 'customer', // Set as customer by default
      status: 'pending', // Set default status
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(user).values(newUser);
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 