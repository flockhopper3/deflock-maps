# Cloudflare Data Worker — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Domain:** data.dontgetflocked.com

## Problem

FlockHopper currently uses a GitHub Actions workflow to pull ALPR camera data from the Overpass API daily, commit the JSON to the repo, and redeploy via Cloudflare Pages. This couples data freshness to full site rebuilds and bundles a 1.3MB file into the static build. As more map layers are added (ZIP boundaries, county stats, sharing network), this approach won't scale.

## Solution

A single Cloudflare Worker ("flockhopper-data") that:

1. Runs on a cron schedule to fetch data from external sources (starting with Overpass API)
2. Transforms raw data into GeoJSON FeatureCollections
3. Gzips and stores the result in Cloudflare R2
4. Serves the gzipped GeoJSON to the frontend via HTTP at `data.dontgetflocked.com`

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Cloudflare Worker                   │
│          "flockhopper-data"                      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Cron     │  │ HTTP     │  │ Fetcher      │   │
│  │ Handler  │──│ Handler  │  │ Registry     │   │
│  └────┬─────┘  └────┬─────┘  │              │   │
│       │              │        │ - cameras    │   │
│       │              │        │ - zip-bounds │   │
│       │              │        │ - network    │   │
│       │              │        │ - county     │   │
│       ▼              ▼        └──────────────┘   │
│  ┌─────────────────────┐                         │
│  │     R2 Bucket       │                         │
│  │ "flockhopper-data"  │                         │
│  │                     │                         │
│  │ cameras.geojson.gz  │                         │
│  │ zip-bounds.geojson.gz│                        │
│  │ sharing-network.geojson.gz│                   │
│  │ county-stats.geojson.gz   │                   │
│  └─────────────────────┘                         │
└─────────────────────────────────────────────────┘
          │                    ▲
          │  Cron fetches      │  HTTP serves
          ▼                    │
   Overpass API          data.dontgetflocked.com
   (+ other sources)     ← Frontend fetches
```

**Two entry points:**
- **Cron Trigger** — runs on schedule, invokes fetcher(s), transforms to GeoJSON, gzips, writes to R2
- **HTTP Handler** — serves gzipped GeoJSON from R2 with proper headers

## Fetcher Module System

Each dataset is a fetcher module conforming to a shared interface:

```typescript
interface Fetcher {
  name: string;                    // e.g., "cameras"
  r2Key: string;                   // e.g., "cameras.geojson.gz"
  schedule: string;                // cron expression, e.g., "0 8 * * *"
  fetch(): Promise<GeoJSON.FeatureCollection>;
}
```

### File Structure

```
src/
  index.ts              — Worker entry: cron handler + HTTP handler
  fetchers/
    registry.ts         — Maps cron schedules → fetchers
    cameras.ts          — Overpass query + transform to GeoJSON
  lib/
    overpass.ts          — Shared Overpass client (query, retry, fallback endpoints)
    geojson.ts           — GeoJSON FeatureCollection builder
    gzip.ts              — Gzip compression utility
    r2.ts                — R2 read/write helpers
```

Adding a new layer = create a new fetcher in `fetchers/`, register it in `registry.ts`.

### Camera Fetcher (Initial Implementation)

Ported from existing `update-cameras.sh` and Python post-processing:

- 3 fallback Overpass endpoints, 300s timeout each
- **Full Overpass query** (the `>; out skel qt;` suffix is required to resolve way node geometry for centroid calculation of way-typed cameras):

```
[out:json][timeout:300];
area["ISO3166-1"="US"]->.us;
(
  node["man_made"="surveillance"]["surveillance:type"="ALPR"](area.us);
  way["man_made"="surveillance"]["surveillance:type"="ALPR"](area.us);
);
out meta;
>;
out skel qt;
```

- Transforms nodes/ways into GeoJSON Features. Way-typed cameras use the centroid of their child nodes as geometry.
- **Properties** (mapped from OSM tags):
  - `osmId`, `osmType`, `lat`, `lon`
  - `operator` ← `tags.operator`
  - `brand` ← `tags.surveillance:brand` or `tags.brand`
  - `ref` ← `tags.ref`
  - `startDate` ← `tags.start_date`
  - `direction` ← `tags.direction` (numeric degrees 0-360)
  - `directionCardinal` ← `tags.direction` (parsed from cardinal like "N", "SW")
  - `surveillanceZone` ← `tags.surveillance:zone`
  - `mountType` ← `tags['camera:mount']`
  - `osmTimestamp`, `osmVersion` ← element metadata
  - Note: `model` is defined in the TypeScript type but not currently populated by any OSM tag in the existing pipeline. Omitted from initial implementation.
- Validates ≥50K features before writing to R2
- On validation failure, keeps existing R2 object intact

## HTTP Handler

### Routes

```
GET /cameras.geojson.gz          → serves from R2
GET /zip-bounds.geojson.gz       → serves from R2
GET /sharing-network.geojson.gz  → serves from R2
GET /county-stats.geojson.gz     → serves from R2
GET /                            → JSON listing of available datasets
```

Any other path returns 404.

### Response Headers

```
Content-Type: application/geo+json
Content-Encoding: gzip
Cache-Control: public, max-age=3600, s-maxage=86400
Access-Control-Allow-Origin: <origin-checked>
ETag: <R2 object etag>
```

- `s-maxage=86400` — Cloudflare edge cache holds for 24h (aligned with daily cron)
- `max-age=3600` — browsers re-validate after 1h
- **CORS** — Worker checks the `Origin` header against an allowlist: `https://dontgetflocked.com` and `https://www.dontgetflocked.com` always allowed; `http://localhost:3000` allowed when the Worker's `ENVIRONMENT` var is `development`. Responds with the matched origin, not `*`.
- **Gzip always served** — all modern browsers support gzip. The `Content-Encoding: gzip` header is always set; no content negotiation. `Vary: Accept-Encoding` is omitted since there is only one representation.
- ETag support — returns 304 Not Modified when data unchanged

### Index Endpoint (`GET /`)

```json
{
  "datasets": [
    { "name": "cameras", "path": "/cameras.geojson.gz", "lastUpdated": "2026-03-20T08:00:00Z" },
    ...
  ]
}
```

Populated from R2 object custom metadata.

## Cron Scheduling

Configured in `wrangler.toml`:

```toml
[triggers]
crons = ["0 8 * * *"]
```

Expandable as layers are added:

```toml
crons = ["0 8 * * *", "0 0 * * 1"]  # daily + weekly
```

The cron handler checks which schedule fired and runs matching fetcher(s).

## Error Handling

- **Overpass query fails on all 3 endpoints** — Log error, skip update. R2 serves last good data.
- **Validation fails (<50K cameras)** — Skip write, last good version stays.
- **R2 write fails** — Log error. Next cron run retries.
- **Fetcher throws unexpectedly** — Caught at cron handler level, logged. Other fetchers still run independently.
- **No partial writes** — full payload gzipped in memory, then written atomically to R2.

### R2 Object Metadata

Each object gets custom metadata:

```
x-last-updated: 2026-03-20T08:00:12Z
x-feature-count: 62347
x-source: overpass
```

Powers the `/` index endpoint and provides operational visibility.

## Frontend Integration

### Changes

1. **`cameraDataService.ts`** — all data format changes happen here (not in `cameraStore.ts`):
   - Change fetch URL from `/cameras-us.json` to `${VITE_DATA_API_URL}/cameras.geojson.gz`
   - Browser handles gzip decompression automatically via `Content-Encoding` header
   - Update validation: replace `Array.isArray(data)` check with `data.type === 'FeatureCollection' && Array.isArray(data.features)`
   - Update mapping: extract `lon` from `feature.geometry.coordinates[0]`, `lat` from `feature.geometry.coordinates[1]`
   - Map all other properties from `feature.properties.*` to the existing `ALPRCamera` type (including `ref` and `startDate`)

2. **`cameraStore.ts`** — no changes needed. It already receives `ALPRCamera[]` from `cameraDataService.ts`.

3. **New env var** — `VITE_DATA_API_URL=https://data.dontgetflocked.com`
   - `.env.development` should set `VITE_DATA_API_URL=http://localhost:8787` to use a local `wrangler dev` instance, or `https://data.dontgetflocked.com` to use production data during frontend development. Do not leave blank.

### Bootstrap / Migration Sequence

The R2 bucket will be empty on first deployment. To avoid a gap in service:

1. Deploy the Worker with cron trigger
2. Manually trigger the cron via `wrangler` CLI or Cloudflare dashboard to seed R2
3. Verify `data.dontgetflocked.com/cameras.geojson.gz` returns valid data
4. Deploy the frontend changes (switch `cameraDataService.ts` to the new URL)
5. Only then remove `public/cameras-us.json`, the GitHub Actions workflow, and the shell script

### Removals (after bootstrap is verified)

- `public/cameras-us.json` — no longer bundled in the static build
- `.github/workflows/update-cameras.yml` — replaced by Worker cron
- `scripts/update-cameras.sh` — logic ported to Worker

## GeoJSON Output Format

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-77.03, 38.89] },
      "properties": {
        "osmId": 12345,
        "osmType": "node",
        "operator": "Flock Safety",
        "brand": "Flock",
        "ref": "CAM-12345",
        "startDate": "2024-06-01",
        "direction": 180,
        "directionCardinal": "S",
        "surveillanceZone": "traffic",
        "mountType": "pole",
        "osmTimestamp": "2025-11-15T00:00:00Z",
        "osmVersion": 3
      }
    }
  ]
}
```

## Infrastructure Requirements

- **Cloudflare Worker** — "flockhopper-data" on **Workers Standard plan** (required for cron triggers and extended CPU time). The Overpass fetch is I/O-bound, but JSON parsing 62K features + GeoJSON transformation + gzip compression requires significant CPU. `wrangler.toml` must set:
  ```toml
  [limits]
  cpu_ms = 30000
  ```
- **R2 Bucket** — "flockhopper-data" (free tier: 10GB storage, 10M reads/month)
- **DNS** — `data.dontgetflocked.com` CNAME to the Worker route
- **wrangler.toml** — new config in the CLOUDFLARE REPO, separate from the Pages `wrangler.jsonc`
