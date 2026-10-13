import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Sur le web, la barre par défaut (49 px) ne laisse que 10 px au libellé sous l'icône de 28 px : « Globe » et
// « Voyages » sortaient coupés en bas. 5 px de plus, au-dessus de la zone sûre.
const WEB_TAB_BAR_HEIGHT = 54;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.OS === 'web' ? { height: WEB_TAB_BAR_HEIGHT + insets.bottom } : undefined,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Globe',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="globe" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Voyages',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />
    </Tabs>
  );
}
