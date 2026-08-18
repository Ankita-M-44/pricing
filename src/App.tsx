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

// Matches mockup: active tab = white bg + purple text + shadow; container = border-sub bg
function TabButton({ active, onClick, children, theme }: { active: boolean; onClick: () => void; children: React.ReactNode; theme: typeof dark }) {
  return (
    <button onClick={onClick} style={{
      height: 30, padding: '0 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
      background: active ? theme.surface : 'transparent',
      color: active ? '#6941C6' : theme.textMuted,
      boxShadow: active ? '0 1px 3px rgba(0,0,0,.09),0 1px 2px rgba(0,0,0,.06)' : 'none',
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 20 20" fill="#6941C6" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState<PricesData | null>(null);
  const [type, setType] = useState<ChargingType>('ac');
  const [blockingSubType, setBlockingSubType] = useState<'ac' | 'dc'>('ac');
  const [isDark, setIsDark] = useState(false);
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

      <div className="print-only" style={{ padding: '8px 32px', fontSize: 12, color: theme.textMuted }}>
        {t(lang, 'pricingCaptured')}: {new Date(data.lastUpdated).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <PriceChangeAlert changes={recentChanges} theme={theme} />

        {/* Elli pricing cards — centered, max 780px */}
        <section aria-labelledby="elli-section-lbl">
          <div id="elli-section-lbl" style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            {t(lang, 'elliPricingCurrent')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 12, width: 'min(780px, 100%)' }}>

              {/* Flex card */}
              <article style={{
                flex: '1 0 0', display: 'flex', flexDirection: 'column',
                background: theme.surface, border: `1px solid ${theme.border}`,
                borderRadius: 12, padding: '14px 14px 16px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 10, borderBottom: `1px solid ${theme.borderSubtle}`, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 3 }}>Flex</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#6941C6', fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4, lineHeight: 1 }}>3,50€</div>
                  <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>per month per card</div>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                  {['Perfect for occasional charging', 'Low base fee, flexible pricing'].map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11, color: theme.text }}><CheckIcon />{f}</li>
                  ))}
                </ul>
                <div style={{ height: 1, background: theme.borderSubtle, margin: '8px 0' }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: theme.text, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Charging fees</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {[['AC', 'variable (based on CPO)'], ['DC', 'variable (based on CPO)']].map(([lbl, val]) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>{lbl}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: theme.text }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: theme.borderSubtle, margin: '8px 0' }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: theme.text, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Time-based fees</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>Blocking</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.text }}>Variable (based on CPO)</span>
                </div>
              </article>

              {elliProviders.map(p => (
                <ElliPricingCard key={p.id} provider={p} theme={theme} isActive={p.id === 'elli-control'} />
              ))}
            </div>
          </div>
        </section>

        {/* Benchmark chart */}
        <section aria-labelledby="bench-lbl">
          <div style={{ background: theme.surface, borderRadius: 12, border: `1px solid ${theme.border}`, padding: '28px 32px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h2 id="bench-lbl" style={{ fontSize: 16, fontWeight: 700, color: theme.text, margin: 0 }}>{t(lang, 'chartTitle')}</h2>
              <div style={{ display: 'flex', alignItems: 'center', background: theme.borderSubtle, borderRadius: 8, padding: 3, border: `1px solid ${theme.border}` }} role="tablist">
                <TabButton active={type === 'ac'} onClick={() => setType('ac')} theme={theme}>AC</TabButton>
                <TabButton active={type === 'dc'} onClick={() => setType('dc')} theme={theme}>DC</TabButton>
                <TabButton active={type === 'blocking'} onClick={() => setType('blocking')} theme={theme}>{t(lang, 'tabBlocking')}</TabButton>
                <TabButton active={type === 'base'} onClick={() => setType('base')} theme={theme}>{t(lang, 'tabBaseFees')}</TabButton>
              </div>
            </div>

            {type === 'blocking' ? (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                  {(['ac', 'dc'] as const).map(sub => (
                    <button key={sub} onClick={() => setBlockingSubType(sub)} style={{
                      height: 26, padding: '0 14px', borderRadius: 20,
                      border: `1px solid ${theme.border}`,
                      background: blockingSubType === sub ? theme.border : 'transparent',
                      color: blockingSubType === sub ? theme.text : theme.textMuted,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>{sub.toUpperCase()}</button>
                  ))}
                </div>
                <BlockingFeeChart competitors={competitors} elliProviders={elliProviders} type={blockingSubType} theme={theme} lang={lang} />
              </>
            ) : type === 'base' ? (
              <BaseFeeChart competitors={competitors} elliProviders={elliProviders} theme={theme} lang={lang} />
            ) : (
              <PriceCorridorChart competitors={competitors} elliProviders={elliProviders} type={type} theme={theme} lang={lang} />
            )}
          </div>
        </section>

        {/* Disclaimer */}
        <p style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.65, opacity: 0.75, padding: '12px 0 24px' }}>
          {t(lang, 'disclaimer')}
        </p>
      </div>
    </div>
  );
}
