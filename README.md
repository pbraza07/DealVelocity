# Deal Velocity

Version 1.1.0 adds clickable underwriting evidence panels and 12-month Zillow Research metric history.

Investor-focused residential sales-velocity, inventory, ARV-liquidity, and resale-risk dashboard.

This repository is the standalone GitHub/Render edition. It uses conventional Next.js on Node—no Cloudflare Worker, Wrangler, Vinext, or ChatGPT hosting dependency.

## What is live today

- Zillow Research public CSVs provide live **metro-level** for-sale inventory, sales-count nowcast, and mean days-to-pending context.
- The 3/6/9-month comp analysis, price sensitivity, and underwriting dashboard are fully interactive, but the bundled address-level properties are demonstration records.
- Zillow property pages are **not scraped**. Zillow's published Terms prohibit automated queries and scraping. Zillow's free Research CSVs are aggregate regional data, not a free listing-level comp feed.
- The provider boundary is prepared for MLS Grid. After approval, implement the market-specific RESO mapping in `lib/providers/mls-grid.ts` without rewriting the dashboard calculations.

Do not use the demonstration comp results to make an acquisition decision.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Production check:

```bash
npm test
npm start
```

Health endpoint: `GET /api/health`

## Put the project on GitHub

1. Create an empty GitHub repository named `deal-velocity`.
2. Unzip this package and open a terminal in the extracted folder.
3. Run:

```bash
git init
git add .
git commit -m "Initial Deal Velocity Render app"
git branch -M main
git remote add origin https://github.com/YOUR-USER/deal-velocity.git
git push -u origin main
```

If you prefer the GitHub website, choose **Add file → Upload files**, upload the extracted files, and commit them to `main`.

## Deploy on Render

The included `render.yaml` is a ready-to-use Blueprint.

1. Sign in to Render and connect GitHub.
2. Choose **New → Blueprint**.
3. Select the `deal-velocity` repository.
4. Confirm the `deal-velocity` web service and deploy.
5. Open the generated `onrender.com` URL after the build completes.

Render reads these settings from `render.yaml`:

- Build: `npm ci && npm run build`
- Start: `npm start` (binds to `0.0.0.0` and Render's `PORT`)
- Health check: `/api/health`
- Node: `22.13.0`
- Interim provider: `zillow_research`

The free Render web service sleeps after inactivity and can take about a minute to wake.

## Data-provider configuration

| Variable | Current value | Purpose |
|---|---|---|
| `DATA_PROVIDER` | `zillow_research` | Selects the interim official public aggregate-data adapter |
| `DEFAULT_MARKET_REGION` | `Tampa, FL` | Initial Zillow Research metro |
| `ZILLOW_*_CSV_URL` | Optional | Overrides a CSV path if Zillow changes a download URL |
| `MLS_GRID_TOKEN` | Empty | Future MLS Grid bearer token; add as a Render secret |
| `MLS_GRID_API_URL` | `https://api.mlsgrid.com/v2` | Future MLS Grid base URL |

## MLS Grid migration

1. Obtain MLS Grid approval and confirm the permitted dataset/use case.
2. Store the access token in Render as `MLS_GRID_TOKEN`—never commit it.
3. Map your MLS's RESO fields into the canonical comp shape: address, coordinates, status, dates, price history, DOM, structure, pool, garage, year built, condition, and arm's-length indicators.
4. Implement the adapter in `lib/providers/mls-grid.ts`.
5. Change `DATA_PROVIDER` to `mls_grid` and redeploy.
6. Run record-count, null-rate, duplicate, status, and date-window validation before allowing provider records into underwriting calculations.

## Architecture

```text
Dashboard and underwriting formulas
              |
       Provider interface
          /          \
Zillow Research    MLS Grid
(aggregate now)   (property comps later)
```

The Zillow adapter intentionally supplies context only. A licensed property-level provider must populate the competitive set before live ARV, velocity, inventory, and DOM conclusions are enabled.
