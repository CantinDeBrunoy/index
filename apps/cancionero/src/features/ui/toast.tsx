import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToastOptions = {
  message: string;
  /** Un bouton à droite, par exemple « Annuler ». */
  actionLabel?: string;
  onAction?: () => void;
  /** Coche verte devant le message (une action réussie). */
  success?: boolean;
};

type ToastContextValue = { show: (options: ToastOptions) => void; hide: () => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = 2800;

/**
 * Message bref en bas de l'écran (« « cesta » ajouté à tes révisions »). Un
 * nouveau message remplace le précédent ; chacun disparaît seul.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((options: ToastOptions) => {
    clearTimeout(timer.current);
    setToast({ ...options, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), DURATION);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.layer} pointerEvents="box-none">
        {toast && <ToastView key={toast.id} toast={toast} onHide={hide} />}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onHide }: { toast: ToastOptions; onHide: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15).stiffness(180)}
      exiting={FadeOutDown.duration(180)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { backgroundColor: theme.toast, marginBottom: insets.bottom + 16 },
      ]}>
      {toast.success && <Icon name="check" size={18} color={theme.toastIcon} strokeWidth={2.6} />}
      <ThemedText type="small" style={[styles.message, { color: theme.toastText }]}>
        {toast.message}
      </ThemedText>
      {toast.actionLabel && (
        <Pressable
          onPress={() => {
            toast.onAction?.();
            onHide();
          }}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.action}>
          <ThemedText type="smallBold" style={{ color: theme.toastAction }}>
            {toast.actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans un <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 16,
    boxShadow: '0px 14px 30px -12px rgba(42, 24, 16, 0.6)',
  },
  message: { flex: 1, paddingVertical: 6 },
  action: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center' },
});
