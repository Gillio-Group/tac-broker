import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type GunbrokerIntegration = {
  id: string;
  username: string;
  access_token: string;
  is_sandbox: boolean;
  is_active: boolean;
  last_connected_at: string;
  created_at: string;
  updated_at: string;
};

interface GunbrokerSettingsProps {
  integrations: GunbrokerIntegration[];
  onDisconnect: (integrationId: string) => Promise<void>;
}

export default function GunbrokerSettings({ integrations, onDisconnect }: GunbrokerSettingsProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<GunbrokerIntegration | null>(
    integrations.length > 0 ? integrations[0] : null
  );

  // Disconnect a Gunbroker account
  async function handleDisconnect(integrationId: string) {
    try {
      setDisconnecting(true);
      await onDisconnect(integrationId);
      
      // Update selected integration if the disconnected one was selected
      if (selectedIntegration && selectedIntegration.id === integrationId) {
        setSelectedIntegration(integrations.length > 1 ? 
          integrations.find(i => i.id !== integrationId) || null : null);
      }
    } catch (error) {
      console.error('Error in disconnect handler:', error);
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
        {integrations.length === 0 ? (
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
                    Last Connected: {new Date(integration.last_connected_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {integration.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={disconnecting}
                  onClick={() => handleDisconnect(integration.id)}
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