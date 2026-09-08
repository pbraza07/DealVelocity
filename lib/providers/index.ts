import type { MarketDataProvider } from "./types";
import { MlsGridProvider } from "./mls-grid";
import { ZillowResearchProvider } from "./zillow-research";

export function getMarketDataProvider(): MarketDataProvider {
  return process.env.DATA_PROVIDER === "mls_grid"
    ? new MlsGridProvider()
    : new ZillowResearchProvider();
}
