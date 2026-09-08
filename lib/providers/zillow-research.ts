import type { MarketDataProvider, MarketMetric, MarketSnapshot } from "./types";

const SOURCE_PAGE = "https://www.zillow.com/research/data/";

const DATASETS = {
  inventory: {
    label: "For-sale inventory",
    unit: "count" as const,
    url:
      process.env.ZILLOW_INVENTORY_CSV_URL ??
      "https://files.zillowstatic.com/research/public_csvs/invt_fs/Metro_invt_fs_uc_sfrcondo_sm_month.csv",
  },
  salesCount: {
    label: "Monthly sales count (nowcast)",
    unit: "count" as const,
    url:
      process.env.ZILLOW_SALES_COUNT_CSV_URL ??
      "https://files.zillowstatic.com/research/public_csvs/sales_count_now/Metro_sales_count_now_uc_sfrcondo_month.csv",
  },
  daysToPending: {
    label: "Mean days to pending",
    unit: "days" as const,
    url:
      process.env.ZILLOW_DAYS_TO_PENDING_CSV_URL ??
      "https://files.zillowstatic.com/research/public_csvs/mean_doz_pending/Metro_mean_doz_pending_uc_sfrcondo_sm_month.csv",
  },
};

type DatasetKey = keyof typeof DATASETS;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function findRegionRow(rows: string[][], region: string) {
  const header = rows[0] ?? [];
  const regionIndex = header.indexOf("RegionName");
  if (regionIndex < 0) return null;
  const wanted = region.trim().toLowerCase();
  return (
    rows.slice(1).find((row) => row[regionIndex]?.trim().toLowerCase() === wanted) ??
    rows.slice(1).find((row) => row[regionIndex]?.trim().toLowerCase().includes(wanted)) ??
    null
  );
}

function latestMetric(rows: string[][], region: string, key: DatasetKey): MarketMetric {
  const header = rows[0] ?? [];
  const row = findRegionRow(rows, region);
  const dataset = DATASETS[key];
  if (!row) return { label: dataset.label, value: null, unit: dataset.unit, asOf: null, history: [] };

  const datedColumns = header
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => /^\d{4}-\d{2}-\d{2}$/.test(column))
    .reverse();

  const history = datedColumns
    .flatMap(({ column, index }) => {
      const raw = row[index];
      if (!raw?.trim()) return [];
      const value = Number(raw.replaceAll(",", ""));
      return Number.isFinite(value) ? [{ date: column, value }] : [];
    })
    .slice(0, 12)
    .reverse();

  for (const { column, index } of datedColumns) {
    const raw = row[index];
    if (!raw?.trim()) continue;
    const value = Number(raw.replaceAll(",", ""));
    if (Number.isFinite(value)) {
      return { label: dataset.label, value, unit: dataset.unit, asOf: column, history };
    }
  }

  return { label: dataset.label, value: null, unit: dataset.unit, asOf: null, history };
}

async function fetchDataset(region: string, key: DatasetKey): Promise<MarketMetric> {
  const dataset = DATASETS[key];
  const response = await fetch(dataset.url, {
    headers: { Accept: "text/csv", "User-Agent": "DealVelocity/1.0" },
    next: { revalidate: 21_600 },
  });
  if (!response.ok) throw new Error(`${dataset.label} returned HTTP ${response.status}`);
  const text = await response.text();
  return latestMetric(parseCsv(text), region, key);
}

export class ZillowResearchProvider implements MarketDataProvider {
  readonly id = "zillow_research" as const;

  async getMarketSnapshot(region: string): Promise<MarketSnapshot> {
    const warnings: string[] = [];
    const entries = await Promise.all(
      (Object.keys(DATASETS) as DatasetKey[]).map(async (key) => {
        try {
          return [key, await fetchDataset(region, key)] as const;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Dataset unavailable";
          warnings.push(message);
          const dataset = DATASETS[key];
          return [key, { label: dataset.label, value: null, unit: dataset.unit, asOf: null, history: [] }] as const;
        }
      }),
    );

    const metrics = Object.fromEntries(entries) as MarketSnapshot["metrics"];
    return {
      provider: this.id,
      providerLabel: "Zillow Research",
      region,
      geography: "Metro",
      retrievedAt: new Date().toISOString(),
      sourceUrl: SOURCE_PAGE,
      attribution: "Data provided by Zillow Group",
      metrics,
      warnings,
    };
  }
}
