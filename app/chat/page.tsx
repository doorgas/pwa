import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminChatManager from '@/components/chat/AdminChatManager';

export default async function AdminChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  return <AdminChatManager adminId={session.user.id} />;
}