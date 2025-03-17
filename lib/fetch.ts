import { Session } from '@supabase/supabase-js';

/**
 * Makes an authenticated fetch request to the API with JSON handling
 * 
 * @param url The API endpoint URL
 * @param session The Supabase session object
 * @param options Additional fetch options
 * @returns Parsed JSON response
 */
export async function authenticatedFetchJson<T>(
  url: string,
  session: Session,
  options: RequestInit = {}
): Promise<T> {
  // Ensure we have the auth token
  if (!session?.access_token) {
    throw new Error('No valid session token available');
  }

  // Set headers with auth token
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  };

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle non-OK responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.error || response.statusText || 'An error occurred';
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).data = errorData;
    throw error;
  }

  // Parse and return the JSON response
  return await response.json();
} 