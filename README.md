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

## Production workflow

GitHub and Render are the production source of truth for this project:

- Repository: [pbraza07/DealVelocity](https://github.com/pbraza07/DealVelocity)
- Production service: [DealVelocity on Render](https://dealvelocity.onrender.com)
- Production branch: `main`
- Auto-deploy: every commit to `main`
- Build: `npm ci && npm run build`
- Start: `npm start`
- Health check: `GET /api/health`

All application changes must be committed to this GitHub repository. Render deploys the linked `main` branch automatically; the production URL should be verified only after the Render deploy reaches `live` and the health endpoint passes. Do not treat ZIP packages or edits made only in the Render dashboard as the canonical application source.

Recommended release sequence:

1. Make and test the change in a working branch or local checkout.
2. Commit the tested files to GitHub and merge or push them to `main`.
3. Monitor the matching Render deploy until its status is `live`.
4. Verify `/api/health`, the changed screen, and recent runtime logs.
5. Record the Git commit and Render deploy in the handoff.

The included `render.yaml` preserves the service configuration for recovery or recreation. The current service is already linked to GitHub and should normally be updated through commits rather than manual deploys.

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
