import { portfolioLink } from '@index/projects';
import { mountIndexBar } from '@index/ui/index-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { TripsProvider } from '@/features/trips/store';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Web uniquement : onglet « ← INDEX » vers la fiche du projet sur le portfolio.
  useEffect(() => {
    if (Platform.OS === 'web') mountIndexBar({ ...portfolioLink('magellan'), corner: 'top-right' });
  }, []);

  return (
    <TripsProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </TripsProvider>
  );
}
