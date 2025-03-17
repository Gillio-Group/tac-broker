'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCcw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export function HeaderActions() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Refresh the current page
      router.refresh();
      toast({
        title: 'Refreshed',
        description: 'Orders list has been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh orders',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
      
      <Button asChild size="sm">
        <Link href="/dashboard/connect">
          <Plus className="mr-2 h-4 w-4" />
          Connect GunBroker
        </Link>
      </Button>
    </div>
  );
} 