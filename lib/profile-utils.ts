import { User } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a user profile if it doesn't exist
 */
export async function ensureUserProfile(
  supabase: SupabaseClient<Database>,
  user: User,
  additionalData: Partial<Profile> = {}
): Promise<{ profile: Profile | null; error: any }> {
  try {
    // First check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile exists, return it
    if (existingProfile) {
      console.log('Profile already exists for user:', user.id);
      return { profile: existingProfile as Profile, error: null };
    }

    // If error is not "no rows" error, return the error
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for existing profile:', fetchError);
      return { profile: null, error: fetchError };
    }

    // Create new profile
    console.log('Creating new profile for user:', user.id);
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          email: user.email,
          full_name: additionalData.full_name || '',
          company_name: additionalData.company_name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...additionalData
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return { profile: null, error: createError };
    }

    return { profile: newProfile as Profile, error: null };
  } catch (error) {
    console.error('Exception in ensureUserProfile:', error);
    return { profile: null, error };
  }
}

/**
 * Fetches a user profile by user ID
 */
export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ profile: Profile | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { profile: null, error };
    }

    return { profile: data as Profile, error: null };
  } catch (error) {
    console.error('Exception in getUserProfile:', error);
    return { profile: null, error };
  }
}
