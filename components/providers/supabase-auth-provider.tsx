'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getSessionFromLocalStorage, saveSessionToLocalStorage, clearSessionFromLocalStorage, isValidSession } from '@/lib/auth-utils';

interface SupabaseContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...');
        
        // First try to get session from localStorage
        const storedSession = getSessionFromLocalStorage();
        
        if (storedSession && isValidSession(storedSession)) {
          console.log('Found valid session in localStorage');
          
          // Set the session in Supabase client
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token,
          });

          if (sessionError) {
            console.error('Error setting stored session:', sessionError);
            clearSessionFromLocalStorage();
          } else if (mounted) {
            setSession(storedSession);
            setUser(storedSession.user);
          }
        }
        
        // Then get the current session from Supabase
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting current session:', sessionError);
          return;
        }

        if (currentSession && mounted) {
          console.log('Got current session from Supabase');
          setSession(currentSession);
          setUser(currentSession.user);
          saveSessionToLocalStorage(currentSession);
        }
      } catch (error) {
        console.error('Error in auth initialization:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event);
      
      if (currentSession && mounted) {
        console.log('Setting new session');
        setSession(currentSession);
        setUser(currentSession.user);
        saveSessionToLocalStorage(currentSession);
      } else {
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing session');
          clearSessionFromLocalStorage();
        }
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      }

      // Force a router refresh to update server-side props
      router.refresh();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    try {
      // First clear localStorage
      clearSessionFromLocalStorage();
      
      // Then sign out with Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear state
      setSession(null);
      setUser(null);
      
      // Navigate to login
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear on error
      clearSessionFromLocalStorage();
      router.push('/login');
    }
  };

  return (
    <SupabaseContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};