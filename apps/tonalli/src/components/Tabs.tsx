import { NavLink } from 'react-router-dom';

import { useI18n } from '@/state/I18nProvider';

const icons = {
  today: (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </svg>
  ),
  mine: (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden>
      <rect x="3.2" y="5" width="17.6" height="16" rx="4" />
      <path d="M8 3v3M16 3v3M3.4 10.5h17.2" />
    </svg>
  ),
  partner: (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8.5" cy="12" r="5.3" />
      <circle cx="15.5" cy="12" r="5.3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden>
      <path d="M4 7h6M14 7h6M4 17h3M11 17h9" />
      <circle cx="12" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
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
