'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ListingDetailsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Listing details error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Error Loading Listing</CardTitle>
          </div>
          <CardDescription>
            {error.message === 'Unauthorized'
              ? 'Please sign in to view this listing.'
              : error.message === 'No active Gunbroker integration found'
              ? 'Please connect your Gunbroker account to view listings.'
              : 'There was a problem loading this listing.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message === 'Unauthorized'
              ? 'You need to be signed in to access this content. Please sign in and try again.'
              : error.message === 'No active Gunbroker integration found'
              ? 'To view listings, you need to connect your Gunbroker account in the settings.'
              : 'We encountered an unexpected error while trying to load this listing. Please try again.'}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Back to Dashboard
          </Button>
          <Button onClick={() => reset()}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 