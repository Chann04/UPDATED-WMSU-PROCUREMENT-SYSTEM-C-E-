import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in app/.env or app.json extra.');
}

// Use AsyncStorage on native so auth session persists and app does not crash on startup.
// On web, omit storage (browser localStorage is used by default).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Stale or revoked refresh token in AsyncStorage — clear local session instead of looping errors. */
export function isPersistedSessionAuthFailure(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as { message?: string; code?: string; name?: string };
  const msg = String(e.message || '').toLowerCase();
  const code = String(e.code || '').toLowerCase();
  if (code === 'refresh_token_not_found') return true;
  if (msg.includes('invalid refresh token')) return true;
  if (msg.includes('refresh token not found')) return true;
  return false;
}

/** Removes invalid tokens from storage without calling the sign-out endpoint. */
export async function clearPersistedAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
}

/** Run once at module load so the first screen does not hit the same bad refresh twice. */
void (async () => {
  try {
    const { error } = await supabase.auth.getSession();
    if (error && isPersistedSessionAuthFailure(error)) {
      await clearPersistedAuthSession();
    }
  } catch (e) {
    if (isPersistedSessionAuthFailure(e)) {
      await clearPersistedAuthSession();
    }
  }
})();
