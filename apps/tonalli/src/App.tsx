import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { ErrorBanner, Loading } from '@/components/States';
import { Tabs } from '@/components/Tabs';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SignInScreen, SignUpScreen } from '@/routes/AuthScreens';
import { MyCalendarScreen, PartnerCalendarScreen } from '@/routes/CalendarScreens';
import { LinkPartnerScreen } from '@/routes/LinkPartner';
import { SettingsScreen } from '@/routes/Settings';
import { TodayScreen } from '@/routes/Today';
import { AuthProvider, useAuth } from '@/state/AuthProvider';
import { EntriesProvider } from '@/state/EntriesProvider';
import { I18nProvider, useI18n } from '@/state/I18nProvider';

function Splash() {
  return (
    <div className="app app--plain">
      <Loading />
    </div>
  );
}

/** Connexion obligatoire, et profil chargé avant d'aller plus loin. */
function RequireAuth() {
  const { t } = useI18n();
  const { status, profile, profileError, reload } = useAuth();

  if (status === 'loading') return <Splash />;
  if (status === 'signed-out') return <Navigate to="/sign-in" replace />;
  if (!profile) {
    if (profileError) {
      return (
        <div className="app app--plain stack">
          <ErrorBanner message={t('common.networkError')} onRetry={() => void reload()} />
        </div>
      );
    }
    return <Splash />;
  }
  return <Outlet />;
}

/** Tonalli ne se vit pas seul : sans binôme, on ne voit que l'écran de liaison. */
function RequirePartner() {
  const { profile } = useAuth();
  if (!profile?.partner_id) return <Navigate to="/link" replace />;
  return <Outlet />;
}

function PublicOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status === 'signed-in') return <Navigate to="/" replace />;
  return <Outlet />;
}

function LinkRoute() {
  const { profile } = useAuth();
  if (profile?.partner_id) return <Navigate to="/" replace />;
  return <LinkPartnerScreen />;
}

function AppShell() {
  return (
    <>
      <div className="app">
        <Outlet />
      </div>
      <Tabs />
    </>
  );
}

function ConfigMissing() {
  return (
    <div className="app app--plain stack">
      <h1>Tonalli</h1>
      <p className="muted">
        Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> sont
        absentes. Copie <code>.env.example</code> vers <code>.env</code> et renseigne-les.
      </p>
    </div>
  );
}

export function App() {
  if (!isSupabaseConfigured) return <ConfigMissing />;

  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <EntriesProvider>
            <Routes>
              <Route element={<PublicOnly />}>
                <Route path="/sign-in" element={<SignInScreen />} />
                <Route path="/sign-up" element={<SignUpScreen />} />
              </Route>

              <Route element={<RequireAuth />}>
                <Route path="/link" element={<LinkRoute />} />
                <Route element={<RequirePartner />}>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<TodayScreen />} />
                    <Route path="/me" element={<MyCalendarScreen />} />
                    <Route path="/partner" element={<PartnerCalendarScreen />} />
                    <Route path="/settings" element={<SettingsScreen />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </EntriesProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
