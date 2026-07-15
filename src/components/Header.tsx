import { Clock, Sun, Moon } from 'lucide-react';
import type { Theme } from '../theme';

interface Props {
  lastUpdated: string;
  isDark: boolean;
  onToggleTheme: () => void;
  theme: Theme;
}

export default function Header({ lastUpdated, isDark, onToggleTheme, theme }: Props) {
  const date = new Date(lastUpdated);
  const formatted = date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{
      background: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Logo: black PNG recolored via CSS filter — purple in light, white in dark */}
        <img
          src="/elli-logo.png"
          alt="Elli"
          height={34}
          style={{
            display: 'block',
            filter: isDark
              ? 'invert(1)'
              : 'invert(31%) sepia(83%) saturate(800%) hue-rotate(255deg) brightness(85%)',
          }}
        />
        <div style={{ width: 1, height: 28, background: theme.border }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Pricing Signals Dashboard</div>
          <div style={{ fontSize: 12, color: '#00C896', fontWeight: 500 }}>Fleet Charging · Benchmark vs. Market</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Updated timestamp */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: theme.textMuted,
          background: isDark ? 'rgba(139,130,184,0.1)' : 'rgba(123,47,190,0.06)',
          padding: '6px 12px', borderRadius: 20,
          border: `1px solid ${theme.borderSubtle}`,
        }}>
          <Clock size={12} />
          <span>Updated: {formatted}</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: '50%',
            border: `1px solid ${theme.border}`,
            background: theme.surface2,
            color: theme.textMuted,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </div>
  );
}
