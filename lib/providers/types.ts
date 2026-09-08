export type MarketMetric = {
  label: string;
  value: number | null;
  unit: "count" | "days";
  asOf: string | null;
  history: Array<{ date: string; value: number }>;
};

export type MarketSnapshot = {
  provider: "zillow_research" | "mls_grid";
  providerLabel: string;
  region: string;
  geography: "Metro";
  retrievedAt: string;
  sourceUrl: string;
  attribution: string;
  metrics: {
    inventory: MarketMetric;
    salesCount: MarketMetric;
    daysToPending: MarketMetric;
  };
  warnings: string[];
};

export interface MarketDataProvider {
  readonly id: MarketSnapshot["provider"];
  getMarketSnapshot(region: string): Promise<MarketSnapshot>;
}
