# Deal Velocity

## v1.4.0 — free hybrid comp workspace

The acquisition section accepts a browser-local CSV import (up to 2 MB / 1,000 rows), blank template downloads, manual entry/edit/removal and CSV export. Common Redfin column headers are mapped, but unknown fields remain unknown. Sold price is never substituted with list price; Time on Redfin is not treated as verified marketing DOM. Dates support YYYY-MM-DD and M/D/YYYY. Imports require a source and observation date. No property records are uploaded to a server or redistributed. Users must have permission to use their records.

Users enter subject criteria and individually review records. Distance must be explicitly confirmed (copy measured mileage from the pin workspace). Same property type, ±20% area, ±1 beds/baths, selected radius and pool matching are enforced. Duplicate addresses, future/inconsistent dates, non-arm’s-length transactions and stale active/pending observations (>14 days) are excluded. Sold records are limited to 270 days. Unknown garage, age and arm’s-length status reduce weights. Missing mandatory filters exclude the record with a visible reason.

ARV indication requires three reviewed renovated sales: weighted sale $/sq ft scaled to subject area; weighted 25th/50th/75th percentiles. It is an indication, not an appraisal or confidence interval. ARV comps are not price-band filtered. Marketing time requires three renovated sales near ARV with known DOM and shows the observed middle 50%, not a guaranteed forecast. All counts, sales rates and inventory ratios are explicitly imported-sample statistics, never total market coverage. Price bands overlap and do not imply causation or sale probability. Hold/carry calculations are labeled user-assumption scenarios; no financing costs are inferred.

`/api/local-benchmark?kind=zip&id=33545` (or `kind=county&id=12101`) uses official Realtor.com Economic Research current-month CSVs. A ZIP at the end of the subject address loads automatically; users can explicitly select county FIPS. No silent geography fallback. Source definitions, reporting month, quality flag and retrieval timestamp are shown. Direction is a transparent month-over-month heuristic over DOM, active inventory, pending ratio and price-reduction share; <2% absolute changes are neutral, at least three signals are needed and net ±2 indicates improving/weakening. It is withheld for quality-flagged or >100-day-old observations. This is all-residential context, not subject-price-band analysis. Source data are cached in memory for six hours with single-flight downloads per geography kind; upstream failures do not block comp analysis.

Tests: `node --test tests/comp-analysis.test.mjs tests/address-lookup.test.mjs tests/pin-distance.test.mjs`.

Version 1.3.0 adds a free manual pin-confirmation workspace. Subject and comparison pins can be suggested by address lookup, clicked/dragged on an OpenStreetMap basemap, or entered as coordinates. Both must be explicitly confirmed before showing mileage. Moving pins, editing comparison addresses or changing the subject invalidates confirmation. Pins are session-only and are not saved on the server.

Distance is a Haversine great-circle calculation (mean Earth radius 3958.761316 miles), displayed to two decimals, not survey-grade or driving distance. Radius membership uses the unrounded result; 1, 1.5 and 2 miles are explicit choices with no automatic expansion. User-confirmed pins are not independently verified. County parcel bounding-box centers and Census street-range coordinates are only starting suggestions. Manual placement works independently of nationwide geocoder or Zillow coverage, including Alaska and Hawaii. No city/ZIP centroid fallback is used. The comparison address is user supplied, not an MLS comp.

The Leaflet basemap uses browser-cached standard OSM tiles with visible attribution and normal browser Referer headers; no offline downloads, tile prefetch, periodic map refresh or geocoding through Nominatim is implemented. Tile availability is best effort. Coordinate entry works without map tiles. Follow https://operations.osmfoundation.org/policies/tiles/ and replace the tile provider if traffic exceeds community service capacity.

Tests: `node --test tests/address-lookup.test.mjs tests/pin-distance.test.mjs` (Node 24).

## Nationwide location lookup

- Source: Zillow Research City ZHVI CSV metadata (RegionName, State, Metro, CountyName), not a manually maintained city list.
- Supports all 50 state names/abbreviations, DC and Puerto Rico input; actual coverage depends on source rows.
- Streams the directory instead of retaining the full historical CSV in memory. Concurrent lookups share one download; the compact directory is cached in-process for 24 hours and refreshed on demand.
- Exact normalized city and state matching; multiple markets are rejected as ambiguous. Missing cities or cities with no assigned metro produce explicit coverage messages.
- Full metro names are joined to shortened metric-series names only when primary-city and state matching identifies exactly one series.
- No nearest-city fallback, invented data, or claim that every U.S. locality is covered.
- Address lookup and proposed-ARV scenarios remain available; market statistics remain metro-level.
- Verified examples: Alpharetta GA, Wesley Chapel FL, Irvine CA, Plano TX, New York NY and Springfield IL.

Investor-focused regional housing market dashboard. Property-level underwriting is not available.

This repository is the standalone GitHub/Render edition. It uses conventional Next.js on Node—no Cloudflare Worker, Wrangler, Vinext, or ChatGPT hosting dependency.

## What is live today

- Zillow Research public CSVs provide live **metro-level** for-sale inventory, sales-count nowcast, and mean days-to-pending context.
- No demonstration properties or unsupported ARV, liquidity, DOM, inventory, price-sensitivity or hold recommendations are shown.
- Clickable metric cards expose reported history. Regional sales pace averages require 3, 6 or 9 consecutive reported months; they are nowcasts, not verified comp closings.
- The national city directory maps covered cities explicitly to their source metro. Address lookup uses Census nationwide and the Pasco County Property Appraiser public GIS for explicitly entered Florida cities. County results require a unique normalized physical street/city/state/ZIP match, with a source-record link; no owner information is requested. County matching returns no invented coordinates. Census results are labeled street-range matches, not rooftops. Unmatched addresses remain unverified. ARV drives ±10% scenarios, not valuation or comp filters. Missing data is explicitly unavailable.
- Address regression tests: `node --test tests/address-lookup.test.mjs` (Node 24). The county adapter uses bounded queries, a 15-second timeout and 24-hour Next.js response caching. The exact address `29970 Chapel Chase Dr, Wesley Chapel, FL 33545` matches the county source even though Census currently has no match. This is not a nationwide parcel feed or an ARV validation service.
- The page loads data automatically and checks hourly while open. Source files use six-hour on-demand caching. No paid worker or subscription is added.
- This release uses Zillow Research only. Realtor.com and Redfin are not connected. No ZIP/county price trends are claimed.
- Zillow property pages are **not scraped**. Zillow's published Terms prohibit automated queries and scraping. Zillow's free Research CSVs are aggregate regional data, not a free listing-level comp feed.
- The provider boundary is prepared for MLS Grid. After approval, implement the market-specific RESO mapping in `lib/providers/mls-grid.ts` without rewriting the dashboard calculations.

Do not use regional aggregates alone to make an acquisition decision. Obtain verified subject comparables first.

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
