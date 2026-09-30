// Kit « table en noyer & post-it » des fiches voyage et étape.
//
// Le voyage est posé sur une table de travail : étiquette kraft pour le titre,
// tampons encreurs pour les pays, un post-it punaisé par étape (sa couleur dit le
// pays), reliés par un fil rouge, et le budget sur une feuille de bloc-notes.
//
// Tout est dessiné en View/Text, sans SVG : le fil rouge est une suite de traits
// pivotés, le bois une texture qui se répète (assets/images/wood-walnut.png).
// Deux mises en page : étroite (téléphone) et large (web, tablette), cf. useWoodLayout.

import { Caveat_500Medium, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoThumb } from '@/features/photos/PhotoThumb';

const WOOD = require('@/assets/images/wood-walnut.png');

export const FONT = {
  hand: 'Caveat_500Medium',
  handBold: 'Caveat_700Bold',
  marker: 'PermanentMarker_400Regular',
};

const INK = '#2a2320';
const DARK_INK = '#3b2414';
const KRAFT = '#e8cf9f';
const KRAFT_INK = '#7a5528';
const TAPE = 'rgba(245, 235, 205, 0.8)';
const THREAD = 'rgba(193, 18, 31, 0.85)';

/** Ombre d'un papier posé sur la table. */
const PAPER_SHADOW = '0px 1px 1px rgba(0, 0, 0, 0.18), 0px 10px 14px -8px rgba(0, 0, 0, 0.6)';

/** Au-delà de cette largeur, la fiche passe en mise en page large (web, tablette). */
const WIDE_BREAKPOINT = 900;
const MAX_WIDTH = 1440;
/** Écart entre le haut de l'écran (zone sûre) et l'étiquette « Retour » épinglée. */
const BACK_TOP = 16;

/** Couleur d'un post-it : le papier et l'encre lisible dessus. */
export type PostitColor = { paper: string; ink: string };

const POSTITS: PostitColor[] = [
  { paper: '#ffe680', ink: '#5c4a14' },
  { paper: '#b9eb9a', ink: '#2c5418' },
  { paper: '#ffb8cc', ink: '#6b2139' },
  { paper: '#a9d8ff', ink: '#1c4467' },
  { paper: '#ffc987', ink: '#6b3d0c' },
  { paper: '#d9c6ff', ink: '#40306b' },
];

/** Couleurs des chiffres clés, dans l'ordre (jaune, rose, bleu, vert). */
const STAT_COLORS = [POSTITS[0], POSTITS[2], POSTITS[3], POSTITS[1]];

/** Inclinaisons « à la main », reprises en boucle pour que rien ne soit droit. */
const TILTS = [-2, 2.5, -1.5, 1.8, -2.5, 1.5, -1, 2.2];

/** Montant formaté en euros (entier : les budgets saisis n'ont pas de centimes). */
export function euros(n: number): string {
  return `${Math.round(n)} €`;
}

/** Couleur de post-it n° i (en boucle sur la palette). */
export function postitColor(i: number): PostitColor {
  return POSTITS[((i % POSTITS.length) + POSTITS.length) % POSTITS.length];
}

function tilt(i: number, factor = 1): string {
  return `${TILTS[i % TILTS.length] * factor}deg`;
}

/**
 * Mise en page de la fiche selon la largeur de la fenêtre — pas selon la plateforme :
 * un téléphone qui ouvre la version web garde la mise en page étroite.
 */
export function useWoodLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const gutter = wide ? 56 : 20;
  const contentWidth = Math.min(width, MAX_WIDTH) - 2 * gutter;
  return { wide, contentWidth, width };
}

/**
 * Page sur la table en noyer : contenu défilant et, sauf pour un onglet (`back={false}`),
 * étiquette « Retour » épinglée en haut à gauche — toujours à portée, la fiche glisse
 * dessous pendant le défilement.
 */
export function WoodPage({ children, back = true }: { children: ReactNode; back?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wide, width } = useWoodLayout();
  const [fontsLoaded] = useFonts({ Caveat_500Medium, Caveat_700Bold, PermanentMarker_400Regular });
  const gutter = wide ? 56 : 20;
  // Alignée sur le bord gauche du contenu (centré et plafonné en largeur sur grand écran).
  const backLeft = (width - Math.min(width, MAX_WIDTH)) / 2 + gutter;

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <Image source={WOOD} resizeMode="repeat" style={styles.wood} />
      {/* Sans les polices manuscrites, la mise en page sauterait au chargement : on attend. */}
      {fontsLoaded ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            <SafeAreaView edges={['top']}>
              <View style={[styles.inner, { paddingHorizontal: gutter }, back && styles.innerUnderBack]}>
                {children}
              </View>
            </SafeAreaView>
          </ScrollView>
          {back ? (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              style={({ pressed }) => [
                styles.backTag,
                { top: insets.top + BACK_TOP, left: backLeft },
                pressed && styles.pressed,
              ]}>
              <Text style={styles.backText}>‹  Retour</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** Bouton « étiquette kraft » ; `light` pour une action secondaire. */
export function WoodButton({
  label,
  onPress,
  icon,
  light,
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  light?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.woodButton,
        light && styles.woodButtonLight,
        disabled && styles.woodButtonDisabled,
        pressed && styles.pressed,
      ]}>
      {icon ? <Ionicons name={icon} size={18} color={DARK_INK} /> : null}
      <Text style={[styles.woodButtonText, light && styles.woodButtonTextLight]}>{label}</Text>
    </Pressable>
  );
}

/** Bande de masking tape (décor, positionnée par l'appelant). */
function Tape({ style }: { style: StyleProp<ViewStyle> }) {
  return <View style={[styles.tape, style]} />;
}

/** Punaise rouge, centrée horizontalement sur `left`. */
function Pin({ left }: { left: number }) {
  return (
    <View style={[styles.pin, { left: left - 8 }]}>
      <View style={styles.pinShine} />
    </View>
  );
}

/** En-tête : étiquette kraft scotchée, avec les pays en tampons encreurs. */
export function KraftLabel({
  eyebrow,
  title,
  subtitle,
  stamps,
  big,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  stamps?: { label: string; ink: string }[];
  big?: boolean;
}) {
  return (
    <View style={[styles.kraft, big && styles.kraftBig]}>
      <Tape style={{ left: 18, top: -11, width: 86, transform: [{ rotate: '-6deg' }] }} />
      <Tape style={{ right: 20, top: -9, width: 70, transform: [{ rotate: '5deg' }] }} />
      {eyebrow ? <Text style={styles.kraftEyebrow}>{eyebrow}</Text> : null}
      <Text style={[styles.kraftTitle, big && styles.kraftTitleBig]}>{title}</Text>
      {subtitle ? <Text style={[styles.kraftSubtitle, big && styles.kraftSubtitleBig]}>{subtitle}</Text> : null}
      {stamps && stamps.length > 0 ? (
        <View style={styles.stampRow}>
          {stamps.map((s, i) => (
            <View
              key={s.label}
              style={[styles.stamp, { borderColor: s.ink, transform: [{ rotate: tilt(i + 1, 1.6) }] }]}>
              <Text style={[styles.stampText, { color: s.ink }]}>{s.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Chiffres clés : un petit post-it carré par chiffre. */
export function StatPostits({
  items,
  width,
  big,
}: {
  items: { value: string; label: string }[];
  /** Largeur disponible (mise en page étroite : 4 post-it par ligne au maximum). */
  width: number;
  big?: boolean;
}) {
  const size = big ? 124 : Math.min(96, (width - 30) / 4);
  return (
    <View style={[styles.statRow, big && styles.statRowBig]}>
      {items.map((it, i) => {
        const c = STAT_COLORS[i % STAT_COLORS.length];
        const long = it.value.length > 4;
        return (
          <View
            key={it.label}
            style={[
              styles.postit,
              styles.statPostit,
              {
                width: long && big ? size + 26 : size,
                height: size,
                backgroundColor: c.paper,
                transform: [{ rotate: tilt(i, 1.3) }],
              },
            ]}>
            <Text
              numberOfLines={1}
              style={[styles.statValue, { fontSize: big ? (long ? 44 : 52) : long ? 24 : 34 }]}>
              {it.value}
            </Text>
            <Text style={[styles.statLabel, big && styles.statLabelBig, { color: c.ink }]}>{it.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Titre de section écrit au feutre sur une bande de masking tape. */
export function TapeTitle({
  children,
  align = 'center',
  style,
}: {
  children: string;
  align?: 'center' | 'left';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tapeTitle, { alignSelf: align === 'center' ? 'center' : 'flex-start' }, style]}>
      <Text style={styles.tapeTitleText}>{children.toUpperCase()}</Text>
    </View>
  );
}

/** Une étape sur le tableau d'itinéraire. */
export type BoardStop = {
  key: string;
  index: number;
  title: string;
  date?: string;
  meta?: string;
  color: PostitColor;
  onPress?: () => void;
};

const POSTIT_W = 236;
const POSTIT_H = 112;
const ZIGZAG_ROW = 130;
const SNAKE_ROW = 240;
/** Décalage vertical par colonne en mise en page large, pour casser l'alignement. */
const SNAKE_STAGGER = [0, 42, -6];

/**
 * Tableau d'itinéraire : post-it punaisés, reliés dans l'ordre par un fil rouge.
 * - étroit : zigzag gauche / droite, une étape par rangée ;
 * - large : serpentin sur 2 ou 3 colonnes (1→2→3, puis 4←5←6, …).
 */
export function StopBoard({ stops, width, wide }: { stops: BoardStop[]; width: number; wide: boolean }) {
  const pw = wide ? POSTIT_W : Math.min(POSTIT_W, width - 70);
  const cols = wide ? (width >= 3 * POSTIT_W + 80 ? 3 : 2) : 2;
  const step = (width - pw) / (cols - 1);

  const spots = stops.map((_, i) => {
    if (!wide) return { x: i % 2 === 0 ? 0 : width - pw, y: i * ZIGZAG_ROW + 6 };
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    return { x: col * step, y: row * SNAKE_ROW + 20 + SNAKE_STAGGER[col % SNAKE_STAGGER.length] };
  });
  const height = wide
    ? Math.ceil(stops.length / cols) * SNAKE_ROW + 40
    : stops.length * ZIGZAG_ROW + 16;
  // Le fil part de la punaise, au milieu du bord haut de chaque post-it.
  const pins = spots.map((s) => ({ x: s.x + pw / 2, y: s.y + 8 }));

  return (
    <View style={{ width, height }}>
      {pins.slice(1).map((b, i) => {
        const a = pins[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        return (
          <View
            key={`fil-${stops[i].key}`}
            style={[
              styles.thread,
              {
                left: (a.x + b.x) / 2 - len / 2,
                top: (a.y + b.y) / 2 - 1,
                width: len,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}
      {stops.map((s, i) => (
        <Pressable
          key={s.key}
          onPress={s.onPress}
          accessibilityRole="button"
          accessibilityLabel={`Étape ${s.index} : ${s.title}`}
          style={({ pressed }) => [
            styles.postit,
            styles.stopPostit,
            {
              left: spots[i].x,
              top: spots[i].y,
              width: pw,
              backgroundColor: s.color.paper,
              transform: [{ rotate: tilt(i) }, { scale: pressed ? 0.97 : 1 }],
            },
          ]}>
          <Pin left={pw / 2} />
          <View style={styles.stopHead}>
            <Text style={[styles.stopIndex, { color: s.color.ink }]}>{s.index}</Text>
            {s.date ? (
              <Text numberOfLines={1} style={[styles.stopDate, { color: s.color.ink }]}>
                {s.date}
              </Text>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.stopTitle}>
            {s.title}
          </Text>
          {s.meta ? (
            <Text numberOfLines={1} style={[styles.stopMeta, { color: s.color.ink }]}>
              {s.meta}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Budget sur une feuille de bloc-notes lignée : un poste par ligne, surligné en
 * proportion du poste le plus lourd, puis le total entouré de rouge.
 */
export function Notepad({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; value: number }[];
  total: number;
}) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <View style={[styles.postit, styles.notepad]}>
      <View style={styles.notepadMargin} />
      <Tape style={{ top: -11, alignSelf: 'center', width: 90, transform: [{ rotate: '-3deg' }] }} />
      <View style={styles.notepadLine}>
        <Text style={styles.notepadTitle}>{title}</Text>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={styles.notepadLine}>
          <Text style={styles.notepadLabel}>{r.label}</Text>
          <View style={styles.highlightTrack}>
            <View
              style={[styles.highlight, { width: `${max > 0 ? Math.max(0.03, r.value / max) * 100 : 0}%` }]}
            />
          </View>
          <Text style={styles.notepadValue}>{euros(r.value)}</Text>
        </View>
      ))}
      <View style={styles.notepadTotal}>
        <Text style={styles.notepadTotalLabel}>Total</Text>
        <Text style={styles.notepadTotalValue}>{euros(total)}</Text>
      </View>
    </View>
  );
}

/** Petites étiquettes post-it précédées d'un titre : participants, position… */
export function TagRow({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.nameRow}>
      <TapeTitle align="left" style={styles.flush}>
        {title}
      </TapeTitle>
      {items.map((n, i) => (
        <View
          key={n}
          style={[
            styles.postit,
            styles.nameTag,
            { backgroundColor: postitColor(i + 4).paper, transform: [{ rotate: tilt(i + 1, 1.2) }] },
          ]}>
          <Text style={styles.nameText}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Carte postale punaisée de la ville — tient lieu d'itinéraire sur la fiche d'une ville.
 * Le recto prend la couleur du voyage (en attendant les photos) ; timbre et
 * cachet de la poste au nom de la ville (la date est déjà sur l'étiquette).
 */
export function Postcard({
  city,
  color,
  width,
}: {
  city: string;
  color: string;
  width: number;
}) {
  const big = width >= 500;
  const seal = big ? 100 : 76;
  return (
    <View
      accessibilityLabel={`Carte postale de ${city}`}
      style={[styles.postcard, { width, padding: big ? 16 : 10, transform: [{ rotate: '1.6deg' }] }]}>
      <View style={[styles.postcardFace, { height: width * 0.6, backgroundColor: color }]}>
        <View style={[styles.postcardText, { left: big ? 34 : 16, right: seal + 40, bottom: big ? 30 : 16 }]}>
          <Text style={[styles.postcardHello, big && styles.postcardHelloBig]}>Bons baisers de</Text>
          <Text style={[styles.postcardCity, big && styles.postcardCityBig]}>{city}</Text>
        </View>
        <View style={[styles.postcardStamp, big && styles.postcardStampBig]}>
          <View style={styles.postcardStampInner} />
        </View>
        <View
          style={[
            styles.postmark,
            { width: seal, height: seal, borderRadius: seal / 2, right: big ? 84 : 48, top: big ? 56 : 34 },
          ]}>
          <Text numberOfLines={2} style={[styles.postmarkText, big && styles.postmarkTextBig]}>
            {city.toUpperCase()}
          </Text>
        </View>
      </View>
      <Pin left={width / 2} />
    </View>
  );
}

const POLAROID_W = 150;
const POLAROID_GAP = 26;
const SLOT = POLAROID_W + POLAROID_GAP;

type LineItem = { path: string; caption?: string };

/** Mélange déterministe (même graine, même ordre) : le premier tirage est stable d'un rendu à l'autre. */
function seededShuffle<T>(xs: T[], seed: number): T[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Un polaroid suspendu par sa pince ; `twine` : porte son bout de ficelle. */
function Polaroid({ item, index, width, twine }: { item: LineItem; index: number; width: number; twine?: boolean }) {
  return (
    <View style={[styles.lineSlot, { width }]}>
      {twine ? <View style={styles.twine} /> : null}
      <View style={[styles.polaroid, { transform: [{ rotate: tilt(index, 1.4) }] }]}>
        <PhotoThumb path={item.path} width={POLAROID_W - 18} height={POLAROID_W - 18} />
        <Text numberOfLines={1} style={styles.polaroidCaption}>
          {item.caption ?? ''}
        </Text>
      </View>
      <View style={[styles.peg, { left: width / 2 - 6, transform: [{ rotate: tilt(index, 1.4) }] }]} />
    </View>
  );
}

/**
 * Photos sur une corde à linge : des polaroids suspendus par des pinces.
 * - étroit (téléphone) : une corde qu'on fait glisser du doigt ; chaque emplacement porte
 *   son bout de ficelle, pour une corde continue même si la liste ne dessine que les
 *   photos visibles ;
 * - large : une seule corde sur toute la largeur ; un clic y accroche une autre série
 *   tirée au hasard, jamais celle affichée, et toutes les photos passent avant qu'une
 *   ne revienne.
 */
export function Clothesline({ items }: { items: LineItem[] }) {
  const { wide, contentWidth, width } = useWoodLayout();
  // Tirage en cours : ordre mélangé des photos et position de la série affichée. Tant
  // qu'on n'a pas cliqué (ou si la liste a changé), premier mélange stable de la liste.
  const sig = `${items.length}:${items[0]?.path ?? ''}:${items[items.length - 1]?.path ?? ''}`;
  const [draw, setDraw] = useState<{ sig: string; order: LineItem[]; pos: number } | null>(null);
  if (items.length === 0) return null;

  const title = (
    <TapeTitle align="left" style={styles.flush}>
      {`Photos · ${items.length}`}
    </TapeTitle>
  );

  if (!wide) {
    return (
      <View style={styles.clothesline}>
        {title}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(it) => it.path}
          initialNumToRender={8}
          windowSize={5}
          getItemLayout={(_, index) => ({ length: SLOT, offset: SLOT * index, index })}
          contentContainerStyle={styles.lineContent}
          renderItem={({ item, index }) => <Polaroid item={item} index={index} width={SLOT} twine />}
        />
      </View>
    );
  }

  // La corde sort de la colonne de contenu pour aller d'un bord à l'autre de la fenêtre.
  const bleed = (width - contentWidth) / 2;
  const perLine = Math.max(1, Math.floor(width / SLOT));
  const slot = width / perLine;
  const current = draw && draw.sig === sig ? draw : { sig, order: seededShuffle(items, hash(sig)), pos: 0 };
  const shown = current.order.slice(current.pos, current.pos + perLine);
  const canDraw = items.length > perLine;

  // Série suivante : la suite du mélange ; en fin de mélange, on repart avec d'abord les
  // photos pas encore vues, puis les autres, et la série actuelle en tout dernier.
  const next = () => {
    const { order, pos } = current;
    if (pos + 2 * perLine <= order.length) {
      setDraw({ sig, order, pos: pos + perLine });
      return;
    }
    const unseen = order.slice(pos + perLine);
    const seen = order.slice(0, pos);
    const seed = hash(`${sig}:${Date.now()}`);
    setDraw({
      sig,
      order: [...seededShuffle(unseen, seed), ...seededShuffle(seen, seed + 1), ...shown],
      pos: 0,
    });
  };

  return (
    <View style={styles.clothesline}>
      <View style={styles.lineHead}>
        {title}
        {canDraw ? <Text style={styles.lineHint}>Clique sur la corde pour en voir d’autres</Text> : null}
      </View>
      <Pressable
        onPress={next}
        disabled={!canDraw}
        accessibilityRole="button"
        accessibilityLabel="Voir d’autres photos"
        style={({ pressed }) => [styles.line, { width, marginHorizontal: -bleed }, pressed && styles.pressed]}>
        <View style={styles.twine} />
        {shown.map((item, i) => (
          <Polaroid key={item.path} item={item} index={current.pos + i} width={slot} />
        ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#5a341c' },
  // Taille explicite : sur web, sans elle, l'image garde la taille d'une seule tuile.
  wood: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingTop: 12, paddingBottom: 56 },
  // Laisse la place à l'étiquette « Retour » épinglée (16 + 44 px) au-dessus du contenu.
  innerUnderBack: { paddingTop: BACK_TOP + 44 + 8 },
  pressed: { opacity: 0.8 },

  backTag: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: '#d9b88c',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 12,
    paddingRight: 18,
    transform: [{ rotate: '-2deg' }],
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.35)',
  },
  backText: { fontFamily: FONT.handBold, fontSize: 22, color: DARK_INK },

  woodButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#d9b88c',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.35)',
  },
  woodButtonLight: { backgroundColor: 'rgba(245, 235, 205, 0.85)' },
  woodButtonDisabled: { opacity: 0.5 },
  woodButtonText: { fontFamily: FONT.handBold, fontSize: 22, color: DARK_INK },
  woodButtonTextLight: { fontSize: 21 },

  postit: { boxShadow: PAPER_SHADOW },
  tape: {
    position: 'absolute',
    height: 22,
    backgroundColor: TAPE,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
  },
  pin: {
    position: 'absolute',
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#c1121f',
    boxShadow: '1px 3px 3px rgba(0, 0, 0, 0.45)',
  },
  pinShine: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },

  kraft: {
    marginTop: 26,
    backgroundColor: KRAFT,
    paddingTop: 26,
    paddingBottom: 20,
    paddingHorizontal: 22,
    transform: [{ rotate: '-1.2deg' }],
    boxShadow: PAPER_SHADOW,
  },
  kraftBig: { paddingTop: 30, paddingBottom: 24, paddingHorizontal: 30, transform: [{ rotate: '-1deg' }] },
  kraftEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: KRAFT_INK,
  },
  kraftTitle: { fontFamily: FONT.marker, fontSize: 36, lineHeight: 42, color: '#2a1a0e', marginTop: 4 },
  kraftTitleBig: { fontSize: 50, lineHeight: 56 },
  kraftSubtitle: { fontFamily: FONT.hand, fontSize: 24, color: '#5b3b1c', marginTop: 2 },
  kraftSubtitleBig: { fontSize: 28 },
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stamp: { borderWidth: 2, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  stampText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  statRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 28 },
  statRowBig: { gap: 22, marginTop: 0, justifyContent: 'flex-start' },
  statPostit: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  statValue: { fontFamily: FONT.handBold, color: INK },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  statLabelBig: { fontSize: 12, marginTop: 4 },

  tapeTitle: {
    marginTop: 34,
    backgroundColor: 'rgba(245, 235, 205, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 20,
    transform: [{ rotate: '-1.5deg' }],
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.3)',
  },
  tapeTitleText: { fontFamily: FONT.marker, fontSize: 18, letterSpacing: 1, color: DARK_INK },

  thread: { position: 'absolute', height: 2, backgroundColor: THREAD },
  stopPostit: { position: 'absolute', height: POSTIT_H, paddingTop: 18, paddingHorizontal: 16 },
  stopHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  stopIndex: { fontFamily: FONT.marker, fontSize: 15 },
  stopDate: { fontFamily: FONT.hand, fontSize: 19, flexShrink: 1 },
  stopTitle: { fontFamily: FONT.handBold, fontSize: 32, lineHeight: 36, color: INK },
  stopMeta: { fontSize: 13, marginTop: 2 },

  notepad: {
    marginTop: 34,
    backgroundColor: '#fdfbf2',
    paddingLeft: 52,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 10,
    transform: [{ rotate: '0.8deg' }],
  },
  notepadMargin: {
    position: 'absolute',
    left: 38,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(214, 69, 65, 0.55)',
  },
  // Chaque ligne porte son trait bleu, prolongé sous la marge comme sur un vrai bloc.
  notepadLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 32,
    marginLeft: -52,
    paddingLeft: 52,
    marginRight: -16,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(90, 140, 200, 0.35)',
  },
  notepadTitle: { fontFamily: FONT.marker, fontSize: 20, color: DARK_INK },
  notepadLabel: { fontFamily: FONT.hand, fontSize: 21, color: INK, width: 92 },
  highlightTrack: { flex: 1, height: 14 },
  highlight: {
    height: 14,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 214, 0, 0.7)',
    transform: [{ skewX: '-12deg' }],
  },
  notepadValue: { fontFamily: FONT.handBold, fontSize: 21, color: INK, width: 64, textAlign: 'right' },
  notepadTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 42,
    borderTopWidth: 2,
    borderTopColor: INK,
    marginTop: 4,
  },
  notepadTotalLabel: { fontFamily: FONT.handBold, fontSize: 24, color: INK },
  notepadTotalValue: { fontFamily: FONT.handBold, fontSize: 30, color: '#b3261e' },

  flush: { marginTop: 0 },

  clothesline: { marginTop: 34 },
  lineContent: { paddingTop: 12, paddingBottom: 18 },
  lineSlot: { paddingTop: 30, alignItems: 'center' },
  line: { flexDirection: 'row', marginTop: 6 },
  lineHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  lineHint: { fontFamily: FONT.hand, fontSize: 20, color: '#f3e6c8' },
  twine: { position: 'absolute', top: 22, left: 0, right: 0, height: 2, backgroundColor: '#e8d3a8' },
  polaroid: {
    width: POLAROID_W,
    padding: 9,
    paddingBottom: 0,
    backgroundColor: '#fbfaf6',
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.2), 0px 12px 16px -8px rgba(0, 0, 0, 0.65)',
  },
  polaroidCaption: {
    fontFamily: FONT.hand,
    fontSize: 20,
    lineHeight: 36,
    height: 36,
    textAlign: 'center',
    color: INK,
  },
  peg: {
    position: 'absolute',
    top: 10,
    width: 12,
    height: 30,
    borderRadius: 2,
    backgroundColor: '#c89a5e',
    boxShadow: '1px 2px 3px rgba(0, 0, 0, 0.45)',
  },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 34 },
  nameTag: { paddingVertical: 6, paddingHorizontal: 16 },
  nameText: { fontFamily: FONT.handBold, fontSize: 24, color: INK },

  postcard: { alignSelf: 'center', marginTop: 34, backgroundColor: '#fbfaf6', boxShadow: PAPER_SHADOW },
  postcardFace: { overflow: 'hidden' },
  postcardText: { position: 'absolute' },
  postcardHello: { fontFamily: FONT.hand, fontSize: 20, color: INK },
  postcardHelloBig: { fontSize: 30 },
  postcardCity: { fontFamily: FONT.marker, fontSize: 30, lineHeight: 36, color: INK },
  postcardCityBig: { fontSize: 56, lineHeight: 64 },
  postcardStamp: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 50,
    height: 60,
    padding: 4,
    backgroundColor: '#fbfaf6',
    transform: [{ rotate: '4deg' }],
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)',
  },
  postcardStampBig: { right: 36, top: 36, width: 78, height: 94, padding: 6 },
  postcardStampInner: { flex: 1, backgroundColor: '#c1121f' },
  postmark: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(30, 30, 50, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    transform: [{ rotate: '-14deg' }],
  },
  postmarkText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    color: 'rgba(30, 30, 50, 0.8)',
  },
  postmarkTextBig: { fontSize: 12, letterSpacing: 1 },
});
