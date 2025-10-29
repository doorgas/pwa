import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const foundUser = await db.query.user.findFirst({
      where: eq(user.id, id),
    });

    if (!foundUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(foundUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, phone, email, notes, status } = await req.json();

    // If status is provided, validate it
    if (status !== undefined) {
      const validStatuses = ['pending', 'approved', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status. Must be pending, approved, or suspended' }, { status: 400 });
      }
    }

    // Validation: if this is a general user update (not just status), name is required
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Validation: if this is a general user update (not just status), either email or phone is required
    if ((name !== undefined || email !== undefined || phone !== undefined) && !email?.trim() && !phone?.trim()) {
      return NextResponse.json({ error: 'Either email or phone is required' }, { status: 400 });
    }
    
    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    // Check for existing users by email or phone (excluding current user)
    if (email) {
      const existingUserByEmail = await db.query.user.findFirst({
        where: (users, { eq, and, ne }) => and(
          eq(users.email, email),
          ne(users.id, id)
        )
      });
      if (existingUserByEmail) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
    }
    
    if (phone) {
      const existingUserByPhone = await db.query.user.findFirst({
        where: (users, { eq, and, ne }) => and(
          eq(users.phone, phone),
          ne(users.id, id)
        )
      });
      if (existingUserByPhone) {
        return NextResponse.json({ error: 'User with this phone number already exists' }, { status: 400 });
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }
    if (email !== undefined) {
      updateData.email = email?.trim() || null;
    }
    if (notes !== undefined) {
      updateData.note = notes?.trim() || null;
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    // Get the current user data before updating to check for status changes
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, id),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id));

    const updatedUser = await db.query.user.findFirst({
      where: eq(user.id, id),
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Send email if status changed and user has an email
    if (status !== undefined && status !== currentUser.status && updatedUser.email) {
      try {
        if (status === 'approved') {
          await sendApprovalEmail(updatedUser.email, updatedUser.name || undefined);
          console.log(`Approval email sent to ${updatedUser.email}`);
        } else if (status === 'pending' && currentUser.status === 'approved') {
          await sendRejectionEmail(updatedUser.email, updatedUser.name || undefined);
          console.log(`Status change email sent to ${updatedUser.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the entire request if email fails
        // The user status update was successful, email is just a bonus
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db
      .delete(user)
      .where(eq(user.id, id));

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 