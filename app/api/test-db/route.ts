import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch (error) {
                console.error('Error setting cookie:', error);
              }
            });
          },
        },
      }
    );
    
    console.log('Testing Supabase connection to:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Try to query the gunbroker_integrations table
    const { data, error } = await supabase
      .from('gunbroker_integrations')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return NextResponse.json({ 
        error: error.message,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully connected to Supabase',
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      data 
    });
    
  } catch (error: any) {
    console.error('Error testing Supabase connection:', error);
    return NextResponse.json({ 
      error: error.message,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL 
    }, { status: 500 });
  }
}