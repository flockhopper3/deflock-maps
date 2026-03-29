# Cloudflare Data Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GitHub Actions camera data pipeline with a Cloudflare Worker that fetches from Overpass, transforms to GeoJSON, gzips, stores in R2, and serves via HTTP at `data.dontgetflocked.com`.

**Architecture:** Single Cloudflare Worker with two entry points: a cron trigger that runs fetcher modules (starting with cameras) and writes gzipped GeoJSON to R2, and an HTTP handler that serves those files with proper caching and CORS headers. Modular fetcher system allows adding new data layers by dropping in a new file.

**Tech Stack:** Cloudflare Workers (TypeScript), Cloudflare R2, Wrangler CLI, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-03-20-cloudflare-data-worker-design.md`

---

## File Structure

The Worker is a separate project within the same repo, at `worker/` alongside the existing frontend.

```
worker/
  package.json              — Worker dependencies and scripts
  tsconfig.json             — TypeScript config for Workers runtime
  wrangler.toml             — Worker config (R2 binding, cron triggers, CPU limits)
  vitest.config.ts          — Test config
  src/
    index.ts                — Worker entry: exports fetch + scheduled handlers
    fetchers/
      registry.ts           — Maps cron schedules to fetcher modules
      cameras.ts            — Overpass query + transform to GeoJSON FeatureCollection
    lib/
      overpass.ts            — Overpass API client with fallback endpoints and retry
      geojson.ts             — GeoJSON FeatureCollection builder utility
      gzip.ts                — Gzip compression using CompressionStream API
      r2.ts                  — R2 read/write helpers with metadata
      cors.ts                — CORS origin allowlist checker
    types.ts                — Shared types (Fetcher interface, Env bindings, etc.)
  tests/
    fetchers/
      cameras.test.ts       — Camera fetcher transform logic tests
    lib/
      overpass.test.ts       — Overpass client tests (mocked HTTP)
      geojson.test.ts        — GeoJSON builder tests
      gzip.test.ts           — Gzip round-trip tests
      cors.test.ts           — CORS allowlist tests
    index.test.ts            — Integration tests for HTTP handler routing
```

**Frontend changes** (in existing codebase):
- Modify: `src/services/cameraDataService.ts` — switch to Worker URL, parse GeoJSON format
- Create: `.env.development` — add `VITE_DATA_API_URL`
- Modify: `.env.production` (or equivalent) — add `VITE_DATA_API_URL`

---

## Task 1: Scaffold Worker Project

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`
- Create: `worker/vitest.config.ts`

- [ ] **Step 1: Create `worker/package.json`**

```json
{
  "name": "flockhopper-data-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260101.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `worker/wrangler.toml`**

```toml
name = "flockhopper-data"
main = "src/index.ts"
compatibility_date = "2026-01-23"

[triggers]
crons = ["0 8 * * *"]

[limits]
cpu_ms = 30000

[[r2_buckets]]
binding = "DATA_BUCKET"
bucket_name = "flockhopper-data"

[vars]
ENVIRONMENT = "production"
```

- [ ] **Step 4: Create `worker/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 5: Install dependencies**

Run: `cd worker && npm install`
Expected: `node_modules/` created, lockfile generated.

- [ ] **Step 6: Commit**

```bash
git add worker/package.json worker/tsconfig.json worker/wrangler.toml worker/vitest.config.ts worker/package-lock.json
git commit -m "feat: scaffold Cloudflare Worker project for data pipeline"
```

---

## Task 2: Shared Types

**Files:**
- Create: `worker/src/types.ts`

- [ ] **Step 1: Create `worker/src/types.ts`**

```typescript
export interface Env {
  DATA_BUCKET: R2Bucket;
  ENVIRONMENT: string;
}

export interface Fetcher {
  name: string;
  r2Key: string;
  schedule: string;
  fetch(): Promise<GeoJSON.FeatureCollection>;
}

export interface DatasetMetadata {
  lastUpdated: string;
  featureCount: number;
  source: string;
}

// GeoJSON types (minimal, no external dependency needed)
export namespace GeoJSON {
  export interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }

  export interface Feature {
    type: 'Feature';
    geometry: Point;
    properties: Record<string, unknown>;
  }

  export interface Point {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  }
}

// Overpass API response types
export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  timestamp?: string;
  version?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/types.ts
git commit -m "feat: add shared types for Worker (Env, Fetcher, GeoJSON, Overpass)"
```

---

## Task 3: CORS Utility

**Files:**
- Create: `worker/src/lib/cors.ts`
- Create: `worker/tests/lib/cors.test.ts`

- [ ] **Step 1: Write failing tests for CORS**

Create `worker/tests/lib/cors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getAllowedOrigin, corsHeaders } from '../../src/lib/cors';

describe('getAllowedOrigin', () => {
  it('allows dontgetflocked.com in production', () => {
    expect(getAllowedOrigin('https://dontgetflocked.com', 'production')).toBe('https://dontgetflocked.com');
  });

  it('allows www.dontgetflocked.com in production', () => {
    expect(getAllowedOrigin('https://www.dontgetflocked.com', 'production')).toBe('https://www.dontgetflocked.com');
  });

  it('rejects localhost in production', () => {
    expect(getAllowedOrigin('http://localhost:3000', 'production')).toBeNull();
  });

  it('allows localhost in development', () => {
    expect(getAllowedOrigin('http://localhost:3000', 'development')).toBe('http://localhost:3000');
  });

  it('rejects unknown origins', () => {
    expect(getAllowedOrigin('https://evil.com', 'production')).toBeNull();
  });

  it('returns null for missing origin', () => {
    expect(getAllowedOrigin(null, 'production')).toBeNull();
  });
});

describe('corsHeaders', () => {
  it('includes origin when allowed', () => {
    const headers = corsHeaders('https://dontgetflocked.com', 'production');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://dontgetflocked.com');
  });

  it('omits origin header when not allowed', () => {
    const headers = corsHeaders('https://evil.com', 'production');
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run tests/lib/cors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CORS utility**

Create `worker/src/lib/cors.ts`:

```typescript
const PRODUCTION_ORIGINS = [
  'https://dontgetflocked.com',
  'https://www.dontgetflocked.com',
];

const DEV_ORIGINS = [
  'http://localhost:3000',
];

export function getAllowedOrigin(
  origin: string | null,
  environment: string
): string | null {
  if (!origin) return null;

  if (PRODUCTION_ORIGINS.includes(origin)) return origin;
  if (environment === 'development' && DEV_ORIGINS.includes(origin)) return origin;

  return null;
}

export function corsHeaders(
  origin: string | null,
  environment: string
): Record<string, string> {
  const allowed = getAllowedOrigin(origin, environment);
  if (!allowed) return {};

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run tests/lib/cors.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/cors.ts worker/tests/lib/cors.test.ts
git commit -m "feat: add CORS origin allowlist utility"
```

---

## Task 4: Gzip Utility

**Files:**
- Create: `worker/src/lib/gzip.ts`
- Create: `worker/tests/lib/gzip.test.ts`

- [ ] **Step 1: Write failing test**

Create `worker/tests/lib/gzip.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { gzipCompress } from '../../src/lib/gzip';

describe('gzipCompress', () => {
  it('compresses a string to a smaller ArrayBuffer', async () => {
    const input = JSON.stringify({ hello: 'world' }).repeat(100);
    const compressed = await gzipCompress(input);

    expect(compressed).toBeInstanceOf(ArrayBuffer);
    expect(compressed.byteLength).toBeLessThan(new TextEncoder().encode(input).byteLength);
  });

  it('produces valid gzip that can be decompressed', async () => {
    const input = JSON.stringify({ type: 'FeatureCollection', features: [] });
    const compressed = await gzipCompress(input);

    // Decompress using DecompressionStream
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(compressed));
    writer.close();

    const decompressedResponse = new Response(ds.readable);
    const text = await decompressedResponse.text();
    expect(text).toBe(input);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd worker && npx vitest run tests/lib/gzip.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement gzip utility**

Create `worker/src/lib/gzip.ts`:

```typescript
/**
 * Gzip compress a string using the Web Streams CompressionStream API.
 * Available in Cloudflare Workers runtime.
 */
export async function gzipCompress(input: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result.buffer;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run tests/lib/gzip.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/gzip.ts worker/tests/lib/gzip.test.ts
git commit -m "feat: add gzip compression utility using CompressionStream"
```

---

## Task 5: R2 Helpers

**Files:**
- Create: `worker/src/lib/r2.ts`

- [ ] **Step 1: Create R2 helper**

Create `worker/src/lib/r2.ts`:

```typescript
import type { DatasetMetadata } from '../types';

/**
 * Write gzipped data to R2 with custom metadata.
 */
export async function writeToR2(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  metadata: DatasetMetadata
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: {
      contentType: 'application/geo+json',
      contentEncoding: 'gzip',
    },
    customMetadata: {
      'x-last-updated': metadata.lastUpdated,
      'x-feature-count': String(metadata.featureCount),
      'x-source': metadata.source,
    },
  });
}

/**
 * Read an object from R2. Returns null if not found.
 */
export async function readFromR2(
  bucket: R2Bucket,
  key: string
): Promise<{ body: ReadableStream; etag: string; metadata: Record<string, string> } | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;

  return {
    body: obj.body,
    etag: obj.etag,
    metadata: obj.customMetadata ?? {},
  };
}

/**
 * List all dataset objects and their metadata (for the index endpoint).
 * Uses head() per object because list() does not return customMetadata.
 */
export async function listDatasets(
  bucket: R2Bucket
): Promise<Array<{ name: string; path: string; lastUpdated: string | null }>> {
  const listed = await bucket.list({ prefix: '', limit: 100 });

  const geojsonKeys = listed.objects
    .filter((obj) => obj.key.endsWith('.geojson.gz'))
    .map((obj) => obj.key);

  const results: Array<{ name: string; path: string; lastUpdated: string | null }> = [];

  for (const key of geojsonKeys) {
    const head = await bucket.head(key);
    results.push({
      name: key.replace('.geojson.gz', ''),
      path: `/${key}`,
      lastUpdated: head?.customMetadata?.['x-last-updated'] ?? null,
    });
  }

  return results;
}
```

- [ ] **Step 2: Commit**

R2 helpers depend on the Workers runtime `R2Bucket` type — unit testing requires Miniflare or integration tests. We test these through the integration tests in Task 9.

```bash
git add worker/src/lib/r2.ts
git commit -m "feat: add R2 read/write/list helpers with metadata"
```

---

## Task 6: GeoJSON Builder

**Files:**
- Create: `worker/src/lib/geojson.ts`
- Create: `worker/tests/lib/geojson.test.ts`

- [ ] **Step 1: Write failing test**

Create `worker/tests/lib/geojson.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildFeatureCollection, pointFeature } from '../../src/lib/geojson';

describe('pointFeature', () => {
  it('creates a GeoJSON point feature with properties', () => {
    const feature = pointFeature(-77.03, 38.89, { osmId: 123, operator: 'Flock' });

    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    expect(feature.geometry.coordinates).toEqual([-77.03, 38.89]);
    expect(feature.properties.osmId).toBe(123);
    expect(feature.properties.operator).toBe('Flock');
  });
});

describe('buildFeatureCollection', () => {
  it('wraps features in a FeatureCollection', () => {
    const features = [
      pointFeature(-77.03, 38.89, { osmId: 1 }),
      pointFeature(-118.24, 34.05, { osmId: 2 }),
    ];

    const fc = buildFeatureCollection(features);

    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
  });

  it('returns empty FeatureCollection for no features', () => {
    const fc = buildFeatureCollection([]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd worker && npx vitest run tests/lib/geojson.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement GeoJSON builder**

Create `worker/src/lib/geojson.ts`:

```typescript
import type { GeoJSON } from '../types';

export function pointFeature(
  lon: number,
  lat: number,
  properties: Record<string, unknown>
): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
    properties,
  };
}

export function buildFeatureCollection(
  features: GeoJSON.Feature[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run tests/lib/geojson.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/geojson.ts worker/tests/lib/geojson.test.ts
git commit -m "feat: add GeoJSON FeatureCollection builder"
```

---

## Task 7: Overpass API Client

**Files:**
- Create: `worker/src/lib/overpass.ts`
- Create: `worker/tests/lib/overpass.test.ts`

- [ ] **Step 1: Write failing tests**

Create `worker/tests/lib/overpass.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryOverpass, OVERPASS_ENDPOINTS } from '../../src/lib/overpass';

describe('queryOverpass', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on successful response', async () => {
    const mockData = { version: 0.6, elements: [{ type: 'node', id: 1, lat: 38.9, lon: -77.0 }] };

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 })
    );

    const result = await queryOverpass('[out:json];node(1);out;');
    expect(result).toEqual(mockData);
  });

  it('falls back to next endpoint on failure', async () => {
    const mockData = { version: 0.6, elements: [{ type: 'node', id: 1, lat: 38.9, lon: -77.0 }] };

    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));

    const result = await queryOverpass('[out:json];node(1);out;');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after all endpoints fail', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockRejectedValueOnce(new Error('fail3'));

    await expect(queryOverpass('[out:json];node(1);out;')).rejects.toThrow(
      'All Overpass endpoints failed'
    );
  });

  it('throws on non-200 status', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('error', { status: 429 }))
      .mockResolvedValueOnce(new Response('error', { status: 500 }))
      .mockResolvedValueOnce(new Response('error', { status: 503 }));

    await expect(queryOverpass('[out:json];node(1);out;')).rejects.toThrow(
      'All Overpass endpoints failed'
    );
  });

  it('exports the 3 known endpoints', () => {
    expect(OVERPASS_ENDPOINTS).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run tests/lib/overpass.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Overpass client**

Create `worker/src/lib/overpass.ts`:

```typescript
import type { OverpassResponse } from '../types';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const TIMEOUT_MS = 300_000; // 5 minutes

export async function queryOverpass(query: string): Promise<OverpassResponse> {
  const errors: Error[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FlockHopper/1.0 (ALPR Camera Router)',
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${endpoint}`);
      }

      const data: OverpassResponse = await response.json();

      if (!data.elements || data.elements.length === 0) {
        throw new Error(`Empty response from ${endpoint}`);
      }

      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);
      console.error(`Overpass endpoint ${endpoint} failed:`, err.message);
    }
  }

  throw new Error(
    `All Overpass endpoints failed: ${errors.map((e) => e.message).join('; ')}`
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run tests/lib/overpass.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/overpass.ts worker/tests/lib/overpass.test.ts
git commit -m "feat: add Overpass API client with 3 fallback endpoints"
```

---

## Task 8: Camera Fetcher

**Files:**
- Create: `worker/src/fetchers/cameras.ts`
- Create: `worker/tests/fetchers/cameras.test.ts`

This is the core logic — ported from `scripts/update-cameras.sh` lines 83-179.

- [ ] **Step 1: Write failing tests**

Create `worker/tests/fetchers/cameras.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transformOverpassToGeoJSON, parseDirection, CAMERAS_OVERPASS_QUERY } from '../../src/fetchers/cameras';
import type { OverpassResponse } from '../../src/types';

describe('parseDirection', () => {
  it('parses numeric direction', () => {
    expect(parseDirection('180')).toBe(180);
  });

  it('parses cardinal N', () => {
    expect(parseDirection('N')).toBe(0);
  });

  it('parses cardinal SW', () => {
    expect(parseDirection('SW')).toBe(225);
  });

  it('handles semicolon-separated values (takes first)', () => {
    expect(parseDirection('90;270')).toBe(90);
  });

  it('returns null for empty string', () => {
    expect(parseDirection('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseDirection(undefined)).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(parseDirection('not-a-direction')).toBeNull();
  });
});

describe('transformOverpassToGeoJSON', () => {
  const minimalNodeResponse: OverpassResponse = {
    version: 0.6,
    generator: 'Overpass API',
    elements: [
      {
        type: 'node',
        id: 12345,
        lat: 38.89,
        lon: -77.03,
        timestamp: '2025-11-15T00:00:00Z',
        version: 3,
        tags: {
          'man_made': 'surveillance',
          'surveillance:type': 'ALPR',
          'operator': 'Flock Safety',
          'brand': 'Flock',
          'direction': '180',
          'surveillance:zone': 'traffic',
          'camera:mount': 'pole',
          'ref': 'CAM-001',
          'start_date': '2024-06-01',
        },
      },
    ],
  };

  it('transforms a node element to a GeoJSON Feature', () => {
    const fc = transformOverpassToGeoJSON(minimalNodeResponse);

    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(1);

    const f = fc.features[0];
    expect(f.geometry.coordinates).toEqual([-77.03, 38.89]);
    expect(f.properties.osmId).toBe(12345);
    expect(f.properties.osmType).toBe('node');
    expect(f.properties.operator).toBe('Flock Safety');
    expect(f.properties.brand).toBe('Flock');
    expect(f.properties.direction).toBe(180);
    expect(f.properties.directionCardinal).toBeUndefined(); // numeric direction, not a cardinal string
    expect(f.properties.surveillanceZone).toBe('traffic');
    expect(f.properties.mountType).toBe('pole');
    expect(f.properties.ref).toBe('CAM-001');
    expect(f.properties.startDate).toBe('2024-06-01');
    expect(f.properties.osmTimestamp).toBe('2025-11-15T00:00:00Z');
    expect(f.properties.osmVersion).toBe(3);
  });

  it('computes centroid for way elements', () => {
    const wayResponse: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        {
          type: 'way',
          id: 99999,
          tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' },
          nodes: [1, 2],
          timestamp: '2025-01-01T00:00:00Z',
          version: 1,
        },
        { type: 'node', id: 1, lat: 40.0, lon: -74.0 },
        { type: 'node', id: 2, lat: 40.2, lon: -74.2 },
      ],
    };

    const fc = transformOverpassToGeoJSON(wayResponse);
    expect(fc.features).toHaveLength(1);

    const coords = fc.features[0].geometry.coordinates;
    expect(coords[0]).toBeCloseTo(-74.1, 5); // lon = avg(-74.0, -74.2)
    expect(coords[1]).toBeCloseTo(40.1, 5);  // lat = avg(40.0, 40.2)
  });

  it('skips elements without surveillance:type=ALPR', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        { type: 'node', id: 1, lat: 38.0, lon: -77.0, tags: { 'man_made': 'surveillance' } },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features).toHaveLength(0);
  });

  it('skips elements without coordinates', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        { type: 'way', id: 1, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' }, nodes: [999] },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features).toHaveLength(0);
  });

  it('sorts features by osmId', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        { type: 'node', id: 300, lat: 38.0, lon: -77.0, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' } },
        { type: 'node', id: 100, lat: 39.0, lon: -76.0, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' } },
        { type: 'node', id: 200, lat: 40.0, lon: -75.0, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' } },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features.map((f) => f.properties.osmId)).toEqual([100, 200, 300]);
  });

  it('maps manufacturer tag to brand when brand is missing', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        {
          type: 'node', id: 1, lat: 38.0, lon: -77.0,
          tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR', 'manufacturer': 'Vigilant' },
        },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features[0].properties.brand).toBe('Vigilant');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run tests/fetchers/cameras.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement camera fetcher**

Create `worker/src/fetchers/cameras.ts`:

```typescript
import type { OverpassResponse, OverpassElement, GeoJSON } from '../types';
import { queryOverpass } from '../lib/overpass';
import { pointFeature, buildFeatureCollection } from '../lib/geojson';

export const CAMERAS_OVERPASS_QUERY = `[out:json][timeout:300];
area["ISO3166-1"="US"]->.us;
(
  node["man_made"="surveillance"]["surveillance:type"="ALPR"](area.us);
  way["man_made"="surveillance"]["surveillance:type"="ALPR"](area.us);
);
out meta;
>;
out skel qt;`;

const MIN_CAMERA_COUNT = 50_000;

const CARDINALS: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

export function parseDirection(value: string | undefined): number | null {
  if (!value) return null;

  const upper = value.toUpperCase();
  if (upper in CARDINALS) return CARDINALS[upper];

  try {
    const str = value.includes(';') ? value.split(';')[0] : value;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

export function transformOverpassToGeoJSON(
  data: OverpassResponse
): GeoJSON.FeatureCollection {
  // Build node lookup for way centroid calculation
  const nodesById = new Map<number, { lat: number; lon: number }>();
  for (const el of data.elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodesById.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  const features: GeoJSON.Feature[] = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};

    // Only process surveillance ALPR elements
    if (tags['man_made'] !== 'surveillance') continue;
    if (tags['surveillance:type'] !== 'ALPR') continue;

    let lat = el.lat;
    let lon = el.lon;

    // For ways, compute centroid from child nodes
    if (el.type === 'way' && el.nodes) {
      const wayNodes = el.nodes
        .map((id) => nodesById.get(id))
        .filter((n): n is { lat: number; lon: number } => n !== undefined);

      if (wayNodes.length > 0) {
        lat = wayNodes.reduce((sum, n) => sum + n.lat, 0) / wayNodes.length;
        lon = wayNodes.reduce((sum, n) => sum + n.lon, 0) / wayNodes.length;
      }
    }

    if (lat === undefined || lon === undefined) continue;

    const directionTag = tags['direction'] || tags['camera:direction'];
    const direction = parseDirection(directionTag);
    // directionCardinal stores the raw tag only when it's a cardinal string (N, SW, etc.)
    const isCardinal = directionTag ? directionTag.toUpperCase() in CARDINALS : false;

    const properties: Record<string, unknown> = {
      osmId: el.id,
      osmType: el.type,
    };

    if (tags['operator']) properties.operator = tags['operator'];
    if (tags['brand'] || tags['manufacturer']) {
      properties.brand = tags['brand'] || tags['manufacturer'];
    }
    if (direction !== null) properties.direction = direction;
    if (isCardinal) properties.directionCardinal = directionTag;
    if (tags['surveillance:zone']) properties.surveillanceZone = tags['surveillance:zone'];
    if (tags['camera:mount']) properties.mountType = tags['camera:mount'];
    if (tags['ref']) properties.ref = tags['ref'];
    if (tags['start_date']) properties.startDate = tags['start_date'];
    if (el.timestamp) properties.osmTimestamp = el.timestamp;
    if (el.version) properties.osmVersion = el.version;

    features.push(pointFeature(lon, lat, properties));
  }

  // Sort by osmId for deterministic output
  features.sort((a, b) => (a.properties.osmId as number) - (b.properties.osmId as number));

  return buildFeatureCollection(features);
}

export async function fetchCameras(): Promise<{
  featureCollection: GeoJSON.FeatureCollection;
  featureCount: number;
}> {
  console.log('Fetching camera data from Overpass API...');
  const data = await queryOverpass(CAMERAS_OVERPASS_QUERY);

  console.log(`Received ${data.elements.length} elements, transforming to GeoJSON...`);
  const featureCollection = transformOverpassToGeoJSON(data);
  const featureCount = featureCollection.features.length;

  console.log(`Transformed to ${featureCount} camera features`);

  if (featureCount < MIN_CAMERA_COUNT) {
    throw new Error(
      `Validation failed: only ${featureCount} cameras (minimum ${MIN_CAMERA_COUNT}). Skipping update.`
    );
  }

  return { featureCollection, featureCount };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run tests/fetchers/cameras.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/fetchers/cameras.ts worker/tests/fetchers/cameras.test.ts
git commit -m "feat: add camera fetcher — Overpass query + GeoJSON transform"
```

---

## Task 9: Fetcher Registry

**Files:**
- Create: `worker/src/fetchers/registry.ts`

- [ ] **Step 1: Create fetcher registry**

Create `worker/src/fetchers/registry.ts`:

```typescript
import { fetchCameras } from './cameras';
import type { GeoJSON } from '../types';

interface RegisteredFetcher {
  name: string;
  r2Key: string;
  source: string;
  fetch(): Promise<{ featureCollection: GeoJSON.FeatureCollection; featureCount: number }>;
}

const fetchers: RegisteredFetcher[] = [
  {
    name: 'cameras',
    r2Key: 'cameras.geojson.gz',
    source: 'overpass',
    fetch: fetchCameras,
  },
];

/**
 * Get all fetchers that should run for a given cron schedule.
 * For now, all fetchers run on every cron trigger (daily).
 * As more layers are added with different schedules, this can
 * be expanded to match cron expressions.
 */
export function getFetchersForSchedule(_cron: string): RegisteredFetcher[] {
  // Currently all fetchers run daily
  return fetchers;
}

export function getAllFetchers(): RegisteredFetcher[] {
  return fetchers;
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/fetchers/registry.ts
git commit -m "feat: add fetcher registry for cron → fetcher mapping"
```

---

## Task 10: Worker Entry Point

**Files:**
- Create: `worker/src/index.ts`
- Create: `worker/tests/index.test.ts`

- [ ] **Step 1: Write failing tests for HTTP handler**

Create `worker/tests/index.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the handler logic by extracting it. Since the Worker entry
// exports a default object with fetch/scheduled, we test routing logic
// by simulating requests.

// Mock R2 bucket
function createMockBucket(objects: Record<string, { body: string; etag: string; metadata: Record<string, string> }>) {
  return {
    get: vi.fn(async (key: string) => {
      const obj = objects[key];
      if (!obj) return null;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(obj.body));
            controller.close();
          },
        }),
        etag: obj.etag,
        customMetadata: obj.metadata,
        httpMetadata: { contentType: 'application/geo+json', contentEncoding: 'gzip' },
      };
    }),
    head: vi.fn(async (key: string) => {
      const obj = objects[key];
      if (!obj) return null;
      return {
        key,
        etag: obj.etag,
        customMetadata: obj.metadata,
      };
    }),
    list: vi.fn(async () => ({
      objects: Object.keys(objects).map((key) => ({
        key,
        // Note: R2 list() does NOT return customMetadata — head() is used instead
      })),
    })),
    put: vi.fn(),
  };
}

// Import after mocks are set up
import { handleFetchRequest } from '../src/index';

describe('HTTP handler', () => {
  const mockBucket = createMockBucket({
    'cameras.geojson.gz': {
      body: 'gzipped-data',
      etag: '"abc123"',
      metadata: { 'x-last-updated': '2026-03-20T08:00:00Z', 'x-feature-count': '62000' },
    },
  });

  const env = { DATA_BUCKET: mockBucket as unknown as R2Bucket, ENVIRONMENT: 'production' };

  it('serves dataset from R2 with correct headers', async () => {
    const req = new Request('https://data.dontgetflocked.com/cameras.geojson.gz', {
      headers: { Origin: 'https://dontgetflocked.com' },
    });

    const res = await handleFetchRequest(req, env);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/geo+json');
    expect(res.headers.get('Content-Encoding')).toBe('gzip');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=86400');
    expect(res.headers.get('ETag')).toBe('"abc123"');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://dontgetflocked.com');
  });

  it('returns 404 for unknown paths', async () => {
    const req = new Request('https://data.dontgetflocked.com/unknown.geojson.gz');
    const res = await handleFetchRequest(req, env);
    expect(res.status).toBe(404);
  });

  it('returns 304 when ETag matches', async () => {
    const req = new Request('https://data.dontgetflocked.com/cameras.geojson.gz', {
      headers: { 'If-None-Match': '"abc123"', Origin: 'https://dontgetflocked.com' },
    });

    const res = await handleFetchRequest(req, env);
    expect(res.status).toBe(304);
  });

  it('returns dataset index at /', async () => {
    const req = new Request('https://data.dontgetflocked.com/', {
      headers: { Origin: 'https://dontgetflocked.com' },
    });

    const res = await handleFetchRequest(req, env);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.datasets).toHaveLength(1);
    expect(body.datasets[0].name).toBe('cameras');
  });

  it('handles CORS preflight', async () => {
    const req = new Request('https://data.dontgetflocked.com/cameras.geojson.gz', {
      method: 'OPTIONS',
      headers: { Origin: 'https://dontgetflocked.com' },
    });

    const res = await handleFetchRequest(req, env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://dontgetflocked.com');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run tests/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Worker entry point**

Create `worker/src/index.ts`:

```typescript
import type { Env } from './types';
import { corsHeaders } from './lib/cors';
import { readFromR2, listDatasets, writeToR2 } from './lib/r2';
import { gzipCompress } from './lib/gzip';
import { getFetchersForSchedule } from './fetchers/registry';

export async function handleFetchRequest(
  request: Request,
  env: { DATA_BUCKET: R2Bucket; ENVIRONMENT: string },
  _ctx?: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(origin, env.ENVIRONMENT);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  // Index endpoint
  if (url.pathname === '/' || url.pathname === '') {
    const datasets = await listDatasets(env.DATA_BUCKET);
    return new Response(JSON.stringify({ datasets }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...cors,
      },
    });
  }

  // Dataset endpoint — strip leading slash
  const key = url.pathname.slice(1);
  if (!key.endsWith('.geojson.gz')) {
    return new Response('Not found', { status: 404, headers: cors });
  }

  const obj = await readFromR2(env.DATA_BUCKET, key);
  if (!obj) {
    return new Response('Not found', { status: 404, headers: cors });
  }

  // ETag conditional response
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch && ifNoneMatch === obj.etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: obj.etag, ...cors },
    });
  }

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/geo+json',
      'Content-Encoding': 'gzip',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      ETag: obj.etag,
      ...cors,
    },
  });
}

async function handleScheduled(
  event: ScheduledEvent,
  env: Env
): Promise<void> {
  const fetchers = getFetchersForSchedule(event.cron);

  for (const fetcher of fetchers) {
    try {
      console.log(`Running fetcher: ${fetcher.name}`);
      const { featureCollection, featureCount } = await fetcher.fetch();

      const json = JSON.stringify(featureCollection);
      const compressed = await gzipCompress(json);

      await writeToR2(env.DATA_BUCKET, fetcher.r2Key, compressed, {
        lastUpdated: new Date().toISOString(),
        featureCount,
        source: fetcher.source,
      });

      console.log(`${fetcher.name}: wrote ${featureCount} features to R2 (${compressed.byteLength} bytes gzipped)`);
    } catch (error) {
      console.error(`Fetcher ${fetcher.name} failed:`, error);
      // Continue with other fetchers — don't let one failure stop the rest
    }
  }
}

export default {
  fetch: handleFetchRequest,
  scheduled: handleScheduled,
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run tests/index.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run all tests**

Run: `cd worker && npx vitest run`
Expected: All tests PASS across all test files.

- [ ] **Step 6: Commit**

```bash
git add worker/src/index.ts worker/tests/index.test.ts
git commit -m "feat: add Worker entry point — HTTP handler + cron scheduled handler"
```

---

## Task 11: Frontend Integration — Update `cameraDataService.ts`

**Files:**
- Modify: `src/services/cameraDataService.ts:64,76-107`

- [ ] **Step 1: Update fetch URL and data parsing**

In `src/services/cameraDataService.ts`, change line 64:

```typescript
// OLD:
const response = await fetch('/cameras-us.json', {

// NEW:
const dataApiUrl = import.meta.env.VITE_DATA_API_URL || '';
const response = await fetch(`${dataApiUrl}/cameras.geojson.gz`, {
```

- [ ] **Step 2: Update validation and mapping (lines 76-107)**

Replace the validation and mapping block:

```typescript
// OLD (lines 76-107):
const data = await response.json();
if (!Array.isArray(data)) {
  throw new Error('Invalid camera data format');
}
if (data.length === 0) {
  throw new Error('Camera data file is empty');
}
const cameras: ALPRCamera[] = new Array(data.length);
for (let i = 0; i < data.length; i++) {
  const cam = data[i];
  cameras[i] = {
    osmId: cam.osmId,
    osmType: cam.osmType || 'node',
    lat: cam.lat,
    lon: cam.lon,
    ...
  };
}

// NEW:
const data = await response.json();

// Support both GeoJSON FeatureCollection (from Worker) and legacy flat array
let cameras: ALPRCamera[];

if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
  // GeoJSON format from data Worker
  if (data.features.length === 0) {
    throw new Error('Camera data file is empty');
  }
  cameras = new Array(data.features.length);
  for (let i = 0; i < data.features.length; i++) {
    const f = data.features[i];
    const p = f.properties;
    cameras[i] = {
      osmId: p.osmId,
      osmType: p.osmType || 'node',
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      operator: p.operator,
      brand: p.brand,
      direction: p.direction,
      directionCardinal: p.directionCardinal,
      surveillanceZone: p.surveillanceZone,
      mountType: p.mountType,
      ref: p.ref,
      startDate: p.startDate,
      osmTimestamp: p.osmTimestamp,
      osmVersion: p.osmVersion,
    };
  }
} else if (Array.isArray(data)) {
  // Legacy flat array format (for backwards compatibility during migration)
  if (data.length === 0) {
    throw new Error('Camera data file is empty');
  }
  cameras = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const cam = data[i];
    cameras[i] = {
      osmId: cam.osmId,
      osmType: cam.osmType || 'node',
      lat: cam.lat,
      lon: cam.lon,
      operator: cam.operator,
      brand: cam.brand,
      direction: cam.direction,
      directionCardinal: cam.directionCardinal,
      surveillanceZone: cam.surveillanceZone,
      mountType: cam.mountType,
      ref: cam.ref,
      startDate: cam.startDate,
      osmTimestamp: cam.osmTimestamp,
      osmVersion: cam.osmVersion,
    };
  }
} else {
  throw new Error('Invalid camera data format');
}
```

- [ ] **Step 3: Add environment variable files**

Create/update `.env.development` (points to local `wrangler dev` instance):

```
VITE_DATA_API_URL=http://localhost:8787
```

Add to `.env.production` (or wherever production env vars are set):

```
VITE_DATA_API_URL=https://data.dontgetflocked.com
```

- [ ] **Step 4: Verify frontend builds**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/cameraDataService.ts .env.development .env.production
git commit -m "feat: update cameraDataService to fetch GeoJSON from data Worker"
```

---

## Task 12: Bootstrap & Deploy

This task is manual — not automated tests.

- [ ] **Step 1: Create R2 bucket**

Run: `cd worker && npx wrangler r2 bucket create flockhopper-data`
Expected: Bucket created successfully.

- [ ] **Step 2: Deploy the Worker**

Run: `cd worker && npx wrangler deploy`
Expected: Worker deployed to `flockhopper-data.<your-account>.workers.dev`.

- [ ] **Step 3: Configure custom domain**

In Cloudflare dashboard:
1. Go to Workers & Pages → flockhopper-data → Settings → Domains & Routes
2. Add `data.dontgetflocked.com`
3. Cloudflare auto-creates the DNS record

- [ ] **Step 4: Seed R2 by triggering cron manually**

Run: `cd worker && npx wrangler deploy && curl -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/flockhopper-data/schedules" -H "Authorization: Bearer <API_TOKEN>"`

Alternatively, trigger from Cloudflare dashboard: Workers → flockhopper-data → Triggers → Run Now.

- [ ] **Step 5: Verify the Worker serves data**

Run: `curl -v https://data.dontgetflocked.com/cameras.geojson.gz --compressed`
Expected: Returns valid GeoJSON with 62K+ features, correct headers.

Run: `curl https://data.dontgetflocked.com/`
Expected: Returns JSON index with cameras dataset and lastUpdated timestamp.

- [ ] **Step 6: Deploy frontend with Worker URL**

Deploy the frontend (via Cloudflare Pages or your normal deploy process) with the updated `cameraDataService.ts`.

- [ ] **Step 7: Verify end-to-end**

Load `https://dontgetflocked.com` in browser, open DevTools Network tab:
- Verify camera data loads from `data.dontgetflocked.com/cameras.geojson.gz`
- Verify CORS headers are present
- Verify cameras display on the map

---

## Task 13: Cleanup — Remove Old Pipeline

Only after Task 12 is verified working in production.

- [ ] **Step 1: Remove old files**

Delete:
- `public/cameras-us.json`
- `.github/workflows/update-cameras.yml`
- `scripts/update-cameras.sh`

- [ ] **Step 2: Verify build still works**

Run: `npm run build`
Expected: Build succeeds. No references to removed files.

- [ ] **Step 3: Commit**

```bash
git rm public/cameras-us.json .github/workflows/update-cameras.yml scripts/update-cameras.sh
git commit -m "chore: remove old GitHub Actions camera pipeline (replaced by Cloudflare Worker)"
```

---

## Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Scaffold Worker project | — |
| 2 | Shared types | 1 |
| 3 | CORS utility | 2 |
| 4 | Gzip utility | 2 |
| 5 | R2 helpers | 2 |
| 6 | GeoJSON builder | 2 |
| 7 | Overpass client | 2 |
| 8 | Camera fetcher | 6, 7 |
| 9 | Fetcher registry | 8 |
| 10 | Worker entry point | 3, 4, 5, 9 |
| 11 | Frontend integration | 10 |
| 12 | Bootstrap & deploy | 10, 11 |
| 13 | Cleanup old pipeline | 12 (verified in prod) |
