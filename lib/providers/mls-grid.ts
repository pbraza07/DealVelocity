import type { MarketDataProvider, MarketSnapshot } from "./types";

export class MlsGridProvider implements MarketDataProvider {
  readonly id = "mls_grid" as const;

  async getMarketSnapshot(region: string): Promise<MarketSnapshot> {
    if (!process.env.MLS_GRID_TOKEN) {
      throw new Error(
        "MLS Grid is selected, but MLS_GRID_TOKEN is not configured. Use DATA_PROVIDER=zillow_research until access is approved.",
      );
    }

    throw new Error(
      `MLS Grid credentials are present for ${region}, but the market-specific RESO field mapping has not been configured yet.`,
    );
  }
}
