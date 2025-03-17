'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface OrdersClientProps {
  initialError?: string;
  initialAction?: string;
}

export function OrdersClient({ initialError, initialAction }: OrdersClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [action, setAction] = useState(initialAction);

  const handleRetry = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gunbroker/orders?page=1&pageSize=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch orders');
        setAction(errorData.action);
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      // If successful, refresh the page
      router.refresh();
      toast({
        title: 'Success',
        description: 'Successfully connected to GunBroker',
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = () => {
    if (action === 'login') {
      router.push('/login');
    } else if (action === 'connect') {
      router.push('/dashboard/connect');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <h3 className="text-lg font-semibold">Error loading orders</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={handleRetry}
                disabled={isLoading}
              >
                {isLoading ? 'Retrying...' : 'Retry'}
              </Button>
              {action && (
                <Button onClick={handleAction}>
                  {action === 'login' ? 'Sign In' : 'Connect GunBroker'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
} 