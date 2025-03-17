'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { authenticatedFetch } from '@/lib/client-utils';

// Define the form schema with validation rules
const formSchema = z.object({
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  is_sandbox: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConnectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();

  // Check for session on mount and when session changes
  useEffect(() => {
    if (!session) {
      console.log('No session found, redirecting to login');
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
  }, [session, router]);

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      is_sandbox: true, // Default to sandbox for safety
    },
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Call the API route with our session token using our utility
      const response = await authenticatedFetch(
        '/api/gunbroker/connect',
        session,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Gunbroker');
      }
      
      toast.success(data.message || "Successfully connected to Gunbroker");
      
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error connecting to Gunbroker:', error);
      
      // Check specifically for authentication errors
      if (error.message?.includes('authenticated')) {
        toast.error('Authentication Error: You need to log in before connecting to Gunbroker.');
      } else {
        toast.error(error.message || "An error occurred connecting to Gunbroker");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Connect to Gunbroker</CardTitle>
          <CardDescription>
            Enter your Gunbroker account credentials to connect TAC Broker to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gunbroker Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your Gunbroker username" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is the username you use to log in to Gunbroker
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gunbroker Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your Gunbroker password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Your password is securely encrypted before being stored
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_sandbox"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Sandbox Mode (Testing)</FormLabel>
                      <FormDescription>
                        Enable for testing without affecting your live Gunbroker account
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Account'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between flex-col sm:flex-row bg-muted/50 text-sm text-muted-foreground">
          <p>We never store your actual password, only an encrypted version.</p>
          <a 
            href="https://www.gunbroker.com/c/user/register/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Don&apos;t have an account?
          </a>
        </CardFooter>
      </Card>
    </div>
  );
} 