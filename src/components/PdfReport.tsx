import type { CompetitorProvider, ElliProvider } from '../types';
import type { Theme } from '../theme';
import type { Lang, StringKey } from '../i18n';
import { t } from '../i18n';
import { buildModel } from '../tariffModel';
import type { Mode } from '../tariffModel';
import TariffDotChart from './TariffDotChart';

interface Props {
  competitors: CompetitorProvider[];
  elliProviders: ElliProvider[];
  lastUpdated: string;
  theme: Theme;
  lang: Lang;
}

const PAGES: Array<{ mode: Mode; title: StringKey; caption: StringKey }> = [
  { mode: 'ac', title: 'pdfAcTitle', caption: 'pdfAcCaption' },
  { mode: 'dc', title: 'pdfDcTitle', caption: 'pdfDcCaption' },
  { mode: 'blocking', title: 'pdfBlockingTitle', caption: 'pdfBlockingCaption' },
  { mode: 'base', title: 'pdfBaseTitle', caption: 'pdfBaseCaption' },
];

/** Print-only report: one A4 landscape page per chart view (AC, DC, blocking, base fees). */
export default function PdfReport({ competitors, elliProviders, lastUpdated, theme, lang }: Props) {
  const date = new Date(lastUpdated).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="print-only pdf-report">
      {PAGES.map((pg, i) => (
        <section key={pg.mode} className="pdf-page" aria-label={t(lang, pg.title)}>
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            paddingBottom: 10, borderBottom: '2px solid #6941C6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Exact brand file, natural aspect ratio (width follows height) */}
              <img src="/elli-logo.png" alt="Elli" style={{ height: 34, width: 'auto', display: 'block' }} />
              <div style={{ borderLeft: `1px solid ${theme.border}`, paddingLeft: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Pricing Signals</div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>Fleet Charging · Benchmark vs. Market</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{t(lang, 'pdfLabel')}</div>
              <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{t(lang, 'pdfDataAsOf')} {date}</div>
            </div>
          </header>

          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.3, color: theme.text }}>{t(lang, pg.title)}</h2>
            <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 3 }}>{t(lang, pg.caption)}</p>
          </div>

          <TariffDotChart model={buildModel(pg.mode, competitors, elliProviders, lang)} theme={theme} lang={lang} variant="pdf" />

          <footer style={{
            marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
            paddingTop: 8, borderTop: `1px solid ${theme.border}`, fontSize: 10, lineHeight: '14px', color: theme.textMuted,
          }}>
            <div style={{ maxWidth: '82%' }}>{t(lang, 'pdfFooter').replace('{date}', date)}</div>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t(lang, 'pdfPage')} {i + 1} {t(lang, 'pdfOf')} {PAGES.length}</div>
          </footer>
        </section>
      ))}
    </div>
  );
}
