import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { clearCache } from '@/lib/cache';
import { detectTimeZone } from '@/lib/dates';
import { deletePhotos } from '@/lib/photo';
import { errorCode, openedFromRecoveryLink, supabase } from '@/lib/supabase';
import type { Locale, Profile } from '@/lib/types';
import { useI18n } from '@/state/I18nProvider';

type Status = 'loading' | 'signed-out' | 'signed-in';

type AuthValue = {
  status: Status;
  user: User | null;
  profile: Profile | null;
  partner: Profile | null;
  profileError: string | null;
  reload: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** `true` si Supabase attend une confirmation par e-mail. */
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Vrai entre l'ouverture d'un lien de réinitialisation et le nouveau mot de passe. */
  recovering: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  linkPartner: (code: string) => Promise<void>;
  unlinkPartner: () => Promise<void>;
  deleteAllData: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(openedFromRecoveryLink);
  const localeSynced = useRef(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<Profile>();

    if (error) {
      setProfileError(errorCode(error));
      return;
    }
    if (!data) {
      // Le profil est créé par un trigger sur auth.users : à la toute
      // première connexion il peut arriver une fraction de seconde après.
      setProfileError('profile_missing');
      return;
    }

    setProfile(data);

    // Le fuseau suit la personne : un déménagement ou un voyage met à jour le
    // profil, et donc la date à laquelle ses journées sont enregistrées.
    const timezone = detectTimeZone();
    if (timezone !== data.timezone) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({ timezone })
        .eq('id', userId)
        .select('*')
        .maybeSingle<Profile>();
      if (updated) setProfile(updated);
    }

    if (data.partner_id) {
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.partner_id)
        .maybeSingle<Profile>();
      setPartner(partnerProfile ?? null);
    } else {
      setPartner(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? 'signed-in' : 'signed-out');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(nextSession);
      setStatus(nextSession ? 'signed-in' : 'signed-out');
      if (!nextSession) {
        setProfile(null);
        setPartner(null);
        setRecovering(false);
        localeSynced.current = false;
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    void loadProfile(session.user.id);
  }, [session?.user, loadProfile]);

  // La langue du profil gagne au premier chargement ; ensuite c'est le choix
  // fait dans les réglages qui pilote, et il est réécrit dans le profil.
  useEffect(() => {
    if (!profile || localeSynced.current) return;
    localeSynced.current = true;
    if (profile.locale !== locale) setLocale(profile.locale);
  }, [profile, locale, setLocale]);

  const reload = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session?.user, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            locale: locale satisfies Locale,
            timezone: detectTimeZone(),
          },
        },
      });
      if (error) throw new Error(error.message);
      return data.session === null;
    },
    [locale],
  );

  const signOut = useCallback(async () => {
    const userId = session?.user.id;
    await supabase.auth.signOut();
    if (userId) clearCache(userId);
  }, [session?.user.id]);

  const requestPasswordReset = useCallback(async (email: string) => {
    // L'adresse de retour doit figurer dans Authentication → URL Configuration
    // → Redirect URLs ; sinon Supabase renvoie vers la Site URL, ce que
    // `openedFromRecoveryLink` rattrape.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    setRecovering(false);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!profile) return;
      const previous = profile;
      setProfile({ ...profile, ...patch });
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', profile.id)
        .select('*')
        .maybeSingle<Profile>();
      if (error) {
        setProfile(previous);
        throw new Error(error.message);
      }
      if (data) setProfile(data);
    },
    [profile],
  );

  const linkPartner = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length !== 6) throw new Error('invalid_code');
      const { error } = await supabase.rpc('link_partner', { code: trimmed });
      if (error) throw new Error(errorCode(error));
      await reload();
    },
    [reload],
  );

  const unlinkPartner = useCallback(async () => {
    const { error } = await supabase.rpc('unlink_partner');
    if (error) throw new Error(errorCode(error));
    if (session?.user) clearCache(session.user.id);
    await reload();
  }, [reload, session?.user]);

  const deleteAllData = useCallback(async () => {
    if (!profile) return;
    const { data: entries } = await supabase
      .from('entries')
      .select('photo_path, selfie_path')
      .eq('user_id', profile.id)
      .returns<{ photo_path: string | null; selfie_path: string | null }[]>();

    const paths = (entries ?? [])
      .flatMap((row) => [row.photo_path, row.selfie_path])
      .filter((path): path is string => Boolean(path));
    await deletePhotos(paths);

    const { error } = await supabase.from('entries').delete().eq('user_id', profile.id);
    if (error) throw new Error(error.message);

    // Les réactions reçues partent avec mes entrées (cascade), mais celles que
    // j'ai posées chez le binôme vivent sur ses lignes à lui : elles ne
    // disparaissent que si on les supprime explicitement.
    const { error: reactionsError } = await supabase
      .from('reactions')
      .delete()
      .eq('author_id', profile.id);
    if (reactionsError) throw new Error(reactionsError.message);
    clearCache(profile.id);
  }, [profile]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user: session?.user ?? null,
      profile,
      partner,
      profileError,
      reload,
      signIn,
      signUp,
      signOut,
      recovering,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      linkPartner,
      unlinkPartner,
      deleteAllData,
    }),
    [
      status,
      session,
      profile,
      partner,
      profileError,
      reload,
      signIn,
      signUp,
      signOut,
      recovering,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      linkPartner,
      unlinkPartner,
      deleteAllData,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth hors de AuthProvider');
  return context;
}
