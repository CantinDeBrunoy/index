import { Stack, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

const CORK = '#c19a6b';
const CORK_DARK = '#a87f4f';

/** Page « tableau de liège » : en-tête avec retour + zone cork défilante. */
export function Corkboard({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText style={styles.back}>‹ Retour</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.headerTitle}>
            {title}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>
      <ScrollView style={styles.board} contentContainerStyle={styles.boardContent}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Une fiche « épinglée » sur le liège (papier légèrement incliné + punaise). */
export function PinnedCard({
  children,
  rotate = '0deg',
  tint = '#fffdf3',
  pin = '#e63946',
  onPress,
}: {
  children: ReactNode;
  rotate?: string;
  tint?: string;
  pin?: string;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <View style={styles.cardOuter}>
      <Wrapper onPress={onPress} style={[styles.card, { backgroundColor: tint, transform: [{ rotate }] }]}>
        <View style={[styles.pin, { backgroundColor: pin }]}>
          <View style={styles.pinShine} />
        </View>
        {children}
      </Wrapper>
    </View>
  );
}

/** Petit titre de section sur une fiche. */
export function CardLabel({ children }: { children: ReactNode }) {
  return <ThemedText style={styles.cardLabel}>{children}</ThemedText>;
}

/** Texte de fiche (sombre, lisible sur le papier). */
export function CardText({ children, big }: { children: ReactNode; big?: boolean }) {
  return <ThemedText style={[styles.cardText, big && styles.cardTextBig]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: CORK },
  headerWrap: { backgroundColor: CORK_DARK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  back: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerTitle: { color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  headerSpacer: { width: 56 },
  board: { flex: 1 },
  boardContent: { padding: 16, gap: 18, paddingBottom: 40 },
  cardOuter: { alignItems: 'center' },
  card: {
    width: '92%',
    borderRadius: 4,
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
    elevation: 4,
  },
  pin: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 1, height: 2 },
  },
  pinShine: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  cardLabel: {
    color: '#8a6d3b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardText: { color: '#2b2b2b', fontSize: 15, lineHeight: 21 },
  cardTextBig: { fontSize: 20, fontWeight: '700' },
});
