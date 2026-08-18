import { Clock, Sun, Moon, FileDown } from 'lucide-react';
import type { Theme } from '../theme';
import type { Lang } from '../i18n';
import { t } from '../i18n';

interface Props {
  lastUpdated: string;
  isDark: boolean;
  onToggleTheme: () => void;
  theme: Theme;
  lang: Lang;
  onToggleLang: () => void;
  onExportPdf: () => void;
}

export default function Header({ lastUpdated, isDark, onToggleTheme, theme, lang, onToggleLang, onExportPdf }: Props) {
  const date = new Date(lastUpdated);
  const formatted = date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const pillStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: theme.textMuted,
    background: isDark ? 'rgba(155,139,244,0.08)' : 'rgba(105,65,198,0.05)',
    padding: '6px 12px', borderRadius: 20,
    border: `1px solid ${theme.borderSubtle}`,
  };

  return (
    <div style={{
      background: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      boxShadow: isDark ? 'none' : '0 1px 8px rgba(107, 95, 168, 0.07)',
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
          height={24}
          style={{
            display: 'block',
            maxWidth: '60px',
            filter: isDark
              ? 'invert(1) brightness(0.85)'
              : 'invert(28%) sepia(60%) saturate(900%) hue-rotate(240deg) brightness(80%)',
          }}
        />
        <div style={{ width: 1, height: 28, background: theme.border }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Pricing Signals Dashboard</div>
          <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 400 }}>Fleet Charging · Benchmark vs. Market</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="no-print">
        {/* Updated timestamp */}
        <div style={pillStyle}>
          <Clock size={12} />
          <span>{t(lang, 'lastUpdated')}: {formatted}</span>
        </div>

        {/* Export PDF */}
        <button
          onClick={onExportPdf}
          title={t(lang, 'exportPdf')}
          style={{
            ...pillStyle,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <FileDown size={13} />
          <span>{t(lang, 'exportPdf')}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={onToggleLang}
          title={lang === 'en' ? 'Auf Deutsch wechseln' : 'Switch to English'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 34, padding: '0 12px', borderRadius: 17,
            border: `1px solid ${theme.border}`,
            background: theme.surface2,
            color: theme.text,
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {lang === 'en' ? 'DE' : 'EN'}
        </button>

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
