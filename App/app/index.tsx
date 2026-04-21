import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  supabase,
  isPersistedSessionAuthFailure,
  clearPersistedAuthSession,
} from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AuthGate() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  useEffect(() => {
    let mounted = true;

    const checkSession = async (session: { user: { id: string } } | null) => {
      if (!session?.user?.id) {
        router.replace('/landing');
        return;
      }
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role === 'Admin') {
          await supabase.auth.signOut();
          router.replace('/login');
        } else {
          router.replace('/(tabs)');
        }
      } catch {
        router.replace('/(tabs)');
      }
    };

    const run = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setChecking(false);
        if (sessionError) {
          if (isPersistedSessionAuthFailure(sessionError)) {
            await clearPersistedAuthSession();
          }
          router.replace('/landing');
          return;
        }
        if (session) {
          await checkSession(session);
        } else {
          router.replace('/landing');
        }
      } catch (e) {
        if (!mounted) return;
        setChecking(false);
        if (isPersistedSessionAuthFailure(e)) {
          await clearPersistedAuthSession();
        }
        router.replace('/landing');
      }
    };

    run();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session) await checkSession(session);
      else router.replace('/landing');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
