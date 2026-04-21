import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { clearProfileRoleCache } from '@/hooks/use-profile-role';
import { useThemeColor } from '@/hooks/use-theme-color';
import { clearPersistedAuthSession, supabase } from '@/lib/supabase';
import { WMSU } from '@/constants/theme';

export function LogoutButton() {
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    clearProfileRoleCache();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        await clearPersistedAuthSession();
      }
    } catch {
      await clearPersistedAuthSession();
    } finally {
      setBusy(false);
      // Backup navigation if auth listener is delayed; SIGNED_OUT also triggers AuthSignOutListener.
      router.replace('/login');
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Log out"
      activeOpacity={0.7}
      disabled={busy}
      onPress={() => void handleLogout()}
      style={[styles.button, busy && styles.buttonDisabled]}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={WMSU.red} style={styles.icon} />
      ) : (
        <MaterialIcons name="logout" size={22} color={WMSU.red} style={styles.icon} />
      )}
      <Text style={[styles.label, { color: textColor }]}>Log out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 4,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
});
