import { Fragment } from 'react';
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthSignOutListener } from '@/components/auth-sign-out-listener';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Ensure fonts are always set (required by native-stack's useHeaderConfigProps)
const fonts = DefaultTheme.fonts;

const WMSULightTheme: Theme = {
  dark: false,
  colors: {
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.tint,
  },
  fonts,
};

const WMSUDarkTheme: Theme = {
  dark: true,
  colors: {
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.tint,
  },
  fonts,
};

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? WMSUDarkTheme : WMSULightTheme}>
      <Fragment>
        <AuthSignOutListener />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="landing"
            options={{
              title: 'WMSU-Procurement',
              // Enter landing from the left (e.g. from login logo); Android/iOS native stack.
              animation: 'slide_from_left',
            }}
          />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </Fragment>
    </ThemeProvider>
  );
}
