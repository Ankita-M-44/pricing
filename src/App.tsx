import { useState, useEffect } from 'react';
import Header from './components/Header';
import PriceCorridorChart from './components/PriceCorridorChart';
import ElliPricingCard from './components/ElliPricingCard';
import PriceChangeAlert from './components/PriceChangeAlert';
import type { PricesData, ChargingType, CompetitorProvider, ElliProvider } from './types';
import './index.css';

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 24px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        background: active ? '#7B2FBE' : 'transparent',
        color: active ? '#F0EEFF' : '#8B82B8',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

function ScraperStatusBadge({ provider, status }: { provider: string; status: 'ok' | 'stale' | 'error' }) {
  const colors = { ok: '#00C896', stale: '#F59E0B', error: '#F87171' };
  const labels = { ok: 'Live', stale: 'Stale', error: 'Error' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: colors[status],
        boxShadow: status === 'ok' ? `0 0 6px ${colors[status]}` : 'none',
      }} />
      <span style={{ color: '#8B82B8' }}>{provider}</span>
      <span style={{ color: colors[status] }}>{labels[status]}</span>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<PricesData | null>(null);
  const [type, setType] = useState<ChargingType>('ac');

  useEffect(() => {
    fetch('/data/prices.json')
      .then(r => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B82B8' }}>
        Loading pricing data...
      </div>
    );
  }

  const competitors = data.providers.filter((p): p is CompetitorProvider => !p.isElli);
  const elliProviders = data.providers.filter((p): p is ElliProvider => p.isElli);

  // Detect recent price changes from history
  const recentChanges: Array<{ provider: string; type: 'ac' | 'dc'; oldPrice: number; newPrice: number; date: string }> = [];
  if (data.history.length >= 2) {
    const latest = data.history[data.history.length - 1];
    const prev = data.history[data.history.length - 2];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (new Date(latest.date).getTime() > sevenDaysAgo) {
      for (const lp of latest.providers) {
        const pp = prev.providers.find(p => p.id === lp.id);
        if (!pp) continue;
        const lAc = lp.tiers[0]?.ac?.median;
        const pAc = pp.tiers[0]?.ac?.median;
        if (lAc !== pAc && lAc != null && pAc != null) {
          recentChanges.push({ provider: lp.name, type: 'ac', oldPrice: pAc, newPrice: lAc, date: latest.date });
        }
        const lDc = lp.tiers[0]?.dc?.median;
        const pDc = pp.tiers[0]?.dc?.median;
        if (lDc !== pDc && lDc != null && pDc != null) {
          recentChanges.push({ provider: lp.name, type: 'dc', oldPrice: pDc, newPrice: lDc, date: latest.date });
        }
      }
    }
  }

  const ageMs = Date.now() - new Date(data.lastUpdated).getTime();
  const scraperStatus: 'ok' | 'stale' | 'error' =
    ageMs < 2 * 86400 * 1000 ? 'ok' : ageMs < 16 * 86400 * 1000 ? 'stale' : 'error';
  const scraperTargets = ['EnBW', 'Shell', 'DKV', 'UTA', 'Aral pulse'];

  return (
    <div style={{ minHeight: '100vh', background: '#0D0A2E' }}>
      <Header lastUpdated={data.lastUpdated} />

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>

        <PriceChangeAlert changes={recentChanges} />

        {/* Elli pricing cards */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8B82B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Elli Fleet Pricing (Current)
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Flex card (static) */}
            <div style={{
              background: '#1A1550',
              border: '1px solid rgba(123, 47, 190, 0.2)',
              borderRadius: 12,
              padding: '20px 24px',
              minWidth: 200,
              opacity: 0.7,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F0EEFF', marginBottom: 2 }}>Elli – Flex</div>
              <div style={{ fontSize: 12, color: '#00C896', marginBottom: 10 }}>Ideal for occasional charging</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#A855F7', marginBottom: 10 }}>
                € 3,50
                <span style={{ fontSize: 12, fontWeight: 400, color: '#8B82B8', marginLeft: 4 }}>/ card / mo</span>
              </div>
              <div style={{ fontSize: 12, color: '#8B82B8' }}>Variable pass-through pricing</div>
            </div>
            {elliProviders.map(p => (
              <ElliPricingCard key={p.id} provider={p} />
            ))}
          </div>
        </div>

        {/* Benchmark chart */}
        <div style={{
          background: '#1A1550',
          borderRadius: 14,
          border: '1px solid rgba(123, 47, 190, 0.25)',
          padding: '36px 32px 28px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#F0EEFF' }}>
                Price Corridor Benchmark
              </div>
              <div style={{ fontSize: 12, color: '#00C896', marginTop: 2 }}>
                Side-by-side comparison vs. leading providers in AC & DC charging
              </div>
            </div>
            <div style={{
              display: 'flex',
              background: 'rgba(13, 10, 46, 0.6)',
              borderRadius: 24,
              padding: 4,
              border: '1px solid rgba(139, 130, 184, 0.2)',
            }}>
              <TabButton active={type === 'ac'} onClick={() => setType('ac')}>AC</TabButton>
              <TabButton active={type === 'dc'} onClick={() => setType('dc')}>DC</TabButton>
            </div>
          </div>

          <PriceCorridorChart competitors={competitors} elliProviders={elliProviders} type={type} />
        </div>

        {/* Scraper status footer */}
        <div style={{
          background: '#1A1550',
          borderRadius: 10,
          border: '1px solid rgba(139, 130, 184, 0.15)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ fontSize: 11, color: '#8B82B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Data Sources
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {scraperTargets.map(name => (
              <ScraperStatusBadge key={name} provider={name} status={scraperStatus} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#8B82B8' }}>
            Auto-updated bi-weekly via web scrapers · GitHub Actions
          </div>
        </div>
      </div>
    </div>
  );
}
