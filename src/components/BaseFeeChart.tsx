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

const CHART_MAX = 12;
const NAME_W = 144;
const CARD_PAD = 32;

function barPct(amount: number): number {
  return Math.min((amount / CHART_MAX) * 100, 100);
}

function fmt(v: number): string {
  return `€ ${v.toFixed(2).replace('.', ',')}`;
}

export default function BaseFeeChart({ competitors, elliProviders, theme, lang }: Props) {
  const elliRows: Array<{ label: string; amount: number; opacity?: number }> = [
    { label: 'Flex', amount: 3.50, opacity: 0.5 },
    ...elliProviders.map((p, i) => ({
      label: p.name.replace(/^Elli\s+[–-]\s*/, '').replace(/^Elli\s+/, ''),
      amount: p.monthlyFee,
      opacity: i === 0 ? 0.7 : 1.0,
    })),
  ];

  const competitorRows: Array<{ label: string; amount: number; note?: string }> = [];
  for (const p of competitors) {
    for (const bf of p.baseFees ?? []) {
      const suffix = bf.tier ? ` ${bf.tier}` : '';
      competitorRows.push({ label: `${p.name}${suffix}`, amount: bf.amount, note: bf.note });
    }
  }

  const renderElliRow = (row: { label: string; amount: number; opacity?: number }, idx: number) => (
    <div key={row.label} style={{
      display: 'flex', alignItems: 'center',
      background: '#F4F0FF',
      margin: `0 -${CARD_PAD}px`, padding: `10px ${CARD_PAD}px`,
      borderTop: idx === 0 ? '1px solid #D9D6FE' : 'none',
      borderBottom: '1px solid #D9D6FE',
    }}>
      <div style={{ width: NAME_W, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#6941C6', paddingRight: 12 }}>
        {`Elli ${row.label}`}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        {row.amount === 0 ? (
          <>
            <div style={{ flex: 1, height: 6, background: theme.borderSubtle, borderRadius: 3 }} />
            <span style={{ width: 110, textAlign: 'right', fontSize: 13, fontWeight: 700, color: theme.textMuted, fontStyle: 'italic' }}>
              {t(lang, 'noBaseFee')}
            </span>
          </>
        ) : (
          <>
            <div style={{ flex: 1, height: 6, background: theme.borderSubtle, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${barPct(row.amount)}%`, height: '100%', background: '#6941C6', borderRadius: 3, opacity: row.opacity ?? 1 }} />
            </div>
            <span style={{ width: 110, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#6941C6', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {fmt(row.amount)}
            </span>
          </>
        )}
      </div>
    </div>
  );

  const renderCompetitorRow = (row: { label: string; amount: number; note?: string }, idx: number) => (
    <div key={row.label} style={{
      display: 'flex', alignItems: 'center',
      padding: '10px 0',
      borderBottom: idx < competitorRows.length - 1 ? `1px solid ${theme.borderSubtle}` : 'none',
    }}>
      <div style={{ width: NAME_W, flexShrink: 0, fontSize: 13, fontWeight: 600, color: theme.text, paddingRight: 12 }}>
        {row.label}
        {row.note && <small style={{ display: 'block', fontSize: 11, fontWeight: 400, color: theme.textMuted, marginTop: 2 }}>{row.note}</small>}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        {row.amount === 0 ? (
          <>
            <div style={{ flex: 1, height: 6, background: theme.borderSubtle, borderRadius: 3 }} />
            <span style={{ width: 110, textAlign: 'right', fontSize: 13, fontWeight: 700, color: theme.textMuted, fontStyle: 'italic' }}>—</span>
          </>
        ) : (
          <>
            <div style={{ flex: 1, height: 6, background: theme.borderSubtle, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${barPct(row.amount)}%`, height: '100%', background: '#D0D5DD', borderRadius: 3 }} />
            </div>
            <span style={{ width: 110, textAlign: 'right', fontSize: 13, fontWeight: 700, color: theme.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {fmt(row.amount)}
            </span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
        {t(lang, 'monthlyFeePerCard')}
      </div>

      {elliRows.map((row, i) => renderElliRow(row, i))}
      {competitorRows.map((row, i) => renderCompetitorRow(row, i))}

      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap', alignItems: 'center', paddingTop: 14, borderTop: `1px solid ${theme.borderSubtle}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 6, background: '#6941C6', borderRadius: 3 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>Elli</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 6, background: '#D0D5DD', borderRadius: 3 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>{t(lang, 'competitor')}</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: theme.textMuted, fontStyle: 'italic', opacity: 0.6 }}>
          {t(lang, 'allValuesMonth')}
        </div>
      </div>
    </div>
  );
}
