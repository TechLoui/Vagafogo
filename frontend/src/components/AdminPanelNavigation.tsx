import type { IconType } from 'react-icons';
import { FaMoon, FaSun } from 'react-icons/fa';
import logo from '../assets/logo.jpg';
import './AdminPanelLayout.css';

type Props<T extends string> = {
  tabs: ReadonlyArray<{ id: T; label: string; icon: IconType }>;
  activeTab: T;
  onSelect: (tab: T) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

export default function AdminPanelNavigation<T extends string>({
  tabs, activeTab, onSelect, theme, onToggleTheme,
}: Props<T>) {
  const ThemeIcon = theme === 'dark' ? FaSun : FaMoon;
  const themeLabel = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';

  return (
    <header className="admin-panel-navigation">
      <div className="admin-panel-navigation__brand">
        <img src={logo} alt="Vagafogo" width={42} height={42} />
      </div>
      <nav className="admin-panel-navigation__tabs" aria-label="Abas do painel">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="admin-panel-navigation__theme"
        aria-label={themeLabel}
        title={themeLabel}
        onClick={onToggleTheme}
      >
        <ThemeIcon aria-hidden="true" />
      </button>
    </header>
  );
}
