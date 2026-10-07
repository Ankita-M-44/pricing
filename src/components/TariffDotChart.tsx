import { useState } from 'react';
import type { Theme } from '../theme';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import type { Model, DotRow } from '../tariffModel';

interface Props {
  model: Model;
  theme: Theme;
  lang: Lang;
  /** screen: hover/tap tooltips and a legend. pdf: static, tighter rows, no legend. */
  variant?: 'screen' | 'pdf';
}

const ELLI = '#6941C6';
const LILAC = '#8E80C4';
const NAME_W = { screen: 220, pdf: 190 } as const;
const GEOM = {
  screen: { cell: 72, top: 9, rowPad: 8 },
  pdf: { cell: 56, top: 7, rowPad: 6 },
} as const;

const fmt = (v: number) => v.toFixed(2).replace('.', ',');

export default function TariffDotChart({ model, theme, lang, variant = 'screen' }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const interactive = variant === 'screen';
  const g = GEOM[variant];
  const nameW = NAME_W[variant];
  const { lo, hi } = model.scale;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const upFrom = Math.ceil(model.rows.length / 2);

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 860 }}>
          {/* Axis */}
          <div style={{ display: 'flex', paddingBottom: 6, borderBottom: `1px solid ${theme.border}` }} aria-hidden="true">
            <div style={{ width: nameW, flexShrink: 0 }} />
            <div style={{ flex: 1, position: 'relative', height: 16, marginRight: 24 }}>
              {model.scale.ticks.map(tk => (
                <span key={tk.value} style={{ position: 'absolute', left: `${pct(tk.value)}%`, transform: 'translateX(-50%)', fontSize: 11, color: theme.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {tk.label}
                </span>
              ))}
            </div>
          </div>

          {model.rows.map((row, ri) => (
            <Row
              key={row.id} lang={lang} row={row} ri={ri} up={ri >= upFrom} theme={theme}
              nameW={nameW} g={g} pct={pct} ticks={model.scale.ticks.map(x => x.value)}
              interactive={interactive} open={open} setOpen={setOpen}
            />
          ))}
        </div>
      </div>

      {variant === 'screen' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 12, color: theme.textMuted, borderTop: `1px solid ${theme.border}`, paddingTop: 14, marginTop: 8 }}>
          <Legend swatch={<span style={{ width: 8, height: 8, borderRadius: 4, background: ELLI }} />} label={t(lang, 'lgElli')} />
          <Legend swatch={<span style={{ width: 8, height: 8, borderRadius: 4, background: LILAC }} />} label={t(lang, 'lgTier')} />
          <Legend swatch={<span style={{ width: 28, height: 6, borderRadius: 3, background: '#EEEAF7' }} />} label={t(lang, 'lgBand')} />
          <Legend swatch={<span style={{ width: 2, height: 10, borderRadius: 1, background: LILAC }} />} label={t(lang, 'lgMax')} />
          <span>{t(lang, 'lgVat')}</span>
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{swatch}{label}</span>;
}

interface RowProps {
  lang: Lang;
  row: DotRow;
  ri: number;
  up: boolean;
  theme: Theme;
  nameW: number;
  g: { cell: number; top: number; rowPad: number };
  pct: (v: number) => number;
  ticks: number[];
  interactive: boolean;
  open: string | null;
  setOpen: (id: string | null) => void;
}

function Row({ lang, row, ri, up, theme, nameW, g, pct, ticks, interactive, open, setOpen }: RowProps) {
  const color = row.isElli ? ELLI : LILAC;
  const dotCenter = g.top + 20; // key label (12) + gap (4) + half the dot (4)

  // Neighbouring dots closer than MIN_SEP (% of the axis) push their labels apart; the dots stay put
  const MIN_SEP = 7, PX_PER_PCT = 8;
  const order = row.points.map((pt, i) => ({ i, x: pct(pt.value) })).sort((a, b) => a.x - b.x);
  const shift = row.points.map(() => 0);
  for (let k = 0; k < order.length - 1; k++) {
    const gap = order[k + 1].x - order[k].x;
    if (gap < MIN_SEP) {
      const d = Math.min(40, ((MIN_SEP - gap) / 2) * PX_PER_PCT);
      shift[order[k].i] -= d;
      shift[order[k + 1].i] += d;
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: `${g.rowPad}px 0`,
      borderBottom: `1px solid ${theme.borderSubtle}`, breakInside: 'avoid',
      background: row.isElli ? '#FAF8FF' : 'transparent',
    }}>
      <div style={{ width: nameW, flexShrink: 0, paddingLeft: 12, paddingRight: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: row.isElli ? ELLI : theme.text }}>{row.name}</div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 3, lineHeight: '15px' }}>{row.sub}</div>
      </div>

      <div style={{ flex: 1, position: 'relative', height: g.cell, marginRight: 24 }}>
        {ticks.map(v => (
          <div key={v} aria-hidden="true" style={{ position: 'absolute', top: -g.rowPad, bottom: -g.rowPad, width: 1, background: '#F1EFF6', left: `${pct(v)}%` }} />
        ))}
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: dotCenter - 0.5, height: 1, background: '#E4E0EE' }} />
        <div aria-hidden="true" style={{
          position: 'absolute', top: dotCenter - 3, height: 6, borderRadius: 3,
          background: row.isElli ? '#E3D9F8' : '#EEEAF7',
          left: `${pct(row.bandMin)}%`, width: `${Math.max(pct(row.bandMax) - pct(row.bandMin), 0.6)}%`,
        }} />

        {row.maxMark != null && (
          <div
            title={`${t(lang, 'lgMax')}: ${fmt(row.maxMark)} €/kWh`}
            style={{ position: 'absolute', top: g.top, left: `${pct(row.maxMark)}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          >
            <span style={{ display: 'block', height: 12, fontSize: 10, fontWeight: 500, lineHeight: '12px', color: '#7E7896' }}>{t(lang, 'max')}</span>
            <span style={{ width: 2, height: 10, margin: '-1px 0', borderRadius: 1, background: LILAC }} />
            <span style={{ fontSize: 11, fontWeight: 600, lineHeight: '13px', whiteSpace: 'nowrap', color: '#4A4560', fontVariantNumeric: 'tabular-nums' }}>{fmt(row.maxMark)} €</span>
          </div>
        )}

        {row.points.map((pt, pi) => {
          const id = `${ri}:${pi}`;
          const isOpen = interactive && open === id;
          const x = pct(pt.value);
          const label = `${pt.title}${pt.key && !pt.title.endsWith(pt.key) ? ` ${pt.key}` : ''}, ${fmt(pt.value)} €`;

          // Dots at the very edges anchor their labels inward so long labels don't spill out of the chart
          const anchor = x < 12 ? 'start' : x > 88 ? 'end' : 'center';
          const labelShift: React.CSSProperties = { position: 'relative', left: shift[pi] };
          const inner = (
            <>
              <span style={{ ...labelShift, display: 'block', height: 12, fontSize: 10, fontWeight: 500, lineHeight: '12px', whiteSpace: 'nowrap', color: row.isElli ? '#8A63DD' : '#7E7896' }}>{pt.key}</span>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: isOpen ? `0 0 0 4px ${row.isElli ? '#E3D9F8' : '#EEEAF7'}` : 'none' }} />
              <span style={{ ...labelShift, fontSize: 11, fontWeight: 600, lineHeight: '13px', whiteSpace: 'nowrap', color: row.isElli ? ELLI : '#4A4560', fontVariantNumeric: 'tabular-nums' }}>{fmt(pt.value)} €</span>
            </>
          );
          const innerStyle: React.CSSProperties = {
            display: 'flex', flexDirection: 'column', alignItems: anchor === 'start' ? 'flex-start' : anchor === 'end' ? 'flex-end' : 'center', gap: 4,
            background: 'none', border: 0, padding: '4px 6px', margin: '-4px -6px', font: 'inherit', borderRadius: 6,
          };

          return (
            <div
              key={pi}
              style={{
                position: 'absolute', top: g.top, left: `${x}%`, zIndex: isOpen ? 40 : 1,
                transform: anchor === 'start' ? 'translateX(-4px)' : anchor === 'end' ? 'translateX(calc(-100% + 4px))' : 'translateX(-50%)',
              }}
              onMouseEnter={interactive ? () => setOpen(id) : undefined}
              onMouseLeave={interactive ? () => setOpen(open === id ? null : open) : undefined}
            >
              {interactive ? (
                <button
                  type="button" aria-label={label} aria-expanded={isOpen}
                  onClick={() => setOpen(open === id ? null : id)}
                  onFocus={() => setOpen(id)} onBlur={() => setOpen(open === id ? null : open)}
                  style={{ ...innerStyle, cursor: 'pointer' }}
                >
                  {inner}
                </button>
              ) : (
                <div style={innerStyle}>{inner}</div>
              )}

              {isOpen && (
                <div role="tooltip" style={{
                  position: 'absolute', width: 360, zIndex: 50, boxSizing: 'border-box',
                  background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 18px',
                  boxShadow: '0 8px 24px rgba(43, 36, 64, 0.14)', pointerEvents: 'none', textAlign: 'left',
                  ...(x < 22 ? { left: -12 } : x > 72 ? { right: -12 } : { left: '50%', transform: 'translateX(-50%)' }),
                  ...(up ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: row.isElli ? ELLI : theme.text }}>{pt.title}</div>
                  {pt.packet.map((pr, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', gap: 20, padding: '6px 0',
                      fontSize: 12, lineHeight: '16px',
                      borderTop: i > 0 ? `1px solid ${theme.borderSubtle}` : 'none',
                    }}>
                      <span style={{ color: theme.textMuted, flexShrink: 0, whiteSpace: 'nowrap' }}>{pr.label}</span>
                      <span style={{ fontWeight: 600, textAlign: 'right', color: theme.text }}>{pr.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
