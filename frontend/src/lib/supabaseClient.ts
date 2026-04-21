import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Network connectivity test function
export const testSupabaseReachability = async (): Promise<{reachable: boolean; error?: string}> => {
  try {
    console.log('🔍 Testing Supabase reachability...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
      }
    });
    console.log('✅ Supabase is reachable! Status:', response.status);
    return { reachable: true };
  } catch (error: any) {
    console.error('❌ Supabase unreachable:', error.message);
    return { reachable: false, error: error.message };
  }
};

// Helper function to get current user's profile
export const getCurrentProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getCurrentProfile]', error.message, error.code);
    return null;
  }
  return profile;
};

// Helper function to check if user has specific role
export const hasRole = async (roles: string[]): Promise<boolean> => {
  const profile = await getCurrentProfile();
  return profile ? roles.includes(profile.role) : false;
};

// Create a dedicated anonymous client for public operations (like supplier registration)
// This client never persists sessions and always makes anonymous requests
export const getAnonymousClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey
      }
    }
  });
};

export default supabase;

