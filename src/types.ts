export interface CompetitorPricePoint {
  min: number;
  max: number;
  median: number;
}

export interface CompetitorTier {
  tier: string | null;
  ac: CompetitorPricePoint;
  dc: CompetitorPricePoint;
}

export interface ElliAcPrice {
  price: number;
}

export interface ElliDcPrice {
  general: number;
  spn: number;
  enbw: number;
}

export interface ElliTier {
  tier: string | null;
  ac: ElliAcPrice;
  dc: ElliDcPrice;
}

export interface CompetitorProvider {
  id: string;
  name: string;
  isElli: false;
  tiers: CompetitorTier[];
}

export interface ElliProvider {
  id: string;
  name: string;
  isElli: true;
  monthlyFee: number;
  tiers: ElliTier[];
}

export type Provider = CompetitorProvider | ElliProvider;

export interface PricesData {
  lastUpdated: string;
  providers: Provider[];
  history: Array<{ date: string; providers: CompetitorProvider[] }>;
}

export type ChargingType = 'ac' | 'dc';
