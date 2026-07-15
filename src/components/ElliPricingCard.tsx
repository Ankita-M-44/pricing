import type { ElliProvider } from '../types';

interface Props {
  provider: ElliProvider;
}

const subtitles: Record<string, string> = {
  'elli-control': 'Ideal for maximum cost control',
  'elli-performance': 'Ideal for frequent fast charging',
};

export default function ElliPricingCard({ provider }: Props) {
  const tier = provider.tiers[0];
  const isPerf = provider.id === 'elli-performance';

  return (
    <div style={{
      background: '#1A1550',
      border: '1px solid rgba(123, 47, 190, 0.4)',
      borderRadius: 12,
      padding: '20px 24px',
      minWidth: 220,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#F0EEFF', marginBottom: 2 }}>
        {provider.name}
      </div>
      <div style={{ fontSize: 12, color: '#00C896', marginBottom: 10 }}>
        {subtitles[provider.id] ?? ''}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#A855F7', marginBottom: 14 }}>
        € {provider.monthlyFee.toFixed(2).replace('.', ',')}
        <span style={{ fontSize: 12, fontWeight: 400, color: '#8B82B8', marginLeft: 4 }}>/ card / mo</span>
      </div>

      {/* Tariff highlights box */}
      <div style={{
        background: 'rgba(0, 200, 150, 0.08)',
        border: '1px solid rgba(0, 200, 150, 0.25)',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Tariff Highlights
        </div>
        <Row label="IONITY / Aral pulse" value={`${isPerf ? '0,49' : '0,59'} €/kWh`} highlight />
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#8B82B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        Charging Fees
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="AC charging stations" value={`${tier.ac.price.toFixed(2).replace('.', ',')} €/kWh`} />
        <Row label="DC charging stations" value={`${tier.dc.general.toFixed(2).replace('.', ',')} €/kWh`} />
        <Row label="EnBW charging stations" value={`${tier.dc.enbw.toFixed(2).replace('.', ',')} €/kWh`} />
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#8B82B8' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: highlight ? '#00C896' : '#F0EEFF', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}
