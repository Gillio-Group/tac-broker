'use client';

import { useAuth } from '@/components/providers/supabase-auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Header } from '@/components/dashboard/header';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Client-side auth protection
  useEffect(() => {
    const checkAuth = async () => {
      // First check context session
      if (!session) {
        // Then check cookie-based session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (!supabaseSession) {
          console.log('No valid session found, redirecting to login');
          const currentPath = encodeURIComponent(pathname);
          router.replace(`/login?redirect=${currentPath}`);
          return;
        }
      }
      
      setIsCheckingAuth(false);
    };
    
    // Only run auth check after initial loading is complete
    if (!isLoading) {
      checkAuth();
    }
  }, [session, isLoading, router, pathname, supabase.auth]);

  // Show loading state while checking authentication
  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

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