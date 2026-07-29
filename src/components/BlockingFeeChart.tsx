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

const CHART_MAX = 0.16; // €/min — 16 ct/min ceiling
const LABEL_WIDTH = 148;
const ROW_H = 56;

function pct(value: number): number {
  return (value / CHART_MAX) * 100;
}

function fmtRate(v: number): string {
  return `${(v * 100).toFixed(0)} ct/min`;
}

function fmtGrace(mins: number, lang: Lang): string {
  const after = t(lang, 'after');
  if (mins >= 60) return `${after} ${mins / 60}h`;
  return `${after} ${mins} min`;
}

const ticks = [0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16];

export default function BlockingFeeChart({ competitors, elliProviders, type, theme, lang }: Props) {
  const competitorRows = competitors
    .filter(p => p.blockingFees)
    .map(p => ({ provider: p, fee: p.blockingFees![type] as BlockingFeePoint, isElli: false, label: p.name }));

  const elliRows = elliProviders
    .filter(p => p.blockingFees)
    .map(p => ({ provider: p, fee: p.blockingFees![type] as BlockingFeePoint, isElli: true, label: p.name }));

  const competitorHeight = competitorRows.length * ROW_H;
  const totalHeight = competitorHeight + elliRows.length * ROW_H;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex' }}>
        {/* Labels */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
          {competitorRows.map(row => (
            <div key={row.label} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, fontSize: 12, color: theme.textMuted, whiteSpace: 'nowrap' }}>
              {row.label}
            </div>
          ))}
          {elliRows.map(row => (
            <div key={row.label} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, fontSize: 12, color: '#C084FC', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {row.label}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative', height: totalHeight }}>
          {/* Grid lines */}
          {ticks.map(t => (
            <div key={t} style={{
              position: 'absolute', left: `${pct(t)}%`, top: 0, bottom: 0,
              width: 1, background: theme.borderSubtle, pointerEvents: 'none',
            }} />
          ))}

          {/* Competitor rows */}
          {competitorRows.map((row, ri) => {
            const top = ri * ROW_H;
            const mid = top + ROW_H / 2;
            const fee = row.fee;

            if (fee.exempt) {
              return (
                <div key={row.label}>
                  <div style={{ position: 'absolute', left: 8, top: mid - 9, fontSize: 10, color: theme.textMuted, fontStyle: 'italic' }}>
                    {t(lang, 'acExempt')}
                  </div>
                </div>
              );
            }

            const barWidth = pct(fee.rate);
            const barColor = fee.rate >= 0.13 ? '#A83232' : fee.rate >= 0.10 ? '#A07010' : '#6E6890';

            const labelRight = barWidth > 78;
            const stackVertical = row.provider.name === 'Shell' || row.provider.name === 'Aral pulse';
            return (
              <div key={row.label}>
                {/* Grace period label — above bar */}
                <div style={{ position: 'absolute', left: 4, top: top + 5, fontSize: 10, color: theme.textMuted, fontStyle: 'italic' }}>
                  {fmtGrace(fee.graceMins, lang)}
                </div>
                {/* Bar */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  width: `${barWidth}%`,
                  top: mid - 4,
                  height: 8,
                  background: barColor,
                  borderRadius: 4,
                  opacity: 0.8,
                }} />
                {/* Triangle marker at rate */}
                <div style={{ position: 'absolute', left: `${barWidth}%`, top: mid - 5, transform: 'translateX(-50%)', zIndex: 3 }}>
                  <svg width={12} height={10} viewBox="0 0 12 10">
                    <polygon points="6,0 0,10 12,10" fill={barColor} />
                  </svg>
                </div>
                {/* Rate label — flipped left when bar is wide to avoid overflow */}
                {labelRight ? (
                  <>
                    <div style={{
                      position: 'absolute', right: `calc(${100 - barWidth}% + 20px)`, top: mid - 16,
                      fontSize: 10, color: barColor, whiteSpace: 'nowrap', fontWeight: 600, zIndex: 3, textAlign: 'right',
                    }}>
                      {fmtRate(fee.rate)}
                    </div>
                    {fee.cap != null && <div style={{
                      position: 'absolute', right: `calc(${100 - barWidth}% + 20px)`, top: mid + 8,
                      fontSize: 10, color: theme.textMuted, fontWeight: 400, zIndex: 3, textAlign: 'right',
                    }}>{t(lang, 'max')} € {fee.cap.toFixed(2).replace('.', ',')}</div>}
                    {fee.cap == null && fee.rate > 0 && <div style={{
                      position: 'absolute', right: `calc(${100 - barWidth}% + 20px)`, top: mid + 8,
                      fontSize: 9, color: '#A83232', fontWeight: 400, zIndex: 3, textAlign: 'right',
                    }}>{t(lang, 'noCap')}</div>}
                  </>
                ) : stackVertical ? (
                  <>
                    <div style={{
                      position: 'absolute', left: `calc(${barWidth}% + 8px)`, top: mid - 5,
                      fontSize: 10, color: barColor, whiteSpace: 'nowrap', fontWeight: 600, zIndex: 3,
                    }}>
                      {fmtRate(fee.rate)}
                    </div>
                    {fee.cap != null && <div style={{
                      position: 'absolute', left: `calc(${barWidth}% + 8px)`, top: mid + 8,
                      fontSize: 10, color: theme.textMuted, fontWeight: 400, whiteSpace: 'nowrap', zIndex: 3,
                    }}>{t(lang, 'max')} € {fee.cap.toFixed(2).replace('.', ',')}</div>}
                    {fee.cap == null && fee.rate > 0 && <div style={{
                      position: 'absolute', left: `calc(${barWidth}% + 8px)`, top: mid + 8,
                      fontSize: 9, color: '#A83232', fontWeight: 400, whiteSpace: 'nowrap', zIndex: 3,
                    }}>{t(lang, 'noCap')}</div>}
                  </>
                ) : (
                  <div style={{
                    position: 'absolute', left: `calc(${barWidth}% + 8px)`, top: mid - 5,
                    fontSize: 10, color: barColor, whiteSpace: 'nowrap', fontWeight: 600, zIndex: 3,
                  }}>
                    {fmtRate(fee.rate)}
                    {fee.cap != null && <span style={{ color: theme.textMuted, fontWeight: 400 }}> · {t(lang, 'max')} € {fee.cap.toFixed(2).replace('.', ',')}</span>}
                    {fee.cap == null && fee.rate > 0 && <span style={{ color: '#A83232', fontWeight: 400, fontSize: 9 }}> · {t(lang, 'noCap')}</span>}
                  </div>
                )}
                {/* Note — just below bar */}
                {fee.note && (
                  <div style={{ position: 'absolute', left: 4, top: mid + 10, fontSize: 9, color: theme.textMuted, opacity: 0.65 }}>
                    {fee.note}
                  </div>
                )}
              </div>
            );
          })}

          {/* Elli rows */}
          {elliRows.map((row, ei) => {
            const top = competitorHeight + ei * ROW_H;
            const mid = top + ROW_H / 2;
            const fee = row.fee;
            const barWidth = pct(fee.rate);
            const elliColor = '#00C896';

            return (
              <div key={row.label}>
                {/* Elli highlight band */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, top, height: ROW_H,
                  background: 'rgba(123, 47, 190, 0.10)',
                  borderTop: ei === 0 ? '1px solid rgba(123, 47, 190, 0.3)' : '1px solid rgba(123, 47, 190, 0.12)',
                  borderBottom: ei === elliRows.length - 1 ? '1px solid rgba(123, 47, 190, 0.3)' : 'none',
                }} />
                {/* Grace period label */}
                <div style={{ position: 'absolute', left: 4, top: top + 4, fontSize: 10, color: '#C084FC', fontStyle: 'italic' }}>
                  {fmtGrace(fee.graceMins, lang)}
                </div>
                {/* Filled bar */}
                <div style={{
                  position: 'absolute', left: 0, width: `${barWidth}%`,
                  top: mid - 4, height: 8,
                  background: elliColor, borderRadius: 4, opacity: 0.9, zIndex: 2,
                }} />
                {/* Triangle */}
                <div style={{ position: 'absolute', left: `${barWidth}%`, top: mid - 5, transform: 'translateX(-50%)', zIndex: 3 }}>
                  <svg width={12} height={10} viewBox="0 0 12 10">
                    <polygon points="6,0 0,10 12,10" fill={elliColor} />
                  </svg>
                </div>
                {/* Rate label */}
                <div style={{ position: 'absolute', left: `calc(${barWidth}% + 8px)`, top: mid - 5, fontSize: 10, color: elliColor, whiteSpace: 'nowrap', fontWeight: 700, zIndex: 3 }}>
                  {fmtRate(fee.rate)}
                  {fee.cap != null && <span style={{ color: theme.textMuted, fontWeight: 400 }}> · {t(lang, 'max')} € {fee.cap.toFixed(2).replace('.', ',')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis */}
      <div style={{ display: 'flex', marginTop: 8 }}>
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
        <div style={{ flex: 1, position: 'relative', height: 18 }}>
          {ticks.map(t => (
            <div key={t} style={{ position: 'absolute', left: `${pct(t)}%`, fontSize: 10, color: theme.textMuted, transform: 'translateX(-50%)' }}>
              {t === 0 ? '0' : `${(t * 100).toFixed(0)} ct`}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 3, background: '#6E6890', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>{t(lang, 'competitorModerate')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 3, background: '#A07010', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>{t(lang, 'competitorHigh')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 3, background: '#A83232', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>{t(lang, 'competitorVeryHigh')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 3, background: '#00C896', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: theme.textMuted }}>Elli</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: theme.textMuted, fontStyle: 'italic', opacity: 0.6 }}>
          {t(lang, 'allRatesMin')}
        </div>
      </div>
    </div>
  );
}
