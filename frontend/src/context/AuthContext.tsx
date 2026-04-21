import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { isAdminRole, isDeptHeadRole, isFacultyUser, normalizeUserRole } from '../lib/roles';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  /** True while fetching `profiles` for the current session user (avoids treating "not loaded yet" as non-admin). */
  profileLoading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  isDeptHead: () => boolean;
  isFaculty: () => boolean;
  canApprove: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/** If PostgREST hangs, unblock profileLoading after this; fetch still completes in background. */
const PROFILE_LOAD_STALL_MS = 4_000;

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileLoadGeneration = useRef(0);
  const lastProfileUserIdRef = useRef<string | null>(null);

  const profileCacheKey = (userId: string) => `wmsu_procurement_profile_cache:${userId}`;

  const readCachedProfile = (userId: string): Profile | null => {
    try {
      const raw = localStorage.getItem(profileCacheKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<Profile> | null;
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.id || parsed.id !== userId) return null;
      // Normalize role defensively
      return {
        id: String(parsed.id),
        full_name: String(parsed.full_name ?? ''),
        email: String(parsed.email ?? ''),
        role: normalizeUserRole(parsed.role as any),
        department: (parsed.department ?? null) as any,
        faculty_department: (parsed.faculty_department ?? null) as any,
        approved_budget: (parsed.approved_budget ?? null) as any,
        created_at: String(parsed.created_at ?? new Date().toISOString()),
        updated_at: String(parsed.updated_at ?? new Date().toISOString()),
      } as Profile;
    } catch {
      return null;
    }
  };

  const writeCachedProfile = (p: Profile) => {
    try {
      localStorage.setItem(profileCacheKey(p.id), JSON.stringify(p));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  };

  // Fetch user profile (maybeSingle: no row → null, not an error)
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,role,full_name,email,department,faculty_department,approved_budget,created_at,updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error(
          '[Auth] Profile fetch failed:',
          error.message,
          error.code ? `code=${error.code}` : '',
          error.details ? `details=${error.details}` : ''
        );
        if (error.message?.includes('404') || (error as { status?: number }).status === 404) {
          console.warn(
            '[Auth] HTTP 404 on profiles: check VITE_SUPABASE_URL and that the public.profiles table exists (run frontend/supabase/schema.sql in the SQL Editor).'
          );
        }
        return null;
      }
      if (!data) return null;
      return { ...data, role: normalizeUserRole(data.role) };
    } catch (error) {
      console.error('[Auth] Profile fetch exception:', error);
      return null;
    }
  };

  const loadProfileForUser = async (userId: string | null) => {
    if (!userId) {
      profileLoadGeneration.current += 1;
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    const gen = ++profileLoadGeneration.current;
    setProfileLoading(true);
    try {
      // Seed from cache immediately to avoid route flicker on hard refresh.
      const cached = readCachedProfile(userId);
      if (cached && gen === profileLoadGeneration.current) {
        setProfile(cached);
      }

      const fetchPromise = fetchProfile(userId);
      const outcome = await Promise.race([
        fetchPromise.then((p) => ({ kind: 'ok' as const, p })),
        new Promise<{ kind: 'stall' }>((resolve) =>
          setTimeout(() => resolve({ kind: 'stall' }), PROFILE_LOAD_STALL_MS)
        ),
      ]);
      if (gen !== profileLoadGeneration.current) return;
      if (outcome.kind === 'ok') {
        setProfile(outcome.p);
        if (outcome.p) writeCachedProfile(outcome.p);
      } else {
        // Stalled: unblock UI; apply profile when fetch eventually finishes (no null flash)
        void fetchPromise.then((p) => {
          if (gen !== profileLoadGeneration.current) return;
          setProfile(p);
          if (p) writeCachedProfile(p);
        });
      }
    } catch {
      if (gen !== profileLoadGeneration.current) return;
      setProfile(null);
    } finally {
      if (gen === profileLoadGeneration.current) {
        setProfileLoading(false);
      }
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        lastProfileUserIdRef.current = session?.user?.id ?? null;

        await loadProfileForUser(session?.user?.id ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        setProfileLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Avoid route flicker when switching tabs:
        // TOKEN_REFRESHED updates session often, but user/profile usually unchanged.
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        const nextUserId = session?.user?.id ?? null;
        // Only reload profile when user identity changed or on explicit sign-in/sign-out/user update.
        const shouldReload =
          nextUserId !== lastProfileUserIdRef.current ||
          event === 'SIGNED_IN' ||
          event === 'SIGNED_OUT' ||
          event === 'USER_UPDATED';

        if (shouldReload) {
          lastProfileUserIdRef.current = nextUserId;
          await loadProfileForUser(nextUserId);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'Faculty') => {
    console.log('📝 Attempting signup for:', email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) {
        console.error('❌ Signup error:', error);
        console.dir(error, { depth: null });
        throw error;
      }

      console.log('✅ Signup successful:', data);
    } catch (err: any) {
      console.error('❌ Signup exception:', err);
      
      // Handle "Failed to fetch" specifically
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error(
          'Unable to connect to authentication server. This usually means:\n' +
          '1. Your Supabase project may be paused (check your dashboard)\n' +
          '2. Check your internet connection\n' +
          '3. The Supabase URL in .env might be incorrect'
        );
      }
      
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting signin for:', email);
    
    try {
      const attemptedEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: attemptedEmail,
        password
      });

      if (error) throw error;
      const resolvedEmail = data.user?.email ?? '';
      // Enforce case-sensitive email login as requested.
      if (resolvedEmail && attemptedEmail !== resolvedEmail) {
        // Clear local auth state immediately to prevent any redirect race.
        setUser(null);
        setProfile(null);
        setSession(null);
        setProfileLoading(false);
        await supabase.auth.signOut();
        throw new Error('Invalid login credentials');
      }

      // Block sign-in for accounts that are still awaiting College-Admin approval
      // (or that were declined). The profile row is inserted by the DB trigger with
      // status='Pending' for self-sign-ups.
      if (data.user?.id) {
        try {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', data.user.id)
            .maybeSingle();
          const status = (profileRow as { status?: string } | null)?.status;
          if (status === 'Pending' || status === 'Declined') {
            setUser(null);
            setProfile(null);
            setSession(null);
            setProfileLoading(false);
            await supabase.auth.signOut();
            throw new Error(
              status === 'Pending'
                ? 'Your account is awaiting approval from your College Admin.'
                : 'Your registration was declined. Please contact your College Admin for assistance.'
            );
          }
        } catch (statusErr: any) {
          // If the lookup itself threw one of our friendly errors, propagate it.
          const msg = String(statusErr?.message || '');
          if (msg.startsWith('Your account') || msg.startsWith('Your registration')) {
            throw statusErr;
          }
          // Otherwise, silently let the user through — we don't want a transient
          // Supabase read error to lock everyone out.
          console.warn('[Auth] Could not verify profile status:', msg);
        }
      }

      console.log('✅ Signin successful:', data.user?.email);

      // App-level audit log for sign-ins (so Logs can show "recent logins").
      // If insert fails due to RLS/migration not applied, ignore.
      try {
        await supabase.from('audit_events').insert({
          actor_id: data.user?.id ?? null,
          event_type: 'login',
          entity: 'auth',
          entity_id: null,
          details: { email: data.user?.email ?? attemptedEmail },
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      // Only log unexpected errors (not invalid credentials)
      const isInvalidCreds = err?.message === 'Invalid login credentials' || err?.name === 'AuthApiError';
      if (!isInvalidCreds) console.error('❌ Signin error:', err);

      // Handle "Failed to fetch" specifically
      if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
        throw new Error(
          'Unable to connect to authentication server. This usually means:\n' +
          '1. Your Supabase project may be paused (check your dashboard)\n' +
          '2. Check your internet connection\n' +
          '3. The Supabase URL in .env might be incorrect'
        );
      }
      
      throw err;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setSession(null);
    setProfileLoading(false);
  };

  const isAdmin = () => isAdminRole(profile, user);
  const isDeptHead = () => isDeptHeadRole(profile);
  const isFaculty = () => isFacultyUser(profile, user);
  const canApprove = () => isAdmin() || isDeptHead();

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user && !!session,
    isAdmin,
    isDeptHead,
    isFaculty,
    canApprove
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

