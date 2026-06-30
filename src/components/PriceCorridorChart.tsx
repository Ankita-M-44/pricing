import type { Provider, ChargingType } from '../types';

interface Props {
  providers: Provider[];
  type: ChargingType;
}

const CHART_MIN = 0.20;
const CHART_MAX = 0.85;

function pct(value: number): string {
  return `${((value - CHART_MIN) / (CHART_MAX - CHART_MIN)) * 100}%`;
}

function fmt(v: number): string {
  return `€ ${v.toFixed(2).replace('.', ',')}`;
}


export default function PriceCorridorChart({ providers, type }: Props) {
  const ticks = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80];

  // Flatten providers into rows (expand tiers)
  const rows: Array<{ label: string; isElli: boolean; provider: Provider; tierIdx: number }> = [];
  for (const p of providers) {
    p.tiers.forEach((_, i) => {
      const suffix = p.tiers.length > 1 && p.tiers[i].tier ? ` ${p.tiers[i].tier}` : '';
      rows.push({ label: `${p.name}${suffix}`, isElli: p.isElli, provider: p, tierIdx: i });
    });
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        fontSize: 13,
        color: '#8B82B8',
        marginBottom: 20,
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}>
        {type === 'ac' ? 'AC' : 'DC'}-price corridors (benchmark)
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row) => {
          const tier = row.provider.tiers[row.tierIdx];
          const pp = tier[type];
          const isElli = row.isElli;

          return (
            <div
              key={row.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 6,
                background: isElli ? 'rgba(123, 47, 190, 0.15)' : 'transparent',
                border: isElli ? '1px solid rgba(123, 47, 190, 0.3)' : '1px solid transparent',
              }}
            >
              {/* Label */}
              <div style={{
                width: 120,
                fontSize: 12,
                color: isElli ? '#C084FC' : '#8B82B8',
                fontWeight: isElli ? 600 : 400,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {row.label}
              </div>

              {/* Bar area */}
              <div style={{ flex: 1, position: 'relative', height: 28 }}>
                {/* Min label */}
                <div style={{
                  position: 'absolute',
                  left: pct(pp.min),
                  top: 0,
                  fontSize: 10,
                  color: '#8B82B8',
                  transform: 'translateX(-100%) translateX(-4px)',
                  whiteSpace: 'nowrap',
                }}>
                  {fmt(pp.min)}
                </div>

                {/* Max label */}
                <div style={{
                  position: 'absolute',
                  left: pct(pp.max),
                  top: 0,
                  fontSize: 10,
                  color: '#8B82B8',
                  transform: 'translateX(4px)',
                  whiteSpace: 'nowrap',
                }}>
                  {fmt(pp.max)}
                </div>

                {/* Range bar */}
                <div style={{
                  position: 'absolute',
                  left: pct(pp.min),
                  top: 14,
                  width: `calc(${pct(pp.max)} - ${pct(pp.min)})`,
                  height: 8,
                  background: isElli ? 'rgba(168, 85, 247, 0.4)' : 'rgba(139, 130, 184, 0.3)',
                  borderRadius: 4,
                }}>
                  {/* Inner fill up to current */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: `${((pp.current - pp.min) / (pp.max - pp.min)) * 100}%`,
                    height: '100%',
                    background: isElli ? 'rgba(168, 85, 247, 0.6)' : 'rgba(139, 130, 184, 0.5)',
                    borderRadius: 4,
                  }} />
                </div>

                {/* Current price marker */}
                {isElli ? (
                  /* Elli: upward triangle (teal) */
                  <div style={{
                    position: 'absolute',
                    left: pct(pp.current),
                    top: 10,
                    transform: 'translateX(-50%)',
                  }}>
                    <svg width={12} height={10} viewBox="0 0 10 10">
                      <polygon points="5,10 10,0 0,0" fill="#00C896" />
                    </svg>
                  </div>
                ) : (
                  /* Competitors: downward triangle (teal) */
                  <div style={{
                    position: 'absolute',
                    left: pct(pp.current),
                    top: 10,
                    transform: 'translateX(-50%)',
                  }}>
                    <svg width={12} height={10} viewBox="0 0 10 10">
                      <polygon points="5,0 10,10 0,10" fill="#00C896" />
                    </svg>
                  </div>
                )}

                {/* DC-specific SPN and EnBW markers for Elli */}
                {type === 'dc' && isElli && pp.spn !== undefined && (
                  <div style={{
                    position: 'absolute',
                    left: pct(pp.spn),
                    top: -2,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 9, color: '#EC4899', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                      SPN {fmt(pp.spn)}
                    </div>
                    <svg width={10} height={9} viewBox="0 0 10 10">
                      <polygon points="5,10 10,0 0,0" fill="#EC4899" />
                    </svg>
                  </div>
                )}
                {type === 'dc' && isElli && pp.enbw !== undefined && (
                  <div style={{
                    position: 'absolute',
                    left: pct(pp.enbw),
                    top: -2,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 9, color: '#F97316', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                      {fmt(pp.enbw)} EnBW
                    </div>
                    <svg width={10} height={9} viewBox="0 0 10 10">
                      <polygon points="5,10 10,0 0,0" fill="#F97316" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis ticks */}
      <div style={{
        position: 'relative',
        marginLeft: 128,
        marginTop: 8,
        height: 20,
      }}>
        {ticks.map(t => (
          <div key={t} style={{
            position: 'absolute',
            left: pct(t),
            fontSize: 10,
            color: '#8B82B8',
            transform: 'translateX(-50%)',
          }}>
            € {t.toFixed(2).replace('.', ',')}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        marginLeft: 128,
        marginTop: 20,
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        fontSize: 11,
        color: '#8B82B8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 20, height: 6, background: 'rgba(139, 130, 184, 0.4)', borderRadius: 3 }} />
          Other Providers
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width={10} height={8} viewBox="0 0 10 10"><polygon points="5,10 10,0 0,0" fill="#00C896" /></svg>
          Elli – Control / Performance
        </div>
        {type === 'dc' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width={10} height={8} viewBox="0 0 10 10"><polygon points="5,10 10,0 0,0" fill="#EC4899" /></svg>
              Control / Performance SPN
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width={10} height={8} viewBox="0 0 10 10"><polygon points="5,10 10,0 0,0" fill="#F97316" /></svg>
              Control / Performance EnBW
            </div>
          </>
        )}
      </div>
    </div>
  );
}
