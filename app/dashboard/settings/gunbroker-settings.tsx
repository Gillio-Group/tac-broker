import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { authenticatedFetchJson } from '@/lib/client-utils';

interface GunbrokerIntegration {
  id: string;
  username: string;
  is_sandbox: boolean;
  token_expires_at: string;
  last_connected_at: string;
}

export default function GunbrokerSettings() {
  const { session } = useAuth();
  const [integrations, setIntegrations] = useState<GunbrokerIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Fetch Gunbroker integrations
  useEffect(() => {
    async function fetchIntegrations() {
      if (!session) return;
      
      try {
        setLoading(true);
        const response = await authenticatedFetchJson(
          '/api/gunbroker/integrations',
          session,
          { method: 'GET' }
        );
        
        if (response.success && response.integrations) {
          setIntegrations(response.integrations);
        }
      } catch (error) {
        console.error('Error fetching Gunbroker integrations:', error);
        toast.error('Failed to load Gunbroker integrations');
      } finally {
        setLoading(false);
      }
    }
    
    fetchIntegrations();
  }, [session]);

  // Disconnect a Gunbroker account
  async function disconnectGunbroker(integrationId: string, sandbox: boolean) {
    if (!session) {
      toast.error('You need to be logged in to disconnect from Gunbroker');
      return;
    }
    
    try {
      setDisconnecting(true);
      
      const response = await authenticatedFetchJson(
        '/api/gunbroker/disconnect',
        session,
        {
          method: 'POST',
          body: JSON.stringify({ integrationId, sandbox })
        }
      );
      
      if (response.success) {
        toast.success(response.message || 'Successfully disconnected from Gunbroker');
        // Remove the disconnected integration from the state
        setIntegrations(integrations.filter(i => i.id !== integrationId));
      } else {
        toast.error(response.error || 'Failed to disconnect from Gunbroker');
      }
    } catch (error) {
      console.error('Error disconnecting from Gunbroker:', error);
      toast.error('An error occurred while disconnecting from Gunbroker');
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gunbroker Integrations</CardTitle>
        <CardDescription>
          Manage your Gunbroker account connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <p>No Gunbroker accounts connected. Go to the Connect page to add one.</p>
        ) : (
          <div className="space-y-4">
            {integrations.map(integration => (
              <div key={integration.id} className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <h3 className="font-medium">{integration.username}</h3>
                  <p className="text-sm text-muted-foreground">
                    {integration.is_sandbox ? 'Sandbox' : 'Production'} mode
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connected: {new Date(integration.last_connected_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(integration.token_expires_at).toLocaleString()}
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={disconnecting}
                  onClick={() => disconnectGunbroker(integration.id, integration.is_sandbox)}
                >
                  Disconnect
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard/connect'}>
          Connect New Account
        </Button>
      </CardFooter>
    </Card>
  );
} 