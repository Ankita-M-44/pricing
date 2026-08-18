import type { ElliProvider } from '../types';
import type { Theme } from '../theme';

interface Props {
  provider: ElliProvider;
  theme: Theme;
  isActive?: boolean;
}

const featuresByCard: Record<string, string[]> = {
  'elli-control': ['For predictable charging costs', 'Fixed rates for cost stability'],
  'elli-performance': ['Ideal for frequent fast charging', 'Lower prices at Selected Partners'],
};

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 20 20" fill="#6941C6" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
    </svg>
  );
}

function StarCircle() {
  return (
    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#EDE9FE', border: '1.5px solid #D9D6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#6941C6" strokeWidth="2.5" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </div>
  );
}

export default function ElliPricingCard({ provider, theme, isActive }: Props) {
  const tier = provider.tiers[0];
  const isPerf = provider.id === 'elli-performance';
  const shortName = provider.name.replace(/^Elli\s+[–-]\s*/, '').replace(/^Elli\s+/, '');
  const spnPrice = isPerf ? '0,49' : '0,59';
  const features = featuresByCard[provider.id] ?? [];
  const acBlocking = provider.blockingFees?.ac;
  const dcBlocking = provider.blockingFees?.dc;

  return (
    <div style={{
      flex: '1 0 0', display: 'flex', flexDirection: 'column',
      background: theme.surface,
      border: `1px solid ${isActive ? '#D9D6FE' : theme.border}`,
      borderRadius: 12,
      padding: '14px 14px 16px',
    }}>
      {/* Centered header: name, price, subtitle */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        paddingBottom: 10, borderBottom: `1px solid ${theme.borderSubtle}`, marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 3 }}>{shortName}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#6941C6', fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4, lineHeight: 1 }}>
          {provider.monthlyFee.toFixed(2).replace('.', ',')}€
        </div>
        <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>per month per card</div>
      </div>

      {/* Feature bullets */}
      {features.length > 0 && (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {features.map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11, color: theme.text }}>
              <CheckIcon />{f}
            </li>
          ))}
        </ul>
      )}

      {/* Tariff highlights */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '16px 10px 9px', marginBottom: 9, position: 'relative' }}>
        <span style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%,-50%)',
          display: 'inline-block', background: '#00FF99', color: '#101828',
          fontSize: 9.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
          letterSpacing: '0.03em', whiteSpace: 'nowrap',
        }}>Tariff highlights</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
          {['IONITY', 'ARAL'].map(name => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <StarCircle />
              <span style={{ color: theme.text, flex: 1 }}>{name}</span>
              <span style={{ fontWeight: 700, color: '#6941C6', fontVariantNumeric: 'tabular-nums' }}>{spnPrice} €/kWh</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charging fees */}
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.text, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Charging fees
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
        {[
          { label: 'AC', value: `${tier.ac.price.toFixed(2).replace('.', ',')} €/kWh` },
          { label: 'DC', value: `${tier.dc.general.toFixed(2).replace('.', ',')} €/kWh` },
          { label: 'EnBW', value: `${tier.dc.enbw.toFixed(2).replace('.', ',')} €/kWh` },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.textMuted }}>{row.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6941C6', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Time-based fees */}
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.text, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Time-based fees
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {acBlocking && !acBlocking.exempt && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.textMuted }}>AC (9–21h), &gt;{acBlocking.graceMins >= 60 ? `${acBlocking.graceMins / 60}h` : `${acBlocking.graceMins} min`}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.text, fontVariantNumeric: 'tabular-nums' }}>{(acBlocking.rate * 100).toFixed(0)} ct/min</span>
          </div>
        )}
        {dcBlocking && !dcBlocking.exempt && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.textMuted }}>DC (all day), &gt;{dcBlocking.graceMins >= 60 ? `${dcBlocking.graceMins / 60}h` : `${dcBlocking.graceMins} min`}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.text, fontVariantNumeric: 'tabular-nums' }}>{(dcBlocking.rate * 100).toFixed(0)} ct/min</span>
          </div>
        )}
      </div>
    </div>
  );
}
