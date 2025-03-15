'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Settings, User, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import GunbrokerSettings from './gunbroker-settings';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [gunbrokerIntegrations, setGunbrokerIntegrations] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      setLoading(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);
      
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileData) {
        setProfile(profileData);
      }
      
      // Fetch Gunbroker integrations
      const { data: integrationsData, error } = await supabase
        .from('gunbroker_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (!error && integrationsData) {
        setGunbrokerIntegrations(integrationsData);
      }
      
      setLoading(false);
    }
    
    fetchUserData();
  }, [router]);
  
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
      // Import and use the utility function
      const { clearSessionFromLocalStorage } = await import('@/lib/auth-utils');
      clearSessionFromLocalStorage();
      
      // Then sign out with API
      await supabase.auth.signOut();
      
      router.push('/login');
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error('Failed to sign out: ' + error.message);
      
      // Fallback: force navigation to login
      router.push('/login');
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
                  <p className="font-mono text-xs">{user?.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p>{profile ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Sign In</p>
                  <p>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Gunbroker Integrations Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Gunbroker Integrations</h2>
          <GunbrokerSettings />
        </div>
        
        {/* Sign Out Section */}
        <div className="mt-8">
          <Button 
            variant="destructive" 
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>
      </div>
    </div>
  );
} 