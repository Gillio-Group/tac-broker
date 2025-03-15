'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { 
  getSessionFromLocalStorage, 
  saveSessionToLocalStorage, 
  clearSessionFromLocalStorage 
} from '@/lib/auth-utils';

// Create a context for the auth state
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

// Create a provider component
export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Manual check for localStorage session on mount
  useEffect(() => {
    const checkLocalStorage = () => {
      try {
        const storedSession = getSessionFromLocalStorage();
        if (storedSession) {
          console.log('[AuthProvider] Found session in localStorage:', storedSession.user?.email);
          
          // Set the session and user from localStorage
          setSession(storedSession);
          setUser(storedSession.user);
          
          // Update the Supabase client with this session
          supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token || '',
          });
        } else {
          console.log('[AuthProvider] No session found in localStorage');
        }
      } catch (e) {
        console.error('[AuthProvider] Error checking localStorage:', e);
      }
    };

    checkLocalStorage();
  }, []);

  useEffect(() => {
    // Get the current session on mount
    const getSession = async () => {
      try {
        console.log('[AuthProvider] Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[AuthProvider] Session check result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email
        });
        
        if (session) {
          setSession(session);
          setUser(session.user);
          
          // Save the session to localStorage
          saveSessionToLocalStorage(session);
        } else {
          // Check if we have a localStorage session
          const storedSession = getSessionFromLocalStorage();
          if (storedSession) {
            setSession(storedSession);
            setUser(storedSession.user);
          } else {
            setSession(null);
            setUser(null);
          }
        }
        
        if (error) {
          console.error('[AuthProvider] Error fetching session:', error);
        }
      } catch (error) {
        console.error('[AuthProvider] Exception fetching session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthProvider] Auth state changed:', event, { 
          hasSession: !!session,
          email: session?.user?.email 
        });
        
        // Handle session changes
        if (session) {
          setSession(session);
          setUser(session.user);
          
          // Save the session to localStorage
          saveSessionToLocalStorage(session);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          
          // Clear the session from localStorage
          clearSessionFromLocalStorage();
        }
        
        setIsLoading(false);
        
        // When auth changes, refresh the current route
        router.refresh();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Sign out handler
  const signOut = async () => {
    // Clear storage first
    clearSessionFromLocalStorage();
    
    // Then sign out with API
    await supabase.auth.signOut();
    
    // Set state to signed out
    setSession(null);
    setUser(null);
    
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Create a hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
} 