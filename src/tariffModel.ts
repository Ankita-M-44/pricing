import type {
  BlockingFeePoint, CompetitorPricePoint, CompetitorProvider, CompetitorTier, ElliProvider, PacketRow,
} from './types';
import type { Lang, StringKey } from './i18n';
import { t } from './i18n';

export type Mode = 'ac' | 'dc' | 'blocking' | 'base';

export interface DotPoint {
  key: string;        // small label above the dot ('' = none)
  value: number;
  title: string;      // packet card title
  packet: PacketRow[];
}

export interface DotRow {
  id: string;
  name: string;
  sub: string;
  isElli: boolean;
  points: DotPoint[];
  bandMin: number;
  bandMax: number;
}

export interface Scale {
  lo: number;
  hi: number;
  ticks: Array<{ value: number; label: string }>;
}

export interface Model {
  rows: DotRow[];
  scale: Scale;
  unitKey: StringKey;
  introKey: StringKey;
}

const FLEX_FEE = 3.5;
const COMPETITOR_ORDER = ['enbw', 'dkv', 'uta', 'aral', 'shell'];

const num = (v: number) => v.toFixed(2).replace('.', ',');
const kwh = (v: number) => `${num(v)} €/kWh`;
const graceText = (mins: number) => (mins % 60 === 0 ? `${mins / 60} h` : `${mins} min`);

export function tierName(lang: Lang, key: string): string {
  return key.length === 1 ? `${t(lang, 'tierWord')} ${key}` : key;
}

function blockingText(lang: Lang, bf: BlockingFeePoint, suffix = ''): string {
  if (bf.exempt) return t(lang, 'pkExempt');
  const cap = bf.cap != null ? ` · ${t(lang, 'max')} ${bf.cap} €` : '';
  return `${num(bf.rate)} €/min ${t(lang, 'after')} ${graceText(bf.graceMins)}${suffix}${cap}`;
}

function blockingSub(lang: Lang, ac: BlockingFeePoint, dc: BlockingFeePoint): string {
  const part = (b: BlockingFeePoint, label: 'AC' | 'DC') =>
    b.exempt ? t(lang, label === 'AC' ? 'acFree' : 'dcFree') : `${label} ${t(lang, 'after')} ${graceText(b.graceMins)}`;
  const sameGrace = !ac.exempt && !dc.exempt && ac.graceMins === dc.graceMins;
  const grace = sameGrace ? `${t(lang, 'after')} ${graceText(ac.graceMins)}` : `${part(ac, 'AC')} · ${part(dc, 'DC')}`;
  const caps = [ac, dc].filter(b => !b.exempt && b.cap != null).map(b => b.cap as number);
  const cap = caps.length ? ` · ${t(lang, 'max')} ${Math.max(...caps)} €` : '';
  return grace + cap;
}

function shortName(p: ElliProvider): string {
  return p.name.replace(/^Elli\s+[–-]\s*/, '').replace(/^Elli\s+/, '');
}

function elliPacket(p: ElliProvider, lang: Lang): PacketRow[] {
  const tier = p.tiers[0];
  const rows: PacketRow[] = [
    { label: t(lang, 'pkFee'), value: `${num(p.monthlyFee)} € ${t(lang, 'perMonth')}` },
    { label: t(lang, 'pkAc'), value: kwh(tier.ac.price) },
    { label: t(lang, 'pkDc'), value: kwh(tier.dc.general) },
    { label: t(lang, 'pkSpn'), value: kwh(tier.dc.spn) },
    { label: t(lang, 'pkEnbwNet'), value: kwh(tier.dc.enbw) },
  ];
  if (p.blockingFees) {
    rows.push({ label: t(lang, 'pkBlockAc'), value: blockingText(lang, p.blockingFees.ac, ' (9–21 h)') });
    rows.push({ label: t(lang, 'pkBlockDc'), value: blockingText(lang, p.blockingFees.dc) });
  }
  return rows;
}

function flexPacket(lang: Lang): PacketRow[] {
  return [
    { label: t(lang, 'pkFee'), value: `${num(FLEX_FEE)} € ${t(lang, 'perMonth')}` },
    { label: t(lang, 'pkAc'), value: t(lang, 'pkVariable') },
    { label: t(lang, 'pkDc'), value: t(lang, 'pkVariable') },
    { label: t(lang, 'pkBlocking'), value: t(lang, 'pkVariable') },
  ];
}

function isTiered(p: CompetitorProvider): boolean {
  return p.tiers.length > 1 || p.tiers[0]?.tier != null;
}

function priceRange(p: CompetitorProvider, kind: 'ac' | 'dc'): { lo: number; hi: number } | null {
  const pts = p.tiers.map(x => x[kind]).filter((x): x is CompetitorPricePoint => !!x);
  if (!pts.length) return null;
  return { lo: Math.min(...pts.map(x => x.min)), hi: Math.max(...pts.map(x => x.max)) };
}

function competitorPacket(p: CompetitorProvider, tier: CompetitorTier | null, lang: Lang): PacketRow[] {
  const named = !!tier && tier.tier != null;
  const priceText = (kind: 'ac' | 'dc'): string => {
    if (named) {
      const pp = tier![kind];
      return pp ? kwh(pp.median) : t(lang, 'pkNotOffered');
    }
    const r = priceRange(p, kind);
    if (!r) return '—';
    return r.lo === r.hi ? kwh(r.lo) : `${num(r.lo)} – ${num(r.hi)} €/kWh`;
  };

  const rows: PacketRow[] = [
    { label: t(lang, 'pkAc'), value: priceText('ac') },
    { label: t(lang, 'pkDc'), value: priceText('dc') },
  ];

  const fees = p.baseFees ?? [];
  const fee = (named ? fees.find(f => f.tier === tier!.tier) : undefined) ?? fees[0];
  if (fee) rows.push({ label: t(lang, 'pkFee'), value: `${num(fee.amount)} € ${t(lang, 'perMonth')}` });

  const bf = p.blockingFees;
  if (bf) {
    if (bf.ac.nightRate != null) {
      rows.push({ label: t(lang, 'pkBlockAcDay'), value: blockingText(lang, bf.ac) });
      rows.push({ label: t(lang, 'pkBlockAcNight'), value: blockingText(lang, { ...bf.ac, rate: bf.ac.nightRate }) });
      rows.push({ label: t(lang, 'pkBlockDc'), value: blockingText(lang, bf.dc) });
    } else if (!bf.ac.exempt && !bf.dc.exempt && blockingText(lang, bf.ac) === blockingText(lang, bf.dc)) {
      rows.push({ label: t(lang, 'pkBlockBoth'), value: blockingText(lang, bf.ac) });
    } else {
      rows.push({ label: t(lang, 'pkBlockAc'), value: blockingText(lang, bf.ac) });
      rows.push({ label: t(lang, 'pkBlockDc'), value: blockingText(lang, bf.dc) });
    }
    if (bf.ac.note && bf.ac.nightRate == null) rows.push({ label: t(lang, 'pkNote'), value: bf.ac.note });
  }

  for (const r of tier?.packet ?? []) {
    if (!r.label.startsWith('Beispiel-Betreiber')) continue;
    const key: StringKey = r.label.endsWith('AC') ? 'pkOpsAc' : r.label.endsWith('DC') ? 'pkOpsDc' : 'pkOps';
    rows.push({ label: t(lang, key), value: r.value });
  }
  return rows;
}

function feeSub(p: CompetitorProvider, lang: Lang): string {
  const amounts = (p.baseFees ?? []).map(f => f.amount);
  if (!amounts.length) return '';
  const lo = Math.min(...amounts), hi = Math.max(...amounts);
  if (hi === 0) return t(lang, 'noMonthlyFee');
  return lo === hi ? `${num(lo)} € ${t(lang, 'perMonth')}` : `${num(lo)} – ${num(hi)} € ${t(lang, 'perMonth')}`;
}

function sortedCompetitors(competitors: CompetitorProvider[]): CompetitorProvider[] {
  const rank = (id: string) => { const i = COMPETITOR_ORDER.indexOf(id); return i < 0 ? 99 : i; };
  return [...competitors].sort((a, b) => rank(a.id) - rank(b.id));
}

function priceRows(mode: 'ac' | 'dc', competitors: CompetitorProvider[], elli: ElliProvider[], lang: Lang): DotRow[] {
  const rows: DotRow[] = [];

  for (const p of elli) {
    const tier = p.tiers[0];
    const name = `Elli ${shortName(p)}`;
    const packet = elliPacket(p, lang);
    const pts: Array<[string, number]> = mode === 'ac'
      ? [['', tier.ac.price]]
      : [[t(lang, 'partners'), tier.dc.spn], ['DC', tier.dc.general], ['EnBW', tier.dc.enbw]];
    const values = pts.map(x => x[1]);
    rows.push({
      id: p.id, name, isElli: true,
      sub: `${num(p.monthlyFee)} € ${t(lang, 'perMonth')}`,
      points: pts.map(([key, value]) => ({ key, value, title: name, packet })),
      bandMin: Math.min(...values), bandMax: Math.max(...values),
    });
  }

  for (const p of sortedCompetitors(competitors)) {
    const points: DotPoint[] = [];
    let bandMin = Infinity, bandMax = -Infinity;
    const grow = (lo: number, hi: number) => { bandMin = Math.min(bandMin, lo); bandMax = Math.max(bandMax, hi); };
    const tiered = isTiered(p);

    if (tiered) {
      for (const tier of p.tiers) {
        const pp = tier[mode];
        if (!pp) continue;
        const key = tier.tier ?? '';
        points.push({
          key, value: pp.median,
          title: key ? `${p.name} – ${tierName(lang, key)}` : p.name,
          packet: competitorPacket(p, tier, lang),
        });
        grow(pp.min, pp.max);
      }
    } else {
      const pp = p.tiers[0]?.[mode];
      if (pp) {
        const packet = competitorPacket(p, null, lang);
        if (pp.min === pp.max) {
          points.push({ key: '', value: pp.min, title: p.name, packet });
        } else {
          points.push({ key: t(lang, 'lowest'), value: pp.min, title: `${p.name} – ${t(lang, 'lowest')}`, packet });
          points.push({ key: t(lang, 'highest'), value: pp.max, title: `${p.name} – ${t(lang, 'highest')}`, packet });
        }
        grow(pp.min, pp.max);
      }
    }
    if (!points.length) continue;

    const count = points.length;
    const head = tiered ? `${count} ${t(lang, 'tiersCount')}` : t(lang, 'priceRange');
    rows.push({
      id: p.id, name: p.name, isElli: false,
      sub: [head, feeSub(p, lang)].filter(Boolean).join(' · '),
      points, bandMin, bandMax,
    });
  }
  return rows;
}

function blockingRows(competitors: CompetitorProvider[], elli: ElliProvider[], lang: Lang): DotRow[] {
  const rows: DotRow[] = [];

  const dotsFor = (ac: BlockingFeePoint, dc: BlockingFeePoint): Array<[string, number]> => {
    const pts: Array<[string, number]> = [];
    if (ac.nightRate != null) pts.push([t(lang, 'acNight'), ac.nightRate]);
    if (!ac.exempt && !dc.exempt && ac.rate === dc.rate) pts.push(['AC & DC', ac.rate]);
    else { pts.push(['AC', ac.exempt ? 0 : ac.rate]); pts.push(['DC', dc.exempt ? 0 : dc.rate]); }
    return pts;
  };

  for (const p of elli) {
    const bf = p.blockingFees;
    if (!bf) continue;
    const name = `Elli ${shortName(p)}`;
    const packet = elliPacket(p, lang);
    const pts = dotsFor(bf.ac, bf.dc);
    const values = pts.map(x => x[1]);
    rows.push({
      id: p.id, name, isElli: true, sub: blockingSub(lang, bf.ac, bf.dc),
      points: pts.map(([key, value]) => ({ key, value, title: name, packet })),
      bandMin: Math.min(...values), bandMax: Math.max(...values),
    });
  }

  for (const p of sortedCompetitors(competitors)) {
    const bf = p.blockingFees;
    if (!bf) continue;
    const packet = competitorPacket(p, null, lang);
    const pts = dotsFor(bf.ac, bf.dc);
    const values = pts.map(x => x[1]);
    rows.push({
      id: p.id, name: p.name, isElli: false, sub: blockingSub(lang, bf.ac, bf.dc),
      points: pts.map(([key, value]) => ({ key, value, title: p.name, packet })),
      bandMin: Math.min(...values), bandMax: Math.max(...values),
    });
  }
  return rows;
}

function baseRows(competitors: CompetitorProvider[], elli: ElliProvider[], lang: Lang): DotRow[] {
  const rows: DotRow[] = [];

  if (elli.length) {
    const pts: DotPoint[] = [{ key: 'Flex', value: FLEX_FEE, title: 'Elli – Flex', packet: flexPacket(lang) }];
    for (const p of elli) {
      pts.push({ key: shortName(p), value: p.monthlyFee, title: `Elli – ${shortName(p)}`, packet: elliPacket(p, lang) });
    }
    const values = pts.map(x => x.value);
    rows.push({
      id: 'elli', name: 'Elli', isElli: true, sub: pts.map(x => x.key).join(' · '),
      points: pts, bandMin: Math.min(...values), bandMax: Math.max(...values),
    });
  }

  for (const p of sortedCompetitors(competitors)) {
    const fees = p.baseFees ?? [];
    if (!fees.length) continue;
    const points: DotPoint[] = fees.map(f => {
      const tier = f.tier ? p.tiers.find(x => x.tier === f.tier) ?? null : null;
      return {
        key: f.tier ?? '', value: f.amount,
        title: f.tier ? `${p.name} – ${tierName(lang, f.tier)}` : p.name,
        packet: competitorPacket(p, tier, lang),
      };
    });
    const values = points.map(x => x.value);
    const named = fees.some(f => f.tier);
    rows.push({
      id: p.id, name: p.name, isElli: false,
      sub: named ? fees.map(f => f.tier).filter(Boolean).join(' · ') : values[0] === 0 ? t(lang, 'noMonthlyFee') : t(lang, 'oneCardFee'),
      points, bandMin: Math.min(...values), bandMax: Math.max(...values),
    });
  }
  return rows;
}

function buildScale(mode: Mode, maxValue: number): Scale {
  const build = (lo: number, hi: number, step: number, first: number, label: (v: number) => string): Scale => {
    const ticks: Scale['ticks'] = [];
    for (let i = 0; first + i * step <= hi - step * 0.2; i++) {
      const value = Math.round((first + i * step) * 100) / 100;
      ticks.push({ value, label: label(value) });
    }
    return { lo, hi, ticks };
  };
  if (mode === 'blocking') {
    return build(-0.008, Math.max(0.18, Math.ceil(maxValue / 0.05) * 0.05 + 0.03), 0.05, 0, v => `${num(v)} €/min`);
  }
  if (mode === 'base') {
    return build(-0.5, Math.max(13, Math.ceil(maxValue) + 1), 2, 0, v => `${v} €`);
  }
  return build(0.25, Math.max(0.85, Math.ceil((maxValue + 0.03) * 10) / 10), 0.1, 0.3, v => `${num(v)} €`);
}

export function buildModel(mode: Mode, competitors: CompetitorProvider[], elli: ElliProvider[], lang: Lang): Model {
  const rows = mode === 'blocking' ? blockingRows(competitors, elli, lang)
    : mode === 'base' ? baseRows(competitors, elli, lang)
    : priceRows(mode, competitors, elli, lang);
  const maxValue = Math.max(0, ...rows.flatMap(r => [r.bandMax, ...r.points.map(p => p.value)]));
  const unitKey: StringKey = mode === 'blocking' ? 'unitMin' : mode === 'base' ? 'unitMonth' : 'unitKwh';
  const introKey: StringKey = mode === 'ac' ? 'introAc' : mode === 'dc' ? 'introDc' : mode === 'blocking' ? 'introBlocking' : 'introBase';
  return { rows, scale: buildScale(mode, maxValue), unitKey, introKey };
}
