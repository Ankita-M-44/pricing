export interface PricePoint {
  min: number;
  max: number;
  current: number;
  spn?: number;
  enbw?: number;
}

export interface Tier {
  tier: string | null;
  ac: PricePoint;
  dc: PricePoint;
}

export interface Provider {
  id: string;
  name: string;
  isElli: boolean;
  monthlyFee?: number;
  tiers: Tier[];
}

export interface PricesData {
  lastUpdated: string;
  providers: Provider[];
  history: Array<{ date: string; providers: Provider[] }>;
}

export type ChargingType = 'ac' | 'dc';
