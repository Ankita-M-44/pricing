export type Lang = 'en' | 'de';

const strings = {
  chartTitle: {
    en: 'Side-by-side Fleet tariff comparison with other providers',
    de: 'Flottentarife im direkten Vergleich mit anderen Anbietern',
  },
  tabAc: { en: 'AC', de: 'AC' },
  tabDc: { en: 'DC', de: 'DC' },
  tabBlocking: { en: 'Blocking Fees', de: 'Blockiergebühren' },
  tabBaseFees: { en: 'Base Fees', de: 'Grundgebühren' },
  elliPricingCurrent: { en: 'Elli Fleet Pricing (Current)', de: 'Elli Flottenpreise (Aktuell)' },
  idealOccasional: { en: 'Ideal for occasional charging', de: 'Ideal für gelegentliches Laden' },
  perCardMonth: { en: '/ card / mo', de: '/ Karte / Monat' },
  variablePassThrough: { en: 'Variable pass-through pricing', de: 'Variable Durchleitungspreise' },
  dataSources: { en: 'Data Sources', de: 'Datenquellen' },
  autoUpdated: { en: 'Auto-updated bi-weekly · GitHub Actions', de: 'Automatisch aktualisiert (14-tägig) · GitHub Actions' },
  loading: { en: 'Loading pricing data...', de: 'Preisdaten werden geladen...' },
  live: { en: 'Live', de: 'Live' },
  stale: { en: 'Stale', de: 'Veraltet' },
  error: { en: 'Error', de: 'Fehler' },
  lastUpdated: { en: 'Last updated', de: 'Zuletzt aktualisiert' },
  exportPdf: { en: 'Export PDF', de: 'PDF exportieren' },
  pricingCaptured: { en: 'Pricing captured on', de: 'Preise erfasst am' },
  // Blocking fee chart
  competitorModerate: { en: 'Competitor · moderate', de: 'Wettbewerber · moderat' },
  competitorHigh: { en: 'Competitor · high', de: 'Wettbewerber · hoch' },
  competitorVeryHigh: { en: 'Competitor · very high / uncapped', de: 'Wettbewerber · sehr hoch / ohne Obergrenze' },
  allRatesMin: { en: 'All rates in €/min · bar starts at 0', de: 'Alle Sätze in €/min · Balken beginnt bei 0' },
  acExempt: { en: 'AC charging exempt — no blocking fee', de: 'AC-Laden befreit — keine Blockiergebühr' },
  after: { en: 'after', de: 'nach' },
  noCap: { en: 'no cap', de: 'keine Obergrenze' },
  max: { en: 'max', de: 'max' },
  // Corridor chart
  competitorCorridor: { en: 'Competitor corridor · median', de: 'Wettbewerber-Korridor · Median' },
  allValuesKwh: { en: 'All values in €/kWh', de: 'Alle Werte in €/kWh' },
  // Base fee chart
  monthlyFeePerCard: { en: 'Monthly base fee per card', de: 'Monatliche Grundgebühr pro Karte' },
  allValuesMonth: { en: 'All values in € / card / month', de: 'Alle Werte in € / Karte / Monat' },
  noBaseFee: { en: 'no base fee', de: 'keine Grundgebühr' },
  competitor: { en: 'Competitor', de: 'Wettbewerber' },
  source: { en: 'Source', de: 'Quelle' },
} as const;

export type StringKey = keyof typeof strings;

export function t(lang: Lang, key: StringKey): string {
  return strings[key][lang];
}
