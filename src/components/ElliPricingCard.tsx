import type { ElliProvider } from '../types';
import type { Theme } from '../theme';

interface Props {
  provider: ElliProvider;
  theme: Theme;
  isActive?: boolean;
}

const subtitles: Record<string, string> = {
  'elli-control': 'Ideal for maximum cost control',
  'elli-performance': 'Ideal for frequent fast charging',
};

export default function ElliPricingCard({ provider, theme, isActive }: Props) {
  const tier = provider.tiers[0];
  const isPerf = provider.id === 'elli-performance';

  return (
    <div style={{
      flex: '1 0 0', display: 'flex', flexDirection: 'column',
      background: theme.surface,
      border: `1px solid ${isActive ? '#D6BBFB' : theme.border}`,
      borderRadius: 12,
      padding: '14px 14px 16px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 2 }}>{provider.name}</div>
      <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 10 }}>{subtitles[provider.id] ?? ''}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: theme.elliLabel, marginBottom: 10 }}>
        € {provider.monthlyFee.toFixed(2).replace('.', ',')}
        <span style={{ fontSize: 11, fontWeight: 400, color: theme.textMuted, marginLeft: 4 }}>/ card / mo</span>
      </div>

      {/* Tariff highlights box — white, green pill straddling top border */}
      <div style={{
        position: 'relative',
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: '16px 10px 9px',
        marginBottom: 9,
      }}>
        <span style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%,-50%)',
          display: 'inline-block', background: '#00FF99', color: '#101828',
          fontSize: 9.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
          letterSpacing: '0.03em', whiteSpace: 'nowrap',
        }}>
          TARIFF HIGHLIGHTS
        </span>
        <Row label="IONITY / Aral pulse" value={`${isPerf ? '0,49' : '0,59'} €/kWh`} highlight theme={theme} />
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
        Charging Fees
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Row label="AC charging stations" value={`${tier.ac.price.toFixed(2).replace('.', ',')} €/kWh`} theme={theme} />
        <Row label="DC charging stations" value={`${tier.dc.general.toFixed(2).replace('.', ',')} €/kWh`} theme={theme} />
        <Row label="EnBW charging stations" value={`${tier.dc.enbw.toFixed(2).replace('.', ',')} €/kWh`} theme={theme} />
      </div>
    </div>
  );
}

function Row({ label, value, highlight, theme }: { label: string; value: string; highlight?: boolean; theme: Theme }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 11, color: theme.textMuted }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: highlight ? '#6941C6' : theme.text, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}
