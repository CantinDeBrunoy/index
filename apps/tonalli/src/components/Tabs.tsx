import { Link, useLocation } from 'react-router-dom';

import { useI18n } from '@/state/I18nProvider';

/**
 * La barre du bas : trois icônes, sans texte, comme sur la maquette. Le nom de
 * chaque onglet reste là pour les lecteurs d'écran (et en infobulle) ; « Son
 * calendrier » n'a plus d'onglet à lui, c'est une bascule en tête du
 * calendrier.
 */
const icons = {
  // La goutte du personnage : Aujourd'hui, c'est lui.
  today: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12,3 C17,3 20,8 19,13 C21,17 18,21 12,21 C6,21 3,17 5,13 C4,8 7,3 12,3 Z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12,3 L12,6 M12,18 L12,21 M3,12 L6,12 M18,12 L21,12 M5.6,5.6 L7.8,7.8 M16.2,16.2 L18.4,18.4 M18.4,5.6 L16.2,7.8 M7.8,16.2 L5.6,18.4" />
    </svg>
  ),
};

export function Tabs() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  // Un onglet couvre aussi les écrans qu'on ouvre depuis lui.
  const items = [
    { to: '/', label: t('today.title'), icon: icons.today, active: pathname === '/' || pathname.startsWith('/day') },
    { to: '/me', label: t('calendar.title'), icon: icons.calendar, active: pathname === '/me' || pathname === '/partner' },
    { to: '/settings', label: t('settings.title'), icon: icons.settings, active: pathname === '/settings' || pathname === '/character' },
  ];

  return (
    <nav className="tabbar" aria-label={t('common.navigation')}>
      <div className="tabbar-inner">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="tab"
            aria-current={item.active ? 'page' : undefined}
            title={item.label}
          >
            <span className="tab-glyph">{item.icon}</span>
            <span className="visually-hidden">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
