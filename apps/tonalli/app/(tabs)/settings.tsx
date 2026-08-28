import Constants from 'expo-constants';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { exportEntries, mergeEntries, pickBackup } from '@/lib/backup';
import { formatTime } from '@/lib/dates';
import { REMINDER_BODY, getPermissionStatus, requestPermission } from '@/lib/notifications';
import { useEntries } from '@/state/EntriesProvider';
import { useSettings } from '@/state/SettingsProvider';
import { radius, spacing, type, useTheme } from '@/theme';

const STEP_MINUTES = 30;

export default function SettingsScreen() {
  const theme = useTheme();
  const { entries, replaceEntries } = useEntries();
  const { settings, update } = useSettings();
  const [permission, setPermission] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshPermission = useCallback(() => {
    getPermissionStatus()
      .then(setPermission)
      .catch(() => setPermission(null));
  }, []);

  // La permission peut changer dans les réglages système, hors de l'app.
  useEffect(() => {
    refreshPermission();
    const onChange = (status: AppStateStatus) => {
      if (status === 'active') refreshPermission();
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [refreshPermission]);

  const blocked = settings.remindersEnabled && permission !== null && permission !== 'granted';

  const onToggleReminders = async (value: boolean) => {
    if (!value) {
      await update({ remindersEnabled: false });
      return;
    }

    const status = await requestPermission();
    setPermission(status);
    await update({ remindersEnabled: true });

    if (status !== 'granted') {
      Alert.alert(
        'Notifications désactivées',
        "Nuancier n'a pas la permission d'envoyer des notifications. Tu peux l'accorder dans les réglages du système.",
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Ouvrir les réglages', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  };

  const shiftTime = (deltaMinutes: number) => {
    const total = (settings.hour * 60 + settings.minute + deltaMinutes + 24 * 60) % (24 * 60);
    void update({ hour: Math.floor(total / 60), minute: total % 60 });
  };

  const onExport = async () => {
    if (Object.keys(entries).length === 0) {
      Alert.alert('Rien à exporter', "Aucune journée n'a encore été colorée.");
      return;
    }
    setBusy(true);
    try {
      const outcome = await exportEntries(entries);
      if (outcome === 'sharing-unavailable') {
        Alert.alert('Partage indisponible', "Le fichier a été créé mais n'a pas pu être partagé.");
      }
    } catch {
      Alert.alert('Export impossible', "Le fichier n'a pas pu être écrit.");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const incoming = await pickBackup();
      if (!incoming) return;

      const result = mergeEntries(entries, incoming);
      const summary = [
        `${result.added} journée${result.added > 1 ? 's' : ''} ajoutée${result.added > 1 ? 's' : ''}`,
        `${result.updated} mise${result.updated > 1 ? 's' : ''} à jour`,
        `${result.kept} inchangée${result.kept > 1 ? 's' : ''}`,
      ].join('\n');

      Alert.alert('Importer ce fichier ?', summary, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Importer',
          onPress: () => void replaceEntries(result.merged),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Import impossible',
        error instanceof Error ? error.message : 'Fichier illisible.',
      );
    } finally {
      setBusy(false);
    }
  };

  const count = Object.keys(entries).length;

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>Réglages</Text>

      <Text style={[type.section, styles.section, { color: theme.textFaint }]}>RAPPEL</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[type.body, { color: theme.text }]}>Rappel quotidien</Text>
            <Text style={[type.caption, { color: theme.textMuted }]}>« {REMINDER_BODY} »</Text>
          </View>
          <Switch
            value={settings.remindersEnabled}
            onValueChange={(value) => void onToggleReminders(value)}
            trackColor={{ true: theme.textMuted, false: theme.surfaceStrong }}
            thumbColor={theme.surface}
          />
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text
              style={[
                type.body,
                { color: settings.remindersEnabled ? theme.text : theme.textFaint },
              ]}
            >
              Heure du rappel
            </Text>
            <Text style={[type.caption, { color: theme.textMuted }]}>
              Pas de rappel les jours déjà remplis.
            </Text>
          </View>
          <View style={styles.stepper}>
            <StepperButton
              label="−"
              disabled={!settings.remindersEnabled}
              onPress={() => shiftTime(-STEP_MINUTES)}
            />
            <Text style={[type.body, styles.time, { color: theme.text }]}>
              {formatTime(settings.hour, settings.minute)}
            </Text>
            <StepperButton
              label="+"
              disabled={!settings.remindersEnabled}
              onPress={() => shiftTime(STEP_MINUTES)}
            />
          </View>
        </View>
      </View>

      {blocked ? (
        <Pressable onPress={() => void Linking.openSettings()} style={styles.notice}>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Les notifications sont bloquées par le système. Toucher ici pour ouvrir les réglages.
          </Text>
        </Pressable>
      ) : null}

      <Text style={[type.section, styles.section, { color: theme.textFaint }]}>DONNÉES</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ActionRow label="Exporter en JSON" disabled={busy} onPress={() => void onExport()} />
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <ActionRow label="Importer un fichier" disabled={busy} onPress={() => void onImport()} />
      </View>
      <Text style={[type.caption, styles.footnote, { color: theme.textFaint }]}>
        {count} journée{count > 1 ? 's' : ''} enregistrée{count > 1 ? 's' : ''} sur cet appareil.
        Aucune donnée ne quitte le téléphone.
      </Text>

      <Text style={[type.caption, styles.version, { color: theme.textFaint }]}>
        Nuancier {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}

function StepperButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Plus tard' : 'Plus tôt'}
      style={[
        styles.stepperButton,
        { borderColor: theme.border, backgroundColor: theme.background },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={{ color: theme.text, fontSize: 18, lineHeight: 22 }}>{label}</Text>
    </Pressable>
  );
}

function ActionRow({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.row, disabled && { opacity: 0.5 }]}
    >
      <Text style={[type.body, { color: theme.text }]}>{label}</Text>
      <Text style={{ color: theme.textFaint, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: {
    width: 34,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { minWidth: 52, textAlign: 'center', fontVariant: ['tabular-nums'] },
  notice: { marginTop: spacing.sm },
  footnote: { marginTop: spacing.sm },
  version: { marginTop: spacing.xl, textAlign: 'center' },
});
