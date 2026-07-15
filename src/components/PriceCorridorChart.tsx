import type { CompetitorProvider, ElliProvider, ChargingType } from '../types';

interface Props {
  competitors: CompetitorProvider[];
  elliProviders: ElliProvider[];
  type: ChargingType;
}

const CHART_MIN = 0.20;
const CHART_MAX = 0.85;
const LABEL_WIDTH = 110;
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
    return [{ value: tier.ac.price, color: '#00C896', label: `AC ${fmt(tier.ac.price)}` }];
  }
  return [
    { value: tier.dc.spn,     color: provider.id === 'elli-control' ? '#EC4899' : '#C026D3', label: `SPN ${fmt(tier.dc.spn)}` },
    { value: tier.dc.general, color: '#00C896',  label: `DC ${fmt(tier.dc.general)}` },
    { value: tier.dc.enbw,    color: '#F97316',  label: `EnBW ${fmt(tier.dc.enbw)}` },
  ];
}

// All unique Elli overlay line values for drawing vertical lines through competitor rows
function getAllElliLines(elliProviders: ElliProvider[], type: ChargingType) {
  const seen = new Map<number, { color: string; label: string }>();
  for (const p of elliProviders) {
    for (const m of getElliMarkersForRow(p, type)) {
      if (!seen.has(m.value)) seen.set(m.value, { color: m.color, label: m.label });
    }
  }
  return Array.from(seen.entries()).map(([value, meta]) => ({ value, ...meta }));
}

const ticks = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80];

export default function PriceCorridorChart({ competitors, elliProviders, type }: Props) {
  const overlayLines = getAllElliLines(elliProviders, type);

  // Flatten competitor tiers
  const rows: Array<{ label: string; provider: CompetitorProvider; tierIdx: number }> = [];
  for (const p of competitors) {
    p.tiers.forEach((_, i) => {
      const suffix = p.tiers.length > 1 && p.tiers[i].tier ? ` ${p.tiers[i].tier}` : '';
      rows.push({ label: `${p.name}${suffix}`, provider: p, tierIdx: i });
    });
  }

  const competitorHeight = rows.length * ROW_H;
  const totalHeight = competitorHeight + elliProviders.length * ROW_H;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#8B82B8', marginBottom: 20, fontWeight: 500, letterSpacing: '0.02em' }}>
        {type === 'ac' ? 'AC' : 'DC'}-price corridors (benchmark)
      </div>

      <div style={{ display: 'flex' }}>
        {/* Row labels column */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
          {rows.map(row => (
            <div key={row.label} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, fontSize: 12, color: '#8B82B8' }}>
              {row.label}
            </div>
          ))}
          {elliProviders.map(p => (
            <div key={p.id} style={{ height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, fontSize: 12, color: '#C084FC', fontWeight: 600 }}>
              {p.name}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative', height: totalHeight }}>
          {/* Tick grid lines */}
          {ticks.map(t => (
            <div key={t} style={{
              position: 'absolute', left: `${pct(t)}%`, top: 0, bottom: 0,
              width: 1, background: 'rgba(139, 130, 184, 0.1)', pointerEvents: 'none',
            }} />
          ))}

          {/* Competitor rows */}
          {rows.map((row, ri) => {
            const tier = row.provider.tiers[row.tierIdx];
            const pp = tier[type];
            const top = ri * ROW_H;
            const mid = top + ROW_H / 2;

            return (
              <div key={row.label}>
                {/* Min label */}
                <div style={{ position: 'absolute', left: `${pct(pp.min)}%`, top: top + 4, fontSize: 10, color: '#8B82B8', transform: 'translateX(-100%) translateX(-3px)', whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {fmt(pp.min)}
                </div>
                {/* Max label */}
                <div style={{ position: 'absolute', left: `${pct(pp.max)}%`, top: top + 4, fontSize: 10, color: '#8B82B8', transform: 'translateX(3px)', whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {fmt(pp.max)}
                </div>
                {/* Range bar */}
                <div style={{
                  position: 'absolute',
                  left: `${pct(pp.min)}%`,
                  width: `${pct(pp.max) - pct(pp.min)}%`,
                  top: mid - 4,
                  height: 8,
                  background: 'rgba(139, 130, 184, 0.25)',
                  borderRadius: 4,
                }} />
                {/* Median circle — same vertical center as bar */}
                <div style={{
                  position: 'absolute',
                  left: `${pct(pp.median)}%`,
                  top: mid - 5,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#00C896',
                  border: '2px solid #0D0A2E',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                }} />
              </div>
            );
          })}

          {/* Elli rows — purple highlighted, markers per price point */}
          {elliProviders.map((p, ei) => {
            const top = competitorHeight + ei * ROW_H;
            const mid = top + ROW_H / 2;
            const markers = getElliMarkersForRow(p, type);

            return (
              <div key={p.id}>
                {/* Row background */}
                <div style={{
                  position: 'absolute', left: 0, right: 0,
                  top, height: ROW_H,
                  background: 'rgba(123, 47, 190, 0.12)',
                  borderTop: ei === 0 ? '1px solid rgba(123, 47, 190, 0.3)' : '1px solid rgba(123, 47, 190, 0.15)',
                  borderBottom: ei === elliProviders.length - 1 ? '1px solid rgba(123, 47, 190, 0.3)' : 'none',
                }} />
                {/* Markers */}
                {markers.map((m, mi) => (
                  <div key={mi}>
                    {/* Upward triangle marker */}
                    <div style={{ position: 'absolute', left: `${pct(m.value)}%`, top: mid - 8, transform: 'translateX(-50%)', zIndex: 3 }}>
                      <svg width={12} height={10} viewBox="0 0 12 10">
                        <polygon points="6,10 0,0 12,0" fill={m.color} />
                      </svg>
                    </div>
                    {/* Value label below triangle */}
                    <div style={{
                      position: 'absolute',
                      left: `${pct(m.value)}%`,
                      top: mid + 4,
                      transform: 'translateX(-50%)',
                      fontSize: 10,
                      color: m.color,
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      zIndex: 3,
                    }}>
                      {fmt(m.value)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Elli vertical overlay lines — run through competitor rows only */}
          {overlayLines.map((line, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${pct(line.value)}%`,
              top: 0,
              height: competitorHeight,
              width: 0,
              borderLeft: `2px dashed ${line.color}`,
              opacity: 0.7,
              zIndex: 1,
              pointerEvents: 'none',
            }} />
          ))}
        </div>
      </div>

      {/* X-axis ticks */}
      <div style={{ display: 'flex', marginTop: 8 }}>
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
        <div style={{ flex: 1, position: 'relative', height: 18 }}>
          {ticks.map(t => (
            <div key={t} style={{ position: 'absolute', left: `${pct(t)}%`, fontSize: 10, color: '#8B82B8', transform: 'translateX(-50%)' }}>
              {fmt(t)}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, marginLeft: LABEL_WIDTH, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: '#8B82B8', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 6, background: 'rgba(139, 130, 184, 0.35)', borderRadius: 3 }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896', border: '2px solid #0D0A2E', flexShrink: 0 }} />
          Competitor corridor · median
        </div>
        {overlayLines.map((line, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={10} height={8} viewBox="0 0 12 10"><polygon points="6,10 0,0 12,0" fill={line.color} /></svg>
            {line.label}
          </div>
        ))}
      </div>
    </div>
  );
}
