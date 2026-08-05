import { useState, useEffect } from 'react';
import Header from './components/Header';
import PriceCorridorChart from './components/PriceCorridorChart';
import BlockingFeeChart from './components/BlockingFeeChart';
import BaseFeeChart from './components/BaseFeeChart';
import ElliPricingCard from './components/ElliPricingCard';
import PriceChangeAlert from './components/PriceChangeAlert';
import type { PricesData, ChargingType, CompetitorProvider, ElliProvider } from './types';
import { dark, light } from './theme';
import type { Lang } from './i18n';
import { t } from './i18n';
import './index.css';

function TabButton({ active, onClick, children, theme }: { active: boolean; onClick: () => void; children: React.ReactNode; theme: typeof dark }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 24px', borderRadius: 20, border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 600,
      background: active ? '#7B2FBE' : 'transparent',
      color: active ? '#F0EEFF' : theme.textMuted,
      transition: 'all 0.2s',
    }}>
      {children}
    </button>
  );
}


export default function App() {
  const [data, setData] = useState<PricesData | null>(null);
  const [type, setType] = useState<ChargingType>('ac');
  const [blockingSubType, setBlockingSubType] = useState<'ac' | 'dc'>('ac');
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang] = useState<Lang>('en');

  const theme = isDark ? dark : light;

  useEffect(() => {
    fetch('/data/prices.json').then(r => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: theme.bg, color: theme.textMuted }}>
        {t(lang, 'loading')}
      </div>
    );
  }

  const competitors = data.providers.filter((p): p is CompetitorProvider => !p.isElli);
  const elliProviders = data.providers.filter((p): p is ElliProvider => p.isElli);

  const recentChanges: Array<{ provider: string; type: 'ac' | 'dc'; oldPrice: number; newPrice: number; date: string }> = [];
  if (data.history.length >= 2) {
    const latest = data.history[data.history.length - 1];
    const prev = data.history[data.history.length - 2];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (new Date(latest.date).getTime() > sevenDaysAgo) {
      for (const lp of latest.providers) {
        const pp = prev.providers.find(p => p.id === lp.id);
        if (!pp) continue;
        const lAc = lp.tiers[0]?.ac?.median, pAc = pp.tiers[0]?.ac?.median;
        if (lAc !== pAc && lAc != null && pAc != null) recentChanges.push({ provider: lp.name, type: 'ac', oldPrice: pAc, newPrice: lAc, date: latest.date });
        const lDc = lp.tiers[0]?.dc?.median, pDc = pp.tiers[0]?.dc?.median;
        if (lDc !== pDc && lDc != null && pDc != null) recentChanges.push({ provider: lp.name, type: 'dc', oldPrice: pDc, newPrice: lDc, date: latest.date });
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, transition: 'background 0.2s, color 0.2s' }}>
      <Header
        lastUpdated={data.lastUpdated} isDark={isDark} onToggleTheme={() => setIsDark(d => !d)} theme={theme}
        lang={lang} onToggleLang={() => setLang(l => (l === 'en' ? 'de' : 'en'))} onExportPdf={() => window.print()}
      />

      {/* Print-only capture date */}
      <div className="print-only" style={{ padding: '8px 32px', fontSize: 12, color: theme.textMuted }}>
        {t(lang, 'pricingCaptured')}: {new Date(data.lastUpdated).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        <PriceChangeAlert changes={recentChanges} theme={theme} />

        {/* Elli pricing cards */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            {t(lang, 'elliPricingCurrent')}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Flex card */}
            <div style={{ background: theme.surface, border: `1px solid ${theme.borderSubtle}`, borderRadius: 12, padding: '20px 24px', minWidth: 200, opacity: 0.75 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Elli – Flex</div>
              <div style={{ fontSize: 12, color: '#00C896', marginBottom: 10 }}>{t(lang, 'idealOccasional')}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#A855F7', marginBottom: 10 }}>
                € 3,50<span style={{ fontSize: 12, fontWeight: 400, color: theme.textMuted, marginLeft: 4 }}>{t(lang, 'perCardMonth')}</span>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>{t(lang, 'variablePassThrough')}</div>
            </div>
            {elliProviders.map(p => <ElliPricingCard key={p.id} provider={p} theme={theme} />)}
          </div>
        </div>

        {/* Benchmark chart */}
        <div style={{ background: theme.surface, borderRadius: 14, border: `1px solid ${theme.border}`, padding: '36px 32px 28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>{t(lang, 'chartTitle')}</div>
            </div>
            <div style={{ display: 'flex', background: theme.inputBg, borderRadius: 24, padding: 4, border: `1px solid ${theme.borderSubtle}` }}>
              <TabButton active={type === 'ac'} onClick={() => setType('ac')} theme={theme}>AC</TabButton>
              <TabButton active={type === 'dc'} onClick={() => setType('dc')} theme={theme}>DC</TabButton>
              <TabButton active={type === 'blocking'} onClick={() => setType('blocking')} theme={theme}>{t(lang, 'tabBlocking')}</TabButton>
              <TabButton active={type === 'base'} onClick={() => setType('base')} theme={theme}>{t(lang, 'tabBaseFees')}</TabButton>
            </div>
          </div>
          {type === 'blocking' ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button onClick={() => setBlockingSubType('ac')} style={{ padding: '4px 16px', borderRadius: 16, border: `1px solid ${theme.border}`, background: blockingSubType === 'ac' ? theme.border : 'transparent', color: blockingSubType === 'ac' ? theme.text : theme.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>AC</button>
                <button onClick={() => setBlockingSubType('dc')} style={{ padding: '4px 16px', borderRadius: 16, border: `1px solid ${theme.border}`, background: blockingSubType === 'dc' ? theme.border : 'transparent', color: blockingSubType === 'dc' ? theme.text : theme.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>DC</button>
              </div>
              <BlockingFeeChart competitors={competitors} elliProviders={elliProviders} type={blockingSubType} theme={theme} lang={lang} />
            </>
          ) : type === 'base' ? (
            <BaseFeeChart competitors={competitors} elliProviders={elliProviders} theme={theme} lang={lang} />
          ) : (
            <PriceCorridorChart competitors={competitors} elliProviders={elliProviders} type={type} theme={theme} lang={lang} />
          )}
        </div>

        {/* Disclaimer */}
        <div style={{ padding: '14px 0', fontSize: 11, color: theme.textMuted, lineHeight: 1.6, opacity: 0.7 }}>
          {t(lang, 'disclaimer')}
        </div>
      </div>
    </div>
  );
}
