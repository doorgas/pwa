'use client';

import { SessionProvider } from 'next-auth/react';
import ClientLayout from './ClientLayout';
import { CurrencyProvider } from '@/app/contexts/CurrencyContext';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <ClientLayout>{children}</ClientLayout>
      </CurrencyProvider>
    </SessionProvider>
  );
}
