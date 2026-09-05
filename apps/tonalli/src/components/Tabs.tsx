import { NavLink } from 'react-router-dom';

import { useI18n } from '@/state/I18nProvider';

const icons = {
  today: (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  mine: (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect key={`${row}-${col}`} x={2 + col * 6} y={2 + row * 6} width="4.5" height="4.5" rx="1" fill="currentColor" />
        )),
      )}
    </svg>
  ),
  partner: (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
      <circle cx="7.5" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12.5" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
      <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function Tabs() {
  const { t } = useI18n();

  const items = [
    { to: '/', label: t('today.title'), icon: icons.today },
    { to: '/me', label: t('calendar.mine'), icon: icons.mine },
    { to: '/partner', label: t('calendar.partner'), icon: icons.partner },
    { to: '/settings', label: t('settings.title'), icon: icons.settings },
  ];

  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="tab">
            <span className="tab-glyph">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
