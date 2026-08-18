import type { CompetitorProvider, ElliProvider, BlockingFeePoint } from '../types';
import type { Theme } from '../theme';
import type { Lang } from '../i18n';
import { t } from '../i18n';

interface Props {
  competitors: CompetitorProvider[];
  elliProviders: ElliProvider[];
  type: 'ac' | 'dc';
  theme: Theme;
  lang: Lang;
}

const CHART_MAX = 0.15;
const NAME_W = 144;
const CARD_PAD = 32;

function barPct(rate: number): number {
  return Math.min((rate / CHART_MAX) * 100, 100);
}

function fmtRate(v: number): string {
  return `${(v * 100).toFixed(0).replace('.', ',')} ct/min`;
}

function fmtGrace(mins: number): string {
  if (mins >= 60) return `After ${mins / 60}h`;
  return `After ${mins} min`;
}

export default function BlockingFeeChart({ competitors, elliProviders, type, theme, lang }: Props) {
  const elliRows = elliProviders
    .filter(p => p.blockingFees?.[type] && !p.blockingFees[type].exempt)
    .map(p => ({ label: p.name.replace(/^Elli\s+[–-]\s*/, '').replace(/^Elli\s+/, ''), fee: p.blockingFees![type] as BlockingFeePoint, isElli: true }));

  const competitorRows = competitors
    .filter(p => p.blockingFees?.[type])
    .map(p => {
      const fee = p.blockingFees![type] as BlockingFeePoint;
      const sub = fee.note ? fee.note : undefined;
      return { label: p.name, fee, sub };
    });

  const renderRow = (
    key: string,
    label: string,
    sublabel: string | undefined,
    fee: BlockingFeePoint,
    isElli: boolean,
  ) => {
    const color = isElli ? '#6941C6' : '#D0D5DD';
    const valColor = isElli ? '#6941C6' : theme.text;

    const rowStyle: React.CSSProperties = isElli ? {
      display: 'flex', alignItems: 'center',
      background: '#F4F0FF',
      margin: `0 -${CARD_PAD}px`, padding: `10px ${CARD_PAD}px`,
      borderTop: '1px solid #D9D6FE', borderBottom: '1px solid #D9D6FE',
    } : {
      display: 'flex', alignItems: 'center',
      padding: '10px 0',
      borderBottom: `1px solid ${theme.borderSubtle}`,
    };

    if (fee.exempt) {
      return (
        <div key={key} style={rowStyle}>
          <div style={{ width: NAME_W, flexShrink: 0, fontSize: 13, fontWeight: 600, color: isElli ? '#6941C6' : theme.text, paddingRight: 12 }}>
            {label}
            <small style={{ display: 'block', fontSize: 11, fontWeight: 400, color: theme.textMuted, marginTop: 2 }}>{t(lang, 'acExempt')}</small>
          </div>
          <div style={{ flex: 1, height: 6, background: theme.borderSubtle, borderRadius: 3 }} />
        </div>
      );
    }

    const grace = fmtGrace(fee.graceMins);
    const graceLabel = fee.note ? `${grace} · ${fee.note}` : grace;

    return (
      <div key={key} style={rowStyle}>
        <div style={{ width: NAME_W, flexShrink: 0, fontSize: 13, fontWeight: 600, color: isElli ? '#6941C6' : theme.text, paddingRight: 12 }}>
          {label}
          <small style={{ display: 'block', fontSize: 11, fontWeight: 400, color: theme.textMuted, marginTop: 2 }}>{graceLabel}</small>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: theme.borderSubtle, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${barPct(fee.rate)}%`, height: '100%', background: color, borderRadius: 3 }} />
          </div>
          <span style={{ width: 110, textAlign: 'right', fontSize: 13, fontWeight: 700, color: valColor, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {fmtRate(fee.rate)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {elliRows.map(r => renderRow(`elli-${r.label}`, r.label, undefined, r.fee, true))}
      {competitorRows.map(r => renderRow(r.label, r.label, r.sub, r.fee, false))}

      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap', alignItems: 'center', paddingTop: 14, borderTop: `1px solid ${theme.borderSubtle}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 6, background: '#6941C6', borderRadius: 3 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>Elli</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 6, background: '#D0D5DD', borderRadius: 3 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>{t(lang, 'competitor')}</span>
        </div>
      </div>
    </div>
  );
}
