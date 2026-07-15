import type { CompetitorProvider, ElliProvider, ChargingType } from '../types';

interface Props {
  competitors: CompetitorProvider[];
  elliProviders: ElliProvider[];
  type: ChargingType;
}

const CHART_MIN = 0.20;
const CHART_MAX = 0.85;
const LABEL_WIDTH = 96;

function pct(value: number): number {
  return ((value - CHART_MIN) / (CHART_MAX - CHART_MIN)) * 100;
}

function fmt(v: number): string {
  return `€ ${v.toFixed(2).replace('.', ',')}`;
}

// Elli overlay lines per chart type
interface OverlayLine {
  value: number;
  color: string;
  label: string;
  dash?: string;
}

function getElliLines(elliProviders: ElliProvider[], type: ChargingType): OverlayLine[] {
  const control = elliProviders.find(p => p.id === 'elli-control');
  const perf = elliProviders.find(p => p.id === 'elli-performance');

  if (type === 'ac') {
    const price = control?.tiers[0]?.ac?.price ?? 0.53;
    return [
      { value: price, color: '#00C896', label: `Elli AC ${fmt(price)}`, dash: '6,4' },
    ];
  }

  // DC: 3 line types, Control & Performance split on SPN
  const lines: OverlayLine[] = [];

  // General DC (same for both)
  const generalDc = control?.tiers[0]?.dc?.general ?? 0.63;
  lines.push({ value: generalDc, color: '#00C896', label: `DC ${fmt(generalDc)}`, dash: '6,4' });

  // SPN — two lines if different
  const controlSpn = control?.tiers[0]?.dc?.spn ?? 0.59;
  const perfSpn = perf?.tiers[0]?.dc?.spn ?? 0.49;
  lines.push({ value: controlSpn, color: '#EC4899', label: `Control SPN ${fmt(controlSpn)}`, dash: '4,3' });
  if (perfSpn !== controlSpn) {
    lines.push({ value: perfSpn, color: '#C026D3', label: `Perf. SPN ${fmt(perfSpn)}`, dash: '4,3' });
  }

  // EnBW (same for both)
  const enbw = control?.tiers[0]?.dc?.enbw ?? 0.67;
  lines.push({ value: enbw, color: '#F97316', label: `EnBW ${fmt(enbw)}`, dash: '6,4' });

  return lines;
}

export default function PriceCorridorChart({ competitors, elliProviders, type }: Props) {
  const ticks = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80];
  const overlayLines = getElliLines(elliProviders, type);

  // Flatten competitor tiers into rows
  const rows: Array<{ label: string; provider: CompetitorProvider; tierIdx: number }> = [];
  for (const p of competitors) {
    p.tiers.forEach((_, i) => {
      const suffix = p.tiers.length > 1 && p.tiers[i].tier ? ` ${p.tiers[i].tier}` : '';
      rows.push({ label: `${p.name}${suffix}`, provider: p, tierIdx: i });
    });
  }

  const ROW_H = 36;
  const chartHeight = rows.length * ROW_H;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        textAlign: 'center',
        fontSize: 13,
        color: '#8B82B8',
        marginBottom: 16,
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}>
        {type === 'ac' ? 'AC' : 'DC'}-price corridors (benchmark)
      </div>

      {/* Chart body */}
      <div style={{ display: 'flex' }}>
        {/* Row labels */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {rows.map(row => (
            <div key={row.label} style={{
              height: ROW_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 10,
              fontSize: 12,
              color: '#8B82B8',
            }}>
              {row.label}
            </div>
          ))}
        </div>

        {/* Bar + overlay area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Tick grid lines */}
          {ticks.map(t => (
            <div key={t} style={{
              position: 'absolute',
              left: `${pct(t)}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(139, 130, 184, 0.1)',
              pointerEvents: 'none',
            }} />
          ))}

          {/* Competitor rows */}
          {rows.map((row) => {
            const tier = row.provider.tiers[row.tierIdx];
            const pp = tier[type];
            const barLeft = `${pct(pp.min)}%`;
            const barWidth = `${pct(pp.max) - pct(pp.min)}%`;
            const medianLeft = `${pct(pp.median)}%`;

            return (
              <div key={row.label} style={{ height: ROW_H, position: 'relative', display: 'flex', alignItems: 'center' }}>
                {/* Min label */}
                <div style={{
                  position: 'absolute',
                  left: barLeft,
                  top: 2,
                  fontSize: 10,
                  color: '#8B82B8',
                  transform: 'translateX(-100%) translateX(-3px)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}>
                  {fmt(pp.min)}
                </div>

                {/* Max label */}
                <div style={{
                  position: 'absolute',
                  left: `${pct(pp.max)}%`,
                  top: 2,
                  fontSize: 10,
                  color: '#8B82B8',
                  transform: 'translateX(3px)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}>
                  {fmt(pp.max)}
                </div>

                {/* Range bar */}
                <div style={{
                  position: 'absolute',
                  left: barLeft,
                  width: barWidth,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: 8,
                  background: 'rgba(139, 130, 184, 0.25)',
                  borderRadius: 4,
                  marginTop: 6,
                }} />

                {/* Median circle */}
                <div style={{
                  position: 'absolute',
                  left: medianLeft,
                  top: '50%',
                  transform: 'translate(-50%, -50%) translateY(3px)',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#00C896',
                  border: '2px solid #0D0A2E',
                  zIndex: 1,
                }} />
              </div>
            );
          })}

          {/* Elli overlay vertical lines — drawn on top of all rows */}
          {overlayLines.map((line, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${pct(line.value)}%`,
              top: 0,
              height: chartHeight,
              width: 0,
              borderLeft: `2px dashed ${line.color}`,
              opacity: 0.9,
              zIndex: 2,
              pointerEvents: 'none',
            }}>
              {/* Label at top of line */}
              <div style={{
                position: 'absolute',
                top: -20,
                left: 4,
                fontSize: 10,
                color: line.color,
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}>
                {line.label}
              </div>
              {/* Arrow head at bottom */}
              <div style={{
                position: 'absolute',
                bottom: -6,
                left: -5,
              }}>
                <svg width={10} height={7} viewBox="0 0 10 7">
                  <polygon points="5,7 0,0 10,0" fill={line.color} />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* X-axis ticks */}
      <div style={{ display: 'flex', marginTop: 10 }}>
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
        <div style={{ flex: 1, position: 'relative', height: 18 }}>
          {ticks.map(t => (
            <div key={t} style={{
              position: 'absolute',
              left: `${pct(t)}%`,
              fontSize: 10,
              color: '#8B82B8',
              transform: 'translateX(-50%)',
            }}>
              {fmt(t)}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 20,
        marginLeft: LABEL_WIDTH,
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        fontSize: 11,
        color: '#8B82B8',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 6, background: 'rgba(139, 130, 184, 0.35)', borderRadius: 3 }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896', border: '2px solid #0D0A2E' }} />
          Competitor corridor · median
        </div>
        {overlayLines.map((line, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={20} height={10} viewBox="0 0 20 10">
              <line x1="0" y1="5" x2="20" y2="5" stroke={line.color} strokeWidth="2" strokeDasharray="5,3" />
            </svg>
            {line.label}
          </div>
        ))}
      </div>
    </div>
  );
}
