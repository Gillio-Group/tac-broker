'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Settings, User, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import GunbrokerSettings from './gunbroker-settings';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { ensureUserProfile, type Profile } from '@/lib/profile-utils';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [gunbrokerIntegrations, setGunbrokerIntegrations] = useState<any[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { session } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      setLoading(true);
      
      try {
        // First check context session
        let currentSession = session;
        
        // If no context session, get it from Supabase
        if (!currentSession) {
          const { data: { session: fetchedSession } } = await supabase.auth.getSession();
          currentSession = fetchedSession;
        }
        
        // If still no session, redirect to login
        if (!currentSession) {
          console.log('No valid session found, redirecting to login');
          router.replace('/login?redirect=/dashboard/settings');
          return;
        }

        // Get the current user from the session
        const currentUser = currentSession.user;
        if (!currentUser) {
          router.replace('/login');
          return;
        }
        
        setUser(currentUser);
        
        // Fetch user profile with detailed error logging
        console.log('Fetching profile for user:', currentUser.id);
        
        // Use the ensureUserProfile utility to get or create the profile
        const { profile: userProfile, error: profileError } = await ensureUserProfile(
          supabase,
          currentUser
        );
        
        if (profileError) {
          console.error('Error ensuring user profile:', profileError);
          toast.error('Failed to load profile data');
        } else if (userProfile) {
          console.log('Profile loaded/created successfully:', userProfile);
          setProfile(userProfile);
        }
        
        // Fetch Gunbroker integrations
        const { data: integrationsData, error: integrationsError } = await supabase
          .from('gunbroker_integrations')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (integrationsError) {
          console.error('Error fetching integrations:', integrationsError);
          toast.error('Failed to load integrations');
        } else if (integrationsData) {
          setGunbrokerIntegrations(integrationsData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [session, router]);
  
  const handleDisconnectGunbroker = async (integrationId: string) => {
    if (!user) return;
    
    try {
      // Instead of deleting, we'll mark it as inactive
      const { error } = await supabase
        .from('gunbroker_integrations')
        .update({ is_active: false })
        .eq('id', integrationId);
        
      if (error) throw error;
      
      // Update the local state
      setGunbrokerIntegrations(prev => 
        prev.filter(integration => integration.id !== integrationId)
      );
      
      toast.success('Gunbroker account disconnected successfully');
    } catch (error: any) {
      toast.error('Failed to disconnect Gunbroker account: ' + error.message);
    }
  };
  
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      
      // Sign out with Supabase (cookies will be cleared automatically)
      await supabase.auth.signOut();
      
      toast.success('Signed out successfully');
      router.replace('/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out: ' + error.message);
      
      // Force redirect on error
      router.replace('/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  // If no user data, show error state
  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Unable to load settings</h2>
          <p className="text-muted-foreground mb-4">Please try refreshing the page</p>
          <Button onClick={() => router.refresh()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="grid gap-6">
        {/* User Profile Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">User Profile</h2>
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p>{profile?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p>{profile?.company_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-xs text-muted-foreground">{user?.id}</p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut} 
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Integrations Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <Tabs defaultValue="gunbroker">
            <TabsList className="mb-4">
              <TabsTrigger value="gunbroker">
                <Store className="h-4 w-4 mr-2" />
                Gunbroker
              </TabsTrigger>
            </TabsList>
            <TabsContent value="gunbroker">
              <GunbrokerSettings 
                integrations={gunbrokerIntegrations} 
                onDisconnect={handleDisconnectGunbroker} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}