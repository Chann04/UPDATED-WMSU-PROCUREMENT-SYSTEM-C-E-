/**
 * Supabase Connection Test Utility
 * 
 * This file helps verify that your Supabase connection is working correctly.
 * You can import and call testSupabaseConnection() from any component,
 * or run it from the browser console.
 */

import { supabase } from './supabaseClient';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details: {
    url: string;
    authStatus: 'connected' | 'not_authenticated' | 'error';
    databaseStatus: 'connected' | 'error' | 'no_tables';
    tablesFound: string[];
    error?: string;
  };
}

export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const result: ConnectionTestResult = {
    success: false,
    message: '',
    details: {
      url: import.meta.env.VITE_SUPABASE_URL || 'NOT SET',
      authStatus: 'error',
      databaseStatus: 'error',
      tablesFound: []
    }
  };

  console.log('🔍 Testing Supabase Connection...\n');

  // Step 1: Check if environment variables are set
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || url === 'https://YOUR-PROJECT-ID.supabase.co') {
    result.message = '❌ VITE_SUPABASE_URL is not set. Please update your .env file.';
    result.details.error = 'Missing or placeholder SUPABASE_URL';
    console.error(result.message);
    return result;
  }

  if (!key || key === 'YOUR-ANON-KEY-HERE') {
    result.message = '❌ VITE_SUPABASE_ANON_KEY is not set. Please update your .env file.';
    result.details.error = 'Missing or placeholder ANON_KEY';
    console.error(result.message);
    return result;
  }

  console.log('✅ Environment variables are set');
  console.log(`   URL: ${url}`);

  // Step 2: Test auth connection
  try {
    const { data: session, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      result.details.authStatus = 'error';
      result.details.error = authError.message;
      console.error('❌ Auth connection failed:', authError.message);
    } else {
      result.details.authStatus = session?.session ? 'connected' : 'not_authenticated';
      console.log('✅ Auth service is reachable');
      if (session?.session) {
        console.log('   User is logged in:', session.session.user.email);
      } else {
        console.log('   No active session (user not logged in - this is OK for testing)');
      }
    }
  } catch (err: any) {
    result.details.authStatus = 'error';
    result.details.error = err.message;
    console.error('❌ Auth connection error:', err.message);
  }

  // Step 3: Test database connection by querying categories (public table)
  try {
    const { data, error: dbError } = await supabase
      .from('categories')
      .select('name')
      .limit(5);

    if (dbError) {
      // Try to determine if it's a "table doesn't exist" error
      if (dbError.message.includes('does not exist') || dbError.code === '42P01') {
        result.details.databaseStatus = 'no_tables';
        result.details.error = 'Tables not created. Run the SQL migrations first.';
        console.warn('⚠️ Database connected but tables not found');
        console.warn('   Please run the SQL migrations in Supabase Dashboard');
      } else {
        result.details.databaseStatus = 'error';
        result.details.error = dbError.message;
        console.error('❌ Database query failed:', dbError.message);
      }
    } else {
      result.details.databaseStatus = 'connected';
      result.details.tablesFound = data?.map(c => c.name) || [];
      console.log('✅ Database connection successful!');
      console.log(`   Found ${data?.length || 0} categories:`, data?.map(c => c.name).join(', ') || 'none');
    }
  } catch (err: any) {
    result.details.databaseStatus = 'error';
    result.details.error = err.message;
    console.error('❌ Database connection error:', err.message);
  }

  // Final result
  if (result.details.databaseStatus === 'connected') {
    result.success = true;
    result.message = '🎉 Supabase connection is working! You\'re ready to go.';
  } else if (result.details.databaseStatus === 'no_tables') {
    result.success = false;
    result.message = '⚠️ Connected to Supabase but tables are missing. Run the SQL migrations.';
  } else {
    result.success = false;
    result.message = '❌ Connection failed. Check your .env file and Supabase project settings.';
  }

  console.log('\n' + result.message);
  return result;
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
}

export default testSupabaseConnection;

