'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, User, HeadphonesIcon } from 'lucide-react';

interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderKind: string;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  senderName: string;
  senderEmail: string;
}

interface AdminChatRoomProps {
  conversationId: string;
  adminId: string;
}

const AdminChatRoom: React.FC<AdminChatRoomProps> = ({ conversationId, adminId }) => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [userType, setUserType] = useState('customer');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      markMessagesAsRead();
    }
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    }
  }, [loading]);

  useEffect(() => {
    if (!conversationId || loading) return;

    const pollForMessages = async () => {
      try {
        const url = lastMessageId 
          ? `/api/chat/messages?conversationId=${conversationId}&afterMessageId=${lastMessageId}&limit=50`
          : `/api/chat/messages?conversationId=${conversationId}&limit=50`;
          
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          const newMessages = data.messages || [];
          
          if (newMessages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(msg => msg.id));
              const uniqueNewMessages = newMessages.filter((msg: any) => !existingIds.has(msg.id));
              return [...prev, ...uniqueNewMessages];
            });
            
            const latestMessageId = newMessages[newMessages.length - 1]?.id;
            setLastMessageId(latestMessageId);
          }
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    };

    const initialTimer = setTimeout(pollForMessages, 2000);
    const interval = setInterval(pollForMessages, 3000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [conversationId, loading, lastMessageId]);

  const markMessagesAsRead = async () => {
    try {
      await fetch('/api/chat/messages/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
        }),
      });
      
      localStorage.setItem(`chat_read_${conversationId}`, Date.now().toString());
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const messagesResponse = await fetch(
        `/api/chat/messages?conversationId=${conversationId}`
      );
      
      if (!messagesResponse.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messagesData = await messagesResponse.json();
      const fetchedMessages = messagesData.messages || [];
      setMessages(fetchedMessages);
      
      if (fetchedMessages.length > 0) {
        setLastMessageId(fetchedMessages[fetchedMessages.length - 1].id);
      }

      const conversationsResponse = await fetch('/api/chat/conversations');
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        const conversation = conversationsData.conversations?.find(
          (conv: any) => conv.id === conversationId
        );
        
        if (conversation) {
          setCustomerName(conversation.customerName);
          setOrderNumber(conversation.orderNumber || '');
          setUserType(conversation.userType || 'customer');
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: newMessage.trim(),
          messageType: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, data.message]);
      setLastMessageId(data.message.id);
      setNewMessage('');
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-xs">
                    <div className="h-10 bg-gray-300 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {customerName || (userType === 'driver' ? 'Driver Support' : 'Customer Support')}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">
                {userType === 'driver' ? 'Driver Support Chat' : 'Customer Support Chat'}
              </p>
              {orderNumber && (
                <>
                  <span className="text-gray-300">•</span>
                  <p className="text-sm font-semibold text-blue-600">Order #{orderNumber}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <HeadphonesIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderKind === 'support_bot' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderKind === 'support_bot'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.senderKind === 'support_bot'
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a support message..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminChatRoom;