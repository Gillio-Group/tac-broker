'use client';

import { useAuth } from '@/components/providers/supabase-auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Header } from '@/components/dashboard/header';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { isAuthenticated } from '@/lib/auth-utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Client-side auth protection with local storage
  useEffect(() => {
    const checkAuth = () => {
      // Check session from context
      if (!isLoading && !session) {
        console.log('No session in context, checking localStorage...');
        
        // Check localStorage directly using utility
        if (!isAuthenticated()) {
          console.log('No session found in localStorage, redirecting to login');
          // Store the current path to redirect back after login
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        } else {
          console.log('Found session in localStorage, not redirecting');
        }
      }
    };
    
    checkAuth();
  }, [session, isLoading, router, pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show layout even without session from context (let useEffect handle redirect)
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <aside className="hidden w-64 flex-shrink-0 border-r md:block">
          <div className="flex h-full flex-col gap-2 p-4">
            <SidebarNav />
          </div>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
} 