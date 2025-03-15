'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { SupabaseAuthProvider } from '@/components/providers/supabase-auth-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create a client
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <SupabaseAuthProvider>
            {children}
            <Toaster />
          </SupabaseAuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
