import type { CompetitorProvider, ElliProvider } from '../types';
import type { Theme } from '../theme';
import type { Lang } from '../i18n';
import { t } from '../i18n';

interface Props {
  competitors: CompetitorProvider[];
  elliProviders: ElliProvider[];
  theme: Theme;
  lang: Lang;
}

const CHART_MAX = 20; // € / card / month
const LABEL_WIDTH = 148;
const ROW_H = 44;

function pct(value: number): number {
  return (value / CHART_MAX) * 100;
}

function fmt(v: number): string {
  return `€ ${v.toFixed(2).replace('.', ',')}`;
}

const ticks = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20];

export default function BaseFeeChart({ competitors, elliProviders, theme, lang }: Props) {
  const competitorRows: Array<{ label: string; amount: number; note?: string }> = [];
  for (const p of competitors) {
    for (const bf of p.baseFees ?? []) {
      const suffix = bf.tier ? ` ${bf.tier}` : '';
      competitorRows.push({ label: `${p.name}${suffix}`, amount: bf.amount, note: bf.note });
    }
  }

  const elliRows: Array<{ label: string; amount: number; note?: string }> = [
    { label: 'Elli – Flex', amount: 3.50 },
    ...elliProviders.map(p => ({ label: p.name, amount: p.monthlyFee })),
  ];

  const elliHeight = elliRows.length * ROW_H;
  const totalHeight = competitorRows.length * ROW_H + elliHeight;

  const renderBar = (amount: number, mid: number, color: string, bold: boolean) => {
    if (amount === 0) {
      return (
        <div style={{ position: 'absolute', left: 8, top: mid - 6, fontSize: 10, color: theme.textMuted, fontStyle: 'italic' }}>
          {t(lang, 'noBaseFee')}
        </div>
      );
    }
    const barWidth = pct(amount);
    return (
      <>
        <div style={{
          position: 'absolute', left: 0, width: `${barWidth}%`,
          top: mid - 4, height: 8,
          background: color, borderRadius: 4, opacity: bold ? 0.9 : 0.8, zIndex: 2,
        }} />
        <div style={{ position: 'absolute', left: `${barWidth}%`, top: mid - 5, transform: 'translateX(-50%)', zIndex: 3 }}>
          <svg width={12} height={10} viewBox="0 0 12 10">
            <polygon points="6,0 0,10 12,10" fill={color} />
          </svg>
        </div>
        <div style={{
          position: 'absolute', left: `calc(${barWidth}% + 8px)`, top: mid - 5,
          fontSize: 10, color, whiteSpace: 'nowrap', fontWeight: bold ? 700 : 600, zIndex: 3,
        }}>
          {fmt(amount)}
        </div>
      </>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16 }}>
        {t(lang, 'monthlyFeePerCard')}
      </div>
      <div style={{ display: 'flex' }}>
        {/* Labels */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
          {elliRows.map(row => (
            <div key={row.label} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, fontSize: 12, color: '#C084FC', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {row.label}
            </div>
          ))}
          {competitorRows.map(row => (
            <div key={row.label} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, fontSize: 12, color: theme.textMuted, whiteSpace: 'nowrap' }}>
              {row.label}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative', height: totalHeight }}>
          {ticks.map(tick => (
            <div key={tick} style={{
              position: 'absolute', left: `${pct(tick)}%`, top: 0, bottom: 0,
              width: 1, background: theme.borderSubtle, pointerEvents: 'none',
            }} />
          ))}

          {/* Competitor rows */}
          {competitorRows.map((row, ri) => {
            const top = elliHeight + ri * ROW_H;
            const mid = top + ROW_H / 2;
            return (
              <div key={row.label}>
                {renderBar(row.amount, mid, '#6E6890', false)}
                {row.note && (
                  <div style={{ position: 'absolute', left: 4, top: mid + 10, fontSize: 9, color: theme.textMuted, opacity: 0.65 }}>
                    {row.note}
                  </div>
                )}
              </div>
            );
          })}

          {/* Elli rows */}
          {elliRows.map((row, ei) => {
            const top = ei * ROW_H;
            const mid = top + ROW_H / 2;
            return (
              <div key={row.label}>
                <div style={{
                  position: 'absolute', left: 0, right: 0, top, height: ROW_H,
                  background: 'rgba(123, 47, 190, 0.10)',
                  borderTop: ei === 0 ? '1px solid rgba(123, 47, 190, 0.3)' : '1px solid rgba(123, 47, 190, 0.12)',
                  borderBottom: ei === elliRows.length - 1 ? '1px solid rgba(123, 47, 190, 0.3)' : 'none',
                }} />
                {renderBar(row.amount, mid, '#00C896', true)}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis */}
      <div style={{ display: 'flex', marginTop: 8 }}>
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
        <div style={{ flex: 1, position: 'relative', height: 18 }}>
          {ticks.map(tick => (
            <div key={tick} style={{ position: 'absolute', left: `${pct(tick)}%`, fontSize: 10, color: theme.textMuted, transform: 'translateX(-50%)' }}>
              {tick === 0 ? '0' : `€ ${String(tick).replace('.', ',')}`}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 3, background: '#6E6890', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>{t(lang, 'competitor')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 3, background: '#00C896', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>Elli</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: theme.textMuted, fontStyle: 'italic', opacity: 0.6 }}>
          {t(lang, 'allValuesMonth')}
        </div>
      </div>
    </div>
  );
}
