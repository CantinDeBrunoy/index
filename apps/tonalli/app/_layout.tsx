import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EntriesProvider } from '@/state/EntriesProvider';
import { NotificationSync } from '@/state/NotificationSync';
import { SettingsProvider } from '@/state/SettingsProvider';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <SafeAreaProvider>
      <EntriesProvider>
        <SettingsProvider>
          <NotificationSync />
          <StatusBar style={theme.dark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="day/[date]"
              options={{
                presentation: 'modal',
                headerShown: true,
                title: '',
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.text,
                headerShadowVisible: false,
              }}
            />
          </Stack>
        </SettingsProvider>
      </EntriesProvider>
    </SafeAreaProvider>
  );
}
