import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminChatRoom from '@/components/chat/AdminChatRoom';

interface PageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function AdminChatRoomPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <AdminChatRoom 
      conversationId={resolvedParams.conversationId} 
      adminId={session.user.id} 
    />
  );
}