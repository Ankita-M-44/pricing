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
  blockingFees?: BlockingFees;
  baseFees?: BaseFeeEntry[];
}

export interface ElliProvider {
  id: string;
  name: string;
  isElli: true;
  monthlyFee: number;
  tiers: ElliTier[];
  blockingFees?: BlockingFees;
}

export type Provider = CompetitorProvider | ElliProvider;

export interface PricesData {
  lastUpdated: string;
  providers: Provider[];
  history: Array<{ date: string; providers: CompetitorProvider[] }>;
}

export type ChargingType = 'ac' | 'dc' | 'blocking' | 'base';

export interface BaseFeeEntry {
  tier: string | null;
  amount: number;   // € / card / month
  note?: string;
}

export interface BlockingFeePoint {
  rate: number;       // €/min
  graceMins: number;  // free window before fee starts
  cap?: number;       // session cap in €, undefined = no cap
  exempt?: boolean;   // true if charging type is fully exempt (e.g. Shell AC)
  note?: string;      // e.g. day/night rate note
}

export interface BlockingFees {
  ac: BlockingFeePoint;
  dc: BlockingFeePoint;
}
