import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatMessages, chatConversations, user } from '@/lib/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const afterMessageId = searchParams.get('afterMessageId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    let whereCondition = eq(chatMessages.conversationId, conversationId);
    
    if (afterMessageId) {
      const afterMessage = await db.select({ createdAt: chatMessages.createdAt })
        .from(chatMessages)
        .where(eq(chatMessages.id, afterMessageId))
        .limit(1);
      
      const afterTimestamp = afterMessage[0]?.createdAt || new Date();
      
      whereCondition = and(
        eq(chatMessages.conversationId, conversationId),
        gt(chatMessages.createdAt, afterTimestamp)
      )!;
    }

    const rawMessages = await db
      .select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderId: chatMessages.senderId,
        senderKind: chatMessages.senderKind,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        isRead: chatMessages.isRead,
        createdAt: chatMessages.createdAt,
        senderName: user.name,
        senderEmail: user.email,
      })
      .from(chatMessages)
      .leftJoin(user, eq(chatMessages.senderId, user.id))
      .where(whereCondition)
      .orderBy(chatMessages.createdAt)
      .limit(limit);

    // Handle different sender kinds
    const messages = rawMessages.map(msg => ({
      ...msg,
      senderName: msg.senderKind === 'support_bot' ? 'Support Team' : (msg.senderName || 'Unknown'),
      senderEmail: msg.senderKind === 'support_bot' ? 'support@company.com' : (msg.senderEmail || ''),
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message, messageType = 'text' } = await request.json();

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'conversationId and message are required' },
        { status: 400 }
      );
    }

    const messageId = uuidv4();
    const newMessage = {
      id: messageId,
      conversationId,
      senderId: null,
      senderKind: 'support_bot',
      message: message.trim(),
      messageType,
      isRead: false,
      createdAt: new Date(),
    };

    await db.insert(chatMessages).values(newMessage);

    await db
      .update(chatConversations)
      .set({ 
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(chatConversations.id, conversationId));

    // Return the message with admin user info
    const messageWithSender = {
      id: messageId,
      conversationId,
      senderId: null,
      senderKind: 'support_bot',
      message: message.trim(),
      messageType,
      isRead: false,
      createdAt: new Date(),
      senderName: 'Support Team',
      senderEmail: 'support@company.com',
    };

    return NextResponse.json({ message: messageWithSender });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}