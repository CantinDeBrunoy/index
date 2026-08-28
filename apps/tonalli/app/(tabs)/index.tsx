import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ColorPicker } from '@/components/ColorPicker';
import { Screen } from '@/components/Screen';
import { colorName, readableTextOn } from '@/data/palette';
import { formatLongDate } from '@/lib/dates';
import { useEntries } from '@/state/EntriesProvider';
import { radius, spacing, type, useTheme } from '@/theme';

export default function TodayScreen() {
  const theme = useTheme();
  const { ready, entries, today, setEntry, removeEntry } = useEntries();
  const entry = entries[today];

  const [note, setNote] = useState(entry?.note ?? '');
  const [pickerWidth, setPickerWidth] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  // La note suit le jour affiché : au passage de minuit, on repart à vide.
  // Volontairement indépendant de `entry.note` : sinon la saisie en cours
  // serait écrasée à chaque sauvegarde.
  useEffect(() => {
    setNote(entries[today]?.note ?? '');
  }, [today, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fondu discret quand la couleur du jour change.
  useEffect(() => {
    if (!entry?.color) return;
    fade.setValue(0.55);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [entry?.color, fade]);

  const onSelectColor = (color: string) => {
    void Haptics.selectionAsync().catch(() => {});
    void setEntry(today, color, note);
  };

  const onNoteBlur = () => {
    if (!entry) return; // une note sans couleur n'a rien à accompagner
    if ((entry.note ?? '') === note.trim()) return;
    void setEntry(today, entry.color, note);
  };

  const onLayoutPicker = (event: LayoutChangeEvent) => {
    setPickerWidth(event.nativeEvent.layout.width);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <Text style={[type.title, { color: theme.text }]}>Aujourd&apos;hui</Text>
        <Text style={[type.caption, styles.date, { color: theme.textMuted }]}>
          {formatLongDate(today)}
        </Text>

        <Animated.View
          style={[
            styles.hero,
            {
              opacity: fade,
              backgroundColor: entry ? entry.color : theme.surface,
              borderColor: entry ? 'transparent' : theme.border,
              borderStyle: entry ? 'solid' : 'dashed',
            },
          ]}
        >
          {entry ? (
            <>
              <Text style={[type.title, { color: readableTextOn(entry.color) }]}>
                {colorName(entry.color)}
              </Text>
              {entry.note ? (
                <Text
                  style={[type.body, styles.heroNote, { color: readableTextOn(entry.color) }]}
                  numberOfLines={2}
                >
                  {entry.note}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[type.body, styles.heroEmpty, { color: theme.textMuted }]}>
              {ready ? 'Quelle couleur avait ta journée ?' : ' '}
            </Text>
          )}
        </Animated.View>

        <Text style={[type.section, styles.section, { color: theme.textFaint }]}>
          {entry ? 'CHANGER DE COULEUR' : 'CHOISIR UNE COULEUR'}
        </Text>

        <View onLayout={onLayoutPicker}>
          {pickerWidth > 0 ? (
            <ColorPicker selected={entry?.color} onSelect={onSelectColor} width={pickerWidth} />
          ) : null}
        </View>

        <Text style={[type.section, styles.section, { color: theme.textFaint }]}>NOTE</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={onNoteBlur}
          onSubmitEditing={onNoteBlur}
          placeholder="Un mot sur la journée (facultatif)"
          placeholderTextColor={theme.textFaint}
          maxLength={80}
          returnKeyType="done"
          editable={Boolean(entry)}
          style={[
            type.body,
            styles.input,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: entry ? theme.text : theme.textFaint,
            },
          ]}
        />
        {!entry ? (
          <Text style={[type.caption, styles.hint, { color: theme.textFaint }]}>
            La note s&apos;active une fois la couleur choisie.
          </Text>
        ) : null}

        {entry ? (
          <Pressable
            onPress={() => {
              setNote('');
              void removeEntry(today);
            }}
            style={styles.clear}
            accessibilityRole="button"
          >
            <Text style={[type.label, { color: theme.textMuted }]}>Effacer la journée</Text>
          </Pressable>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  date: { marginTop: spacing.xs, textTransform: 'capitalize' },
  hero: {
    marginTop: spacing.lg,
    minHeight: 190,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  heroNote: { marginTop: spacing.sm, textAlign: 'center', opacity: 0.85 },
  heroEmpty: { textAlign: 'center' },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  hint: { marginTop: spacing.sm },
  clear: { marginTop: spacing.xl, alignSelf: 'flex-start', paddingVertical: spacing.sm },
});
