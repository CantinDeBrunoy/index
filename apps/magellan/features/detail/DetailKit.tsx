// Kit d'interface de la fiche étape (la fiche voyage a son propre kit : WoodKit.tsx).
//
// Thème sombre aligné sur le globe (#0b1026) : la fiche prolonge la planète plutôt
// que de casser l'ambiance. L'accent est la couleur du voyage, reprise du tracé sur
// le globe — un même voyage garde son identité colorée d'un écran à l'autre.
//
// Les couleurs sont explicites (pas de ThemedText) : le fond est forcé sombre sur
// les trois plateformes, un texte clair/sombre automatique deviendrait illisible.

import { Stack, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const COLORS = {
  bg: '#0b1026',
  surface: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.10)',
  text: '#eef1f7',
  muted: '#8b93a7',
  accent: '#7cc7ff',
};

const FALLBACK_ACCENT = '#ffd166';

/** Page d'une fiche détail : fond sombre, en-tête flottant, contenu défilant. */
export function DetailPage({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={12}
            style={styles.backBtn}>
            <Text style={styles.backText}>‹  Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * En-tête d'une fiche : halo coloré, titre, sous-titre et pastilles (drapeaux…).
 * Le halo est un simple cercle flouté par sa transparence — pas de dépendance
 * de dégradé à installer.
 */
export function Hero({
  color = FALLBACK_ACCENT,
  eyebrow,
  title,
  subtitle,
  chips,
}: {
  color?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  chips?: string[];
}) {
  return (
    <View style={styles.hero}>
      <View style={[styles.heroGlow, { backgroundColor: color + '22' }]} />
      <View style={[styles.heroBar, { backgroundColor: color }]} />
      {eyebrow ? <Text style={[styles.eyebrow, { color }]}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      {chips && chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Bandeau de statistiques : une tuile par chiffre clé. */
export function StatRow({ items }: { items: { value: string; label: string }[] }) {
  return (
    <View style={styles.statRow}>
      {items.map((it) => (
        <View key={it.label} style={styles.statTile}>
          <Text style={styles.statValue}>{it.value}</Text>
          <Text style={styles.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Section titrée du contenu. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Carte neutre, pour regrouper le contenu d'une section. */
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/** Ligne de budget : libellé, barre proportionnelle au plus gros poste, montant. */
export function BudgetBar({
  label,
  value,
  max,
  color = FALLBACK_ACCENT,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const ratio = max > 0 ? Math.max(0.02, value / max) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{euros(value)}</Text>
    </View>
  );
}

/** Ligne « total » d'un bloc budget. */
export function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{euros(value)}</Text>
    </View>
  );
}

/** Pastilles (personnes, pays…). */
export function Chips({ items }: { items: string[] }) {
  return (
    <View style={styles.chipRow}>
      {items.map((it) => (
        <View key={it} style={styles.chip}>
          <Text style={styles.chipText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

/** Texte neutre d'une carte. */
export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

/** Montant formaté en euros (entier : les budgets saisis n'ont pas de centimes). */
export function euros(n: number): string {
  return `${Math.round(n)} €`;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 6 },
  backText: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
  scroll: { paddingBottom: 48 },

  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    top: -150,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  heroBar: { width: 46, height: 4, borderRadius: 2, marginBottom: 14 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitle: { color: COLORS.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  heroSubtitle: { color: COLORS.muted, fontSize: 15, marginTop: 6 },

  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 4 },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.6 },

  section: { paddingHorizontal: 20, marginTop: 26 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
  },


  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabel: { color: COLORS.muted, fontSize: 13, width: 88 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { color: COLORS.text, fontSize: 13, fontWeight: '700', width: 64, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 2,
  },
  totalLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: COLORS.text, fontSize: 20, fontWeight: '800' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },

  muted: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
});
