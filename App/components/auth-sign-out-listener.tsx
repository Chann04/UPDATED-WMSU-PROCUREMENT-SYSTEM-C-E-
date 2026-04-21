import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';

/**
 * Ensures navigation runs after sign-out even when the auth gate screen is not mounted
 * (e.g. user is inside (tabs)). Header logout only calls signOut(); this reacts to SIGNED_OUT.
 */
export function AuthSignOutListener() {
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
