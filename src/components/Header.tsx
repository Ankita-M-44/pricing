import { RefreshCw, Clock } from 'lucide-react';

interface Props {
  lastUpdated: string;
  isRefreshing?: boolean;
}

export default function Header({ lastUpdated, isRefreshing }: Props) {
  const date = new Date(lastUpdated);
  const formatted = date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{
      background: '#1A1550',
      borderBottom: '1px solid rgba(123, 47, 190, 0.3)',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Elli wordmark */}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#F0EEFF', letterSpacing: '-0.5px' }}>
            Elli<span style={{ color: '#00C896' }}>⚡</span>
          </div>
          <div style={{
            width: 1,
            height: 20,
            background: 'rgba(139, 130, 184, 0.3)',
          }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F0EEFF' }}>
              Pricing Signals Dashboard
            </div>
            <div style={{ fontSize: 12, color: '#00C896', fontWeight: 500 }}>
              Fleet Charging · Benchmark vs. Market
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: '#8B82B8',
        background: 'rgba(139, 130, 184, 0.1)',
        padding: '6px 12px',
        borderRadius: 20,
        border: '1px solid rgba(139, 130, 184, 0.2)',
      }}>
        {isRefreshing ? (
          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Clock size={12} />
        )}
        <span>Updated: {formatted}</span>
        <span style={{ color: 'rgba(139, 130, 184, 0.4)' }}>·</span>
        <span>All values in €/kWh</span>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
