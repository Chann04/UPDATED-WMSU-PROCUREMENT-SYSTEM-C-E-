import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type AppTabRole = 'Faculty' | 'DeptHead' | null;

type RoleCache =
  | { ready: false }
  | { ready: true; role: AppTabRole };

let roleCache: RoleCache = { ready: false };

export function useProfileRole(): { role: AppTabRole; loading: boolean } {
  const [role, setRole] = useState<AppTabRole>(() => (roleCache.ready ? roleCache.role : null));
  const [loading, setLoading] = useState(!roleCache.ready);

  useEffect(() => {
    let cancelled = false;

    if (roleCache.ready) {
      setRole(roleCache.role);
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          roleCache = { ready: true, role: null };
          if (!cancelled) {
            setRole(null);
            setLoading(false);
          }
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data?.role) {
          roleCache = { ready: true, role: null };
          setRole(null);
          setLoading(false);
          return;
        }
        const r = String(data.role).trim();
        let next: AppTabRole = null;
        if (r === 'DeptHead') next = 'DeptHead';
        else if (r === 'Faculty') next = 'Faculty';
        roleCache = { ready: true, role: next };
        setRole(next);
      } catch {
        if (!cancelled) {
          roleCache = { ready: true, role: null };
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading };
}

/** Call on sign-out so the next user does not inherit the previous role. */
export function clearProfileRoleCache() {
  roleCache = { ready: false };
}
