import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { Theme } from '../theme';

interface Change {
  provider: string;
  type: 'ac' | 'dc';
  oldPrice: number;
  newPrice: number;
  date: string;
}

interface Props {
  changes: Change[];
  theme: Theme;
}

export default function PriceChangeAlert({ changes, theme }: Props) {
  if (changes.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(0, 200, 150, 0.08)',
      border: '1px solid rgba(0, 200, 150, 0.3)',
      borderRadius: 10, padding: '12px 20px', marginBottom: 24,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#00C896', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Recent Price Changes
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {changes.map((c, i) => {
          const delta = c.newPrice - c.oldPrice;
          const isDown = delta < 0;
          const isFlat = delta === 0;
          const Icon = isFlat ? Minus : isDown ? TrendingDown : TrendingUp;
          const color = isFlat ? theme.textMuted : isDown ? '#00C896' : '#F87171';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Icon size={14} color={color} />
              <span style={{ color: theme.text, fontWeight: 600 }}>{c.provider}</span>
              <span style={{ color: theme.textMuted }}>{c.type.toUpperCase()}</span>
              <span style={{ color: theme.textMuted }}>
                € {c.oldPrice.toFixed(2)} → <span style={{ color }}> € {c.newPrice.toFixed(2)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
