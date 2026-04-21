import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { LogoutButton } from '@/components/logout-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfileRole } from '@/hooks/use-profile-role';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { role, loading: roleLoading } = useProfileRole();

  const theme = colorScheme ?? 'light';
  const c = Colors[theme];
  const isDeptHead = role === 'DeptHead';

  if (roleLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.tint} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        headerShown: true,
        headerRight: () => <LogoutButton />,
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isDeptHead ? 'Budget' : 'Request progress',
          tabBarIcon: ({ color }) =>
            isDeptHead ? (
              <IconSymbol size={28} name="doc.text.fill" color={color} />
            ) : (
              <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: isDeptHead ? 'College requests' : 'History',
          tabBarIcon: ({ color }) =>
            isDeptHead ? (
              <IconSymbol size={28} name="paperplane.fill" color={color} />
            ) : (
              <IconSymbol size={28} name="clock.fill" color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
