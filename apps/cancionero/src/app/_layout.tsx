import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_500Medium_Italic,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_800ExtraBold_Italic,
} from '@expo-google-fonts/fraunces';
import { portfolioLink } from '@index/projects';
import { mountIndexBar } from '@index/ui/index-bar';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { setUpServiceWorker } from '@/features/pwa/service-worker';
import { SongsProvider } from '@/features/songs/store';
import { ToastProvider } from '@/features/ui/toast';
import { TroublesomeProvider } from '@/features/vocab/troublesome';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    Fraunces_800ExtraBold_Italic,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_500Medium_Italic,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(setUpServiceWorker, []);
  // Web uniquement : onglet « ← INDEX » vers la fiche du projet sur le portfolio (masqué dans la PWA installée).
  useEffect(() => {
    if (Platform.OS === 'web') mountIndexBar({ ...portfolioLink('cancionero'), corner: 'top-right' });
  }, []);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Sur mobile, on attend les polices derrière l'écran de démarrage. Sur le
  // web, la page s'affiche tout de suite et les polices arrivent par-dessus.
  if (!ready && Platform.OS !== 'web') return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SongsProvider>
        <TroublesomeProvider>
          <ToastProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
              }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="song/[id]" />
              <Stack.Screen name="add" options={{ presentation: 'modal' }} />
              <Stack.Screen name="practice" />
              <Stack.Screen
                name="karaoke"
                options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ToastProvider>
        </TroublesomeProvider>
      </SongsProvider>
    </GestureHandlerRootView>
  );
}
