import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { setUpServiceWorker } from '@/features/pwa/service-worker';
import { SongsProvider } from '@/features/songs/store';
import { TroublesomeProvider } from '@/features/vocab/troublesome';
import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const theme = useTheme();
  useEffect(setUpServiceWorker, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SongsProvider>
        <TroublesomeProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="index" options={{ title: 'Cancionero' }} />
            <Stack.Screen name="song/[id]" options={{ title: '' }} />
            <Stack.Screen
              name="add"
              options={{ title: 'Ajouter une chanson', presentation: 'modal' }}
            />
            <Stack.Screen name="practice" options={{ title: 'Vocabulaire à réviser' }} />
            <Stack.Screen name="karaoke" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          </Stack>
          <StatusBar style="auto" />
        </TroublesomeProvider>
      </SongsProvider>
    </GestureHandlerRootView>
  );
}
