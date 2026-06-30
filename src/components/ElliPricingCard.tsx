import type { Provider } from '../types';

interface Props {
  provider: Provider;
}

export default function ElliPricingCard({ provider }: Props) {
  const tier = provider.tiers[0];

  return (
    <div style={{
      background: '#1A1550',
      border: '1px solid rgba(123, 47, 190, 0.4)',
      borderRadius: 12,
      padding: '20px 24px',
      minWidth: 180,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#F0EEFF', marginBottom: 4 }}>
        {provider.name}
      </div>
      {provider.monthlyFee && (
        <div style={{ fontSize: 22, fontWeight: 700, color: '#A855F7', marginBottom: 12 }}>
          € {provider.monthlyFee.toFixed(2).replace('.', ',')}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#8B82B8', marginLeft: 4 }}>/ card / mo</span>
        </div>
      )}
      <div style={{ fontSize: 11, color: '#8B82B8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Charging Fees
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="AC" value={`€ ${tier.ac.current.toFixed(2).replace('.', ',')}/kWh`} />
        <Row label="DC" value={`€ ${tier.dc.current.toFixed(2).replace('.', ',')}/kWh`} />
        {tier.dc.spn && (
          <Row label="IONITY / Aral" value={`€ ${tier.dc.spn.toFixed(2).replace('.', ',')}/kWh`} highlight />
        )}
        {tier.dc.enbw && (
          <Row label="EnBW" value={`€ ${tier.dc.enbw.toFixed(2).replace('.', ',')}/kWh`} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#8B82B8' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: highlight ? '#00C896' : '#F0EEFF' }}>{value}</span>
    </div>
  );
}
