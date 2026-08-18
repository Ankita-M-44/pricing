import { useState } from 'react';
import type { CompetitorProvider, ElliProvider, ChargingType } from '../types';
import type { Theme } from '../theme';
import type { Lang } from '../i18n';
import { t as tr } from '../i18n';

interface Props {
  competitors: CompetitorProvider[];
  elliProviders: ElliProvider[];
  type: 'ac' | 'dc';
  theme: Theme;
  lang: Lang;
}

const CHART_MIN = 0.20;
const CHART_MAX = 0.90;
const LABEL_WIDTH = 148;
const ROW_H = 38;

function pct(value: number): number {
  return ((value - CHART_MIN) / (CHART_MAX - CHART_MIN)) * 100;
}

function fmt(v: number): string {
  return `€ ${v.toFixed(2).replace('.', ',')}`;
}

interface ElliMarker {
  value: number;
  color: string;
  label: string;
}

function getElliMarkersForRow(provider: ElliProvider, type: ChargingType): ElliMarker[] {
  const tier = provider.tiers[0];
  if (type === 'ac') {
    return [{ value: tier.ac.price, color: '#6941C6', label: `AC ${fmt(tier.ac.price)}` }];
  }
  return [
    { value: tier.dc.spn,     color: provider.id === 'elli-control' ? '#EC4899' : '#C026D3', label: `SPN ${fmt(tier.dc.spn)}` },
    { value: tier.dc.general, color: '#6941C6', label: `DC ${fmt(tier.dc.general)}` },
    { value: tier.dc.enbw,    color: '#F97316', label: `EnBW ${fmt(tier.dc.enbw)}` },
  ];
}

function getAllElliLines(elliProviders: ElliProvider[], type: ChargingType) {
  const seen = new Map<number, { color: string; label: string }>();
  for (const p of elliProviders) {
    for (const m of getElliMarkersForRow(p, type)) {
      if (!seen.has(m.value)) seen.set(m.value, { color: m.color, label: m.label });
    }
  }
  return Array.from(seen.entries()).map(([value, meta]) => ({ value, ...meta }));
}

const ticks = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90];

export default function PriceCorridorChart({ competitors, elliProviders, type, theme, lang }: Props) {
  const overlayLines = getAllElliLines(elliProviders, type);
  const [hovered, setHovered] = useState<{ provider: CompetitorProvider; rowIdx: number; tier: string | null } | null>(null);

  // Elli AC reference line position
  const elliAcPrice = elliProviders[0]?.tiers[0]?.ac?.price;

  const rows: Array<{ label: string; provider: CompetitorProvider; tierIdx: number }> = [];
  for (const p of competitors) {
    p.tiers.forEach((_, i) => {
      const suffix = p.tiers.length > 1 && p.tiers[i].tier ? ` ${p.tiers[i].tier}` : '';
      rows.push({ label: `${p.name}${suffix}`, provider: p, tierIdx: i });
    });
  }

  const elliHeight = elliProviders.length * ROW_H;
  const totalHeight = rows.length * ROW_H + elliHeight;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex' }}>
        {/* Labels column */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
          {elliProviders.map(p => (
            <div key={p.id} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, fontSize: 12, color: theme.elliLabel, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
          ))}
          {rows.map(row => (
            <div key={row.label} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, fontSize: 12, color: theme.textMuted, whiteSpace: 'nowrap' }}>
              {row.label}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative', height: totalHeight }}>
          {/* Grid lines */}
          {ticks.map(tick => (
            <div key={tick} style={{
              position: 'absolute', left: `${pct(tick)}%`, top: 0, bottom: 0,
              width: 1, background: theme.borderSubtle, pointerEvents: 'none',
            }} />
          ))}

          {/* Faint reference line at Elli AC price — continuous across all rows */}
          {type === 'ac' && elliAcPrice != null && (
            <div style={{
              position: 'absolute',
              left: `${pct(elliAcPrice)}%`,
              top: 0, bottom: 0,
              width: 1, background: 'rgba(105,65,198,0.12)',
              transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 1,
            }} />
          )}

          {/* DC: dashed overlay lines for each Elli price point */}
          {type === 'dc' && overlayLines.map((line, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${pct(line.value)}%`,
              top: 0,
              height: totalHeight,
              width: 0,
              borderLeft: `2px dashed ${line.color}`,
              opacity: 0.6,
              zIndex: 1,
              pointerEvents: 'none',
            }} />
          ))}

          {/* Competitor rows */}
          {rows.map((row, ri) => {
            const tier = row.provider.tiers[row.tierIdx];
            const pp = tier[type];
            const top = elliHeight + ri * ROW_H;
            const mid = top + ROW_H / 2;

            return (
              <div key={row.label}>
                {/* Hover strip for packet tooltip */}
                <div
                  onMouseEnter={() => setHovered({ provider: row.provider, rowIdx: ri, tier: row.provider.tiers[row.tierIdx].tier })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ position: 'absolute', left: 0, right: 0, top, height: ROW_H, zIndex: 4, cursor: (row.provider.tiers[row.tierIdx].packet ?? row.provider.packet) ? 'help' : 'default' }}
                />
                {/* Min label at bar start */}
                <div style={{ position: 'absolute', left: `${pct(pp.min)}%`, top: top + 4, fontSize: 9, color: theme.textMuted, transform: 'translateX(-100%) translateX(-3px)', whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {fmt(pp.min)}
                </div>
                {/* Max label at bar end */}
                <div style={{ position: 'absolute', left: `${pct(pp.max)}%`, top: top + 4, fontSize: 9, color: theme.textMuted, transform: 'translateX(3px)', whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {fmt(pp.max)}
                </div>
                {/* Range bar */}
                <div style={{
                  position: 'absolute',
                  left: `${pct(pp.min)}%`,
                  width: `${pct(pp.max) - pct(pp.min)}%`,
                  top: mid - 4,
                  height: 8,
                  background: theme.chartBar,
                  borderRadius: 4,
                }} />
                {/* Median dot — small, gray */}
                <div style={{
                  position: 'absolute',
                  left: `${pct((pp.min + pp.max) / 2)}%`,
                  top: mid - 3,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#98A2B3',
                  border: `1.5px solid ${theme.surface}`,
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                }} />
              </div>
            );
          })}

          {/* Elli rows */}
          {elliProviders.map((p, ei) => {
            const top = ei * ROW_H;
            const mid = top + ROW_H / 2;

            if (type === 'ac') {
              const acPrice = p.tiers[0].ac.price;
              return (
                <div key={p.id}>
                  {/* Vertical bar marker */}
                  <div style={{
                    position: 'absolute',
                    left: `${pct(acPrice)}%`,
                    top: top + 2,
                    width: 2, height: ROW_H - 4,
                    borderRadius: 1,
                    background: '#6941C6',
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                  }} />
                  {/* Value label */}
                  <div style={{
                    position: 'absolute',
                    left: `calc(${pct(acPrice)}% + 8px)`,
                    top: mid - 5,
                    fontSize: 10, color: '#6941C6', fontWeight: 600, whiteSpace: 'nowrap', zIndex: 3,
                  }}>
                    {fmt(acPrice)}
                  </div>
                </div>
              );
            }

            // DC: show triangle markers for each price point
            const markers = getElliMarkersForRow(p, type);
            return (
              <div key={p.id}>
                <div style={{
                  position: 'absolute', left: 0, right: 0, top, height: ROW_H,
                  background: 'rgba(105,65,198,0.05)',
                  borderTop: ei === 0 ? `1px solid ${theme.border}` : `1px solid ${theme.borderSubtle}`,
                  borderBottom: ei === elliProviders.length - 1 ? `1px solid ${theme.border}` : 'none',
                }} />
                {markers.map((m, mi) => (
                  <div key={mi}>
                    <div style={{ position: 'absolute', left: `${pct(m.value)}%`, top: mid - 5, transform: 'translateX(-50%)', zIndex: 3 }}>
                      <svg width={12} height={10} viewBox="0 0 12 10">
                        <polygon points="6,0 0,10 12,10" fill={m.color} />
                      </svg>
                    </div>
                    <div style={{ position: 'absolute', left: `calc(${pct(m.value)}% + 8px)`, top: mid - 5, fontSize: 10, color: m.color, whiteSpace: 'nowrap', fontWeight: 600, zIndex: 3 }}>
                      {fmt(m.value)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Packet tooltip on hover */}
          {hovered && (() => {
            const hoveredTierObj = hovered.provider.tiers.find(t => t.tier === hovered.tier);
            const packet = hoveredTierObj?.packet ?? hovered.provider.packet;
            if (!packet) return null;
            return (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: elliHeight + (hovered.rowIdx + 1) * ROW_H + 4,
                transform: 'translateX(-50%)',
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: '14px 18px',
                minWidth: 320,
                zIndex: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
                  {hovered.provider.name}{hovered.tier ? ` – Tarif ${hovered.tier}` : ''}
                </div>
                {packet.map((pr, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 24,
                    padding: '4px 0', fontSize: 11,
                    borderTop: i > 0 ? `1px solid ${theme.borderSubtle}` : 'none',
                  }}>
                    <span style={{ color: theme.textMuted }}>{pr.label}</span>
                    <span style={{ color: theme.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{pr.value}</span>
                  </div>
                ))}
                {hovered.provider.sourceUrl && (
                  <div style={{ marginTop: 8, fontSize: 9, color: theme.textMuted, opacity: 0.7, wordBreak: 'break-all' }}>
                    {tr(lang, 'source')}: {hovered.provider.sourceUrl.replace('https://', '').split('/')[0]}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* X-axis */}
      <div style={{ display: 'flex', marginTop: 8 }}>
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
        <div style={{ flex: 1, position: 'relative', height: 18 }}>
          {ticks.map(tick => (
            <div key={tick} style={{ position: 'absolute', left: `${pct(tick)}%`, fontSize: 10, color: theme.textMuted, transform: 'translateX(-50%)' }}>
              {fmt(tick)}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, marginLeft: LABEL_WIDTH, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: theme.textMuted, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 6, background: theme.chartBar, borderRadius: 3 }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#98A2B3', flexShrink: 0 }} />
          {tr(lang, 'competitorCorridor')}
        </div>
        {type === 'ac' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 14, background: '#6941C6', borderRadius: 1 }} />
            Elli AC price
          </div>
        ) : (
          overlayLines.map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width={20} height={10} viewBox="0 0 20 10">
                <line x1="0" y1="5" x2="20" y2="5" stroke={line.color} strokeWidth="2" strokeDasharray="5,3" />
              </svg>
              {line.label}
            </div>
          ))
        )}
        <div style={{ marginLeft: 'auto', fontStyle: 'italic', opacity: 0.6 }}>{tr(lang, 'allValuesKwh')}</div>
      </div>
    </div>
  );
}
