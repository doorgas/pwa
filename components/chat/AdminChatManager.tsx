'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminChatList from './AdminChatList';
import AdminChatRoom from './AdminChatRoom';

interface AdminChatManagerProps {
  adminId: string;
}

const AdminChatManager: React.FC<AdminChatManagerProps> = ({ adminId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const orderId = searchParams.get('orderId');
  const customerId = searchParams.get('customerId');

  useEffect(() => {
    if (customerId) {
      handleInitiateChat();
    }
  }, [orderId, customerId]);

  const handleInitiateChat = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          orderId, // Can be null for general support
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation.id);
        router.replace(`/chat/${data.conversation.id}`);
      } else {
        console.error('Failed to create conversation');
        router.replace('/chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      router.replace('/chat');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Starting chat...</p>
        </div>
      </div>
    );
  }

  if (conversationId) {
    return <AdminChatRoom conversationId={conversationId} adminId={adminId} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white min-h-screen">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Customer Support Chat</h1>
          <p className="text-sm text-gray-500">Manage conversations with customers</p>
        </div>

        <AdminChatList />
      </div>
    </div>
  );
};

export default AdminChatManager;