import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { chatConversations, chatMessages, user, orders } from '@/lib/schema';
import { eq, and, or, desc, ne, count, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/chat/conversations called from admin');
    const session = await getServerSession(authOptions);
    console.log('Admin session:', (session?.user as any)?.id);
    
    if (!session?.user || !(session.user as any).id) {
      console.log('No admin session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    console.log('Querying support conversations for admin view');
    const conversations = await db
      .select({
        id: chatConversations.id,
        customerId: chatConversations.customerId,
        driverId: chatConversations.driverId,
        orderId: chatConversations.orderId,
        agoraChannelName: chatConversations.agoraChannelName,
        isActive: chatConversations.isActive,
        lastMessageAt: chatConversations.lastMessageAt,
        createdAt: chatConversations.createdAt,
      })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.isActive, true),
          // Include support conversations (null driverId) and admin conversations
          or(
            isNull(chatConversations.driverId),
            eq(chatConversations.driverId, adminId)
          )
        )
      )
      .orderBy(desc(chatConversations.lastMessageAt));
    
    console.log('Found conversations:', conversations.length);

    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        try {
          console.log('Processing conversation:', conversation.id);
          
          const lastMessage = await db
            .select({
              id: chatMessages.id,
              message: chatMessages.message,
              senderId: chatMessages.senderId,
              senderKind: chatMessages.senderKind,
              createdAt: chatMessages.createdAt,
            })
            .from(chatMessages)
            .where(eq(chatMessages.conversationId, conversation.id))
            .orderBy(desc(chatMessages.createdAt))
            .limit(1);

          const adminId = (session.user as any).id;
          const unreadResult = await db
            .select({
              count: count(chatMessages.id),
            })
            .from(chatMessages)
            .where(
              and(
                eq(chatMessages.conversationId, conversation.id),
                eq(chatMessages.senderKind, 'user'),
                eq(chatMessages.isRead, false)
              )
            );
          
          const unreadCount = unreadResult[0]?.count || 0;

          let customerName = null;
          let driverName = null;
          let orderNumber = null;
          
          let userType = 'customer';
          if (conversation.customerId) {
            try {
              const customer = await db
                .select({ name: user.name, userType: user.userType })
                .from(user)
                .where(eq(user.id, conversation.customerId))
                .limit(1);
              customerName = customer[0]?.name || 'Unknown Customer';
              userType = customer[0]?.userType || 'customer';
            } catch (error) {
              console.error('Error fetching customer:', error);
              customerName = 'Unknown Customer';
            }
          }
          
          if (conversation.driverId) {
            try {
              const driver = await db
                .select({ name: user.name })
                .from(user)
                .where(eq(user.id, conversation.driverId))
                .limit(1);
              driverName = driver[0]?.name || 'Unknown Driver';
            } catch (error) {
              console.error('Error fetching driver:', error);
              driverName = 'Unknown Driver';
            }
          } else {
            // Support conversation with null driverId
            driverName = 'Support Team';
          }

          if (conversation.orderId) {
            try {
              const order = await db
                .select({ orderNumber: orders.orderNumber })
                .from(orders)
                .where(eq(orders.id, conversation.orderId))
                .limit(1);
              orderNumber = order[0]?.orderNumber || null;
            } catch (error) {
              console.error('Error fetching order:', error);
              orderNumber = null;
            }
          }

          return {
            id: conversation.id || '',
            customerId: conversation.customerId || '',
            driverId: conversation.driverId || '',
            orderId: conversation.orderId || null,
            agoraChannelName: conversation.agoraChannelName || '',
            isActive: conversation.isActive || false,
            lastMessageAt: conversation.lastMessageAt || conversation.createdAt,
            createdAt: conversation.createdAt || new Date().toISOString(),
            customerName: customerName || 'Unknown Customer',
            driverName: driverName || 'Unknown Driver',
            customerEmail: null,
            driverEmail: null,
            userType: userType,
            lastMessage: lastMessage[0] ? {
              ...lastMessage[0],
              senderName: lastMessage[0].senderKind === 'support_bot' ? 'Support Team' : 
                         (userType === 'driver' ? 'Driver' : 'Customer')
            } : null,
            unreadCount: unreadCount,
            orderNumber: orderNumber,
          };
        } catch (error) {
          console.error('Error processing conversation:', conversation.id, error);
          return {
            id: conversation.id || '',
            customerId: conversation.customerId || '',
            driverId: conversation.driverId || '',
            orderId: conversation.orderId || null,
            agoraChannelName: conversation.agoraChannelName || '',
            isActive: conversation.isActive || false,
            lastMessageAt: conversation.lastMessageAt || conversation.createdAt,
            createdAt: conversation.createdAt || new Date().toISOString(),
            customerName: 'Unknown Customer',
            driverName: 'Unknown Driver',
            customerEmail: null,
            driverEmail: null,
            userType: 'customer',
            lastMessage: null,
            unreadCount: 0,
            orderNumber: null,
          };
        }
      })
    );

    console.log('Successfully returning conversations:', conversationsWithLastMessage.length);
    return NextResponse.json({ conversations: conversationsWithLastMessage });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, orderId } = await request.json();
    const adminUserId = (session.user as any).id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    const customerExists = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, customerId))
      .limit(1);

    if (customerExists.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log(`Looking for existing conversation for ${orderId ? `order: ${orderId}` : 'general support'}`);
    
    let whereCondition;
    if (orderId) {
      // Order-specific conversation
      whereCondition = and(
        eq(chatConversations.orderId, orderId),
        eq(chatConversations.isActive, true)
      );
    } else {
      // General support conversation
      whereCondition = and(
        isNull(chatConversations.orderId),
        eq(chatConversations.customerId, customerId),
        isNull(chatConversations.driverId),
        eq(chatConversations.isActive, true)
      );
    }
    
    const existingConversation = await db
      .select()
      .from(chatConversations)
      .where(whereCondition)
      .limit(1);

    if (existingConversation.length > 0) {
      console.log(`Found existing conversation: ${existingConversation[0].id}`);
      
      await db
        .update(chatConversations)
        .set({ 
          lastMessageAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(chatConversations.id, existingConversation[0].id));
      
      return NextResponse.json({ 
        conversation: {
          ...existingConversation[0],
          lastMessageAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`Creating new support conversation ${orderId ? `for order: ${orderId}` : '(general support)'} between customer: ${customerId} and admin: ${adminUserId}`);
    const conversationId = uuidv4();
    const agoraChannelName = `support_${conversationId.replace(/-/g, '_')}`;

    const newConversation = {
      id: conversationId,
      customerId: customerId,
      driverId: null, // Use null for support conversations
      orderId: orderId, // Can be null for general support
      agoraChannelName,
      isActive: true,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(chatConversations).values(newConversation);
    console.log(`Successfully created new support conversation: ${conversationId}`);

    return NextResponse.json({ conversation: newConversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}