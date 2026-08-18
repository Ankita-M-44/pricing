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
const NAME_W = 144; // matches mockup c-name width
const CARD_PAD = 32; // chart card's horizontal padding, for bleed effect

function pct(value: number): number {
  return ((value - CHART_MIN) / (CHART_MAX - CHART_MIN)) * 100;
}

function fmt(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

// 5 axis labels evenly spaced: 0.20, 0.38, 0.55, 0.73, 0.90
const AXIS_LABELS = [0.20, 0.375, 0.55, 0.725, 0.90];

export default function PriceCorridorChart({ competitors, elliProviders, type, theme, lang }: Props) {
  const [hovered, setHovered] = useState<{ provider: CompetitorProvider; rowIdx: number; tier: string | null } | null>(null);

  const rows: Array<{ label: string; sublabel?: string; provider: CompetitorProvider; tierIdx: number }> = [];
  for (const p of competitors) {
    p.tiers.forEach((tier, i) => {
      const tierLabel = p.tiers.length > 1 && tier.tier ? tier.tier : undefined;
      rows.push({
        label: p.name,
        sublabel: tierLabel ? `Tier ${tierLabel}` : undefined,
        provider: p,
        tierIdx: i,
      });
    });
  }

  // Primary Elli price for reference line
  const elliRefPrice = type === 'ac'
    ? elliProviders[0]?.tiers[0]?.ac?.price
    : elliProviders[0]?.tiers[0]?.dc?.general;

  // Reference line left = NAME_W + pct(price)/100 * (100% - NAME_W)
  const refLineLeft = elliRefPrice != null
    ? `calc(${NAME_W}px + ${pct(elliRefPrice) / 100} * (100% - ${NAME_W}px))`
    : undefined;

  return (
    <figure aria-label={`${type.toUpperCase()} charging price corridor comparison`}>
      <figcaption className="sr-only">
        Each row shows the min–max price range with a dot at the midpoint. Elli has a fixed price marked with a vertical bar.
      </figcaption>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Axis — 5 evenly spaced labels at top, offset by NAME_W */}
        <div style={{ display: 'flex', marginLeft: NAME_W, marginBottom: 8 }} aria-hidden="true">
          <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
            {AXIS_LABELS.map(v => (
              <span key={v} style={{ fontSize: 10, color: theme.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(v)}
              </span>
            ))}
          </div>
        </div>

        {/* Row container — position:relative for the reference line */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Faint reference line — single element spanning all rows */}
          {refLineLeft && (
            <div style={{
              position: 'absolute',
              left: refLineLeft,
              top: 0, bottom: 0,
              width: 1, background: 'rgba(105,65,198,0.12)',
              transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 1,
            }} aria-hidden="true" />
          )}

          {/* Elli rows */}
          {elliProviders.map(p => {
            const price = type === 'ac' ? p.tiers[0].ac.price : p.tiers[0].dc.general;
            const shortName = p.name.replace(/^Elli\s+[–-]\s*/, '').replace(/^Elli\s+/, '');
            const barLeft = `${pct(price)}%`;

            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center',
                background: '#F4F0FF',
                margin: `0 -${CARD_PAD}px`, padding: `14px ${CARD_PAD}px`,
                borderTop: '1px solid #D9D6FE',
                borderBottom: '1px solid #D9D6FE',
                position: 'relative',
              }}>
                <div style={{ width: NAME_W, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#6941C6', paddingRight: 12 }}>
                  {`Elli ${shortName}`}
                  <small style={{ display: 'block', fontSize: 11, fontWeight: 400, color: theme.textMuted, marginTop: 2 }}>
                    Your package · fixed
                  </small>
                </div>
                <div style={{ flex: 1, position: 'relative', height: 38 }}>
                  {/* gray track */}
                  <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 6, borderRadius: 3, background: theme.borderSubtle }} />
                  {/* vertical bar marker */}
                  <div style={{
                    position: 'absolute', top: 2, left: barLeft,
                    width: 2, height: 16, borderRadius: 1,
                    background: '#6941C6', transform: 'translateX(-50%)', zIndex: 2,
                  }} aria-hidden="true" />
                  {/* label below bar */}
                  <span style={{
                    position: 'absolute', top: 20, left: barLeft,
                    transform: 'translateX(-50%)',
                    fontSize: 9.5, color: '#6941C6', fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                  }}>
                    {fmt(price)} €/kWh
                  </span>
                </div>
              </div>
            );
          })}

          {/* Competitor rows */}
          {rows.map((row, ri) => {
            const tier = row.provider.tiers[row.tierIdx];
            const pp = tier[type];
            const minLeft = `${pct(pp.min)}%`;
            const maxLeft = `${pct(pp.max)}%`;
            const midLeft = `${pct((pp.min + pp.max) / 2)}%`;
            const barWidth = `${pct(pp.max) - pct(pp.min)}%`;
            const packet = tier.packet ?? row.provider.packet;

            return (
              <div
                key={row.label + row.tierIdx}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: ri < rows.length - 1 ? `1px solid ${theme.borderSubtle}` : 'none',
                  position: 'relative',
                }}
                onMouseEnter={() => setHovered({ provider: row.provider, rowIdx: ri, tier: tier.tier })}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{ width: NAME_W, flexShrink: 0, fontSize: 13, fontWeight: 600, color: theme.text, paddingRight: 12, cursor: packet ? 'help' : 'default' }}>
                  {row.label}
                  {row.sublabel && <small style={{ display: 'block', fontSize: 11, fontWeight: 400, color: theme.textMuted, marginTop: 2 }}>{row.sublabel}</small>}
                </div>
                <div style={{ flex: 1, position: 'relative', height: 38 }}>
                  {/* gray track */}
                  <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 6, borderRadius: 3, background: theme.borderSubtle }} />
                  {/* range bar */}
                  <div style={{ position: 'absolute', top: 7, left: minLeft, width: barWidth, height: 6, borderRadius: 3, background: '#D0D5DD' }} aria-hidden="true" />
                  {/* midpoint dot */}
                  <div style={{
                    position: 'absolute', top: 6, left: midLeft,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#98A2B3', border: `1.5px solid ${theme.surface}`,
                    transform: 'translateX(-50%)', zIndex: 2,
                  }} aria-hidden="true" />
                  {/* min label below bar */}
                  <span style={{ position: 'absolute', top: 20, left: minLeft, fontSize: 9.5, color: theme.textMuted, transform: 'translateX(-10%)', whiteSpace: 'nowrap', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(pp.min)}
                  </span>
                  {/* max label below bar */}
                  <span style={{ position: 'absolute', top: 20, left: maxLeft, fontSize: 9.5, color: theme.textMuted, transform: 'translateX(-90%)', whiteSpace: 'nowrap', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(pp.max)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Packet tooltip on hover */}
        {hovered && (() => {
          const hoveredTierObj = hovered.provider.tiers.find(t => t.tier === hovered.tier);
          const packet = hoveredTierObj?.packet ?? hovered.provider.packet;
          if (!packet) return null;
          return (
            <div style={{
              background: theme.surface, border: `1px solid ${theme.border}`,
              borderRadius: 10, padding: '14px 18px', minWidth: 280,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 8,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
                {hovered.provider.name}{hovered.tier ? ` – Tier ${hovered.tier}` : ''}
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
            </div>
          );
        })()}

        {/* Legend */}
        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
          marginTop: 16, paddingTop: 14, borderTop: `1px solid ${theme.borderSubtle}`,
        }} role="list" aria-label="Chart legend">
          <div role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.textMuted }}>
            <div style={{ width: 2, height: 16, background: '#6941C6', borderRadius: 1, flexShrink: 0 }} />
            Elli price
          </div>
          <div role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.textMuted }}>
            <div style={{ width: 1, height: 16, background: 'rgba(105,65,198,0.25)', flexShrink: 0 }} />
            Elli reference line
          </div>
          <div role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.textMuted }}>
            <div style={{ width: 20, height: 6, background: '#D0D5DD', borderRadius: 3, flexShrink: 0 }} />
            {tr(lang, 'competitorCorridor')}
          </div>
          <div role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.textMuted }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#98A2B3', border: `1.5px solid ${theme.surface}`, flexShrink: 0 }} />
            Midpoint
          </div>
        </div>
      </div>
    </figure>
  );
}
