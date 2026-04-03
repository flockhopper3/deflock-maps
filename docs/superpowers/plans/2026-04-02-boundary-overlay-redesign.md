# Boundary Overlay Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded state/county boundary overlay system with a generic, config-driven approach that loads state, county, and municipal boundaries on demand from R2 storage.

**Architecture:** New `boundaryDataService.ts` fetches GeoJSON from `data.dontgetflocked.com/boundaries/`. Store gains `boundaryLoading` and `boundaryData` state. `BoundaryOverlayLayers.tsx` is rewritten to iterate over a config array, rendering a `<Source>`/`<Layer>` pair for each loaded boundary level. Police stations layer and toggle removed.

**Tech Stack:** React 18, TypeScript, Zustand, MapLibre GL (via react-map-gl/maplibre), Vite

**Spec:** `docs/superpowers/specs/2026-04-02-boundary-overlay-redesign.md`

---

### Task 1: Create `boundaryDataService.ts`

**Files:**
- Create: `src/services/boundaryDataService.ts`

- [ ] **Step 1: Create the boundary data service**

Create `src/services/boundaryDataService.ts`:

```typescript
/**
 * Boundary GeoJSON loader — fetches from R2 storage with caching and retry.
 * Follows the same singleton/deduplication pattern as densityDataService.ts.
 */

export type BoundaryLevel = 'state' | 'county' | 'municipal';

const BASE_URL = 'https://data.dontgetflocked.com/boundaries';

const BOUNDARY_URLS: Record<BoundaryLevel, string> = {
  state: `${BASE_URL}/states.geojson`,
  county: `${BASE_URL}/counties.geojson`,
  municipal: `${BASE_URL}/places.geojson`,
};

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Module-scope caches
const dataCache: Record<BoundaryLevel, GeoJSON.FeatureCollection | null> = {
  state: null,
  county: null,
  municipal: null,
};

const promiseCache: Record<BoundaryLevel, Promise<GeoJSON.FeatureCollection> | null> = {
  state: null,
  county: null,
  municipal: null,
};

export async function loadBoundaryData(level: BoundaryLevel): Promise<GeoJSON.FeatureCollection> {
  if (dataCache[level]) return dataCache[level];
  if (promiseCache[level]) return promiseCache[level];

  const url = BOUNDARY_URLS[level];

  const promise = (async () => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, { cache: 'default' });
        if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);

        const data = (await response.json()) as GeoJSON.FeatureCollection;

        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) {
          throw new Error(`Invalid GeoJSON from ${url}`);
        }

        if (import.meta.env.DEV) {
          console.log(`[BoundaryService] Loaded ${level}: ${data.features.length} features`);
        }

        dataCache[level] = data;
        promiseCache[level] = null;
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (import.meta.env.DEV) {
          console.warn(`[BoundaryService] ${level} attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
        }
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    }

    promiseCache[level] = null;
    throw lastError || new Error(`Failed to load ${level} boundary data`);
  })();

  promiseCache[level] = promise;
  return promise;
}

export function clearBoundaryCache(): void {
  for (const level of Object.keys(dataCache) as BoundaryLevel[]) {
    dataCache[level] = null;
    promiseCache[level] = null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd deflock-maps && npx tsc --noEmit`
Expected: No errors related to `boundaryDataService.ts`

- [ ] **Step 3: Commit**

```bash
git add src/services/boundaryDataService.ts
git commit -m "feat: add boundaryDataService for R2 boundary loading"
```

---

### Task 2: Update `mapModeStore.ts`

**Files:**
- Modify: `src/store/mapModeStore.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Update OverlayState and add boundary loading/data state**

In `src/store/mapModeStore.ts`, replace the `OverlayState` interface and update the store:

Replace:
```typescript
export interface OverlayState {
  stateBoundaries: boolean;
  countyBoundaries: boolean;
  policeStations: boolean;
}
```

With:
```typescript
export interface OverlayState {
  stateBoundaries: boolean;
  countyBoundaries: boolean;
  municipalBoundaries: boolean;
}

export type BoundaryLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface BoundaryLoadingState {
  state: BoundaryLoadStatus;
  county: BoundaryLoadStatus;
  municipal: BoundaryLoadStatus;
}
```

Add new imports at the top of the file:
```typescript
import { loadBoundaryData, type BoundaryLevel } from '../services/boundaryDataService';
```

Add to the `MapModeState` interface:
```typescript
  boundaryLoading: BoundaryLoadingState;
  boundaryData: Record<BoundaryLevel, GeoJSON.FeatureCollection | null>;
  fetchBoundary: (level: BoundaryLevel) => Promise<void>;
```

Update the store's initial state — replace `policeStations: false` with `municipalBoundaries: false`, and add:
```typescript
  boundaryLoading: {
    state: 'idle',
    county: 'idle',
    municipal: 'idle',
  },
  boundaryData: {
    state: null,
    county: null,
    municipal: null,
  },
```

Add the `fetchBoundary` action:
```typescript
  fetchBoundary: async (level) => {
    const current = get().boundaryLoading[level];
    if (current === 'loading' || current === 'loaded') return;

    set((s) => ({
      boundaryLoading: { ...s.boundaryLoading, [level]: 'loading' },
    }));

    try {
      const data = await loadBoundaryData(level);
      set((s) => ({
        boundaryLoading: { ...s.boundaryLoading, [level]: 'loaded' },
        boundaryData: { ...s.boundaryData, [level]: data },
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`[MapModeStore] Failed to fetch ${level} boundaries:`, error);
      }
      set((s) => ({
        boundaryLoading: { ...s.boundaryLoading, [level]: 'error' },
      }));
    }
  },
```

Note: The store creator must use `create<MapModeState>()((set, get) => ({` instead of `create<MapModeState>((set) => ({` to access `get` for the `fetchBoundary` action.

- [ ] **Step 2: Update store index exports**

In `src/store/index.ts`, update the type export on line 11:

Replace:
```typescript
export type { MapVisualization, OverlayState } from './mapModeStore';
```

With:
```typescript
export type { MapVisualization, OverlayState, BoundaryLoadingState, BoundaryLoadStatus } from './mapModeStore';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd deflock-maps && npx tsc --noEmit`
Expected: No errors. There will be unused-variable warnings in `MapPanel.tsx` and `BoundaryOverlayLayers.tsx` for `policeStations` — those get fixed in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/store/mapModeStore.ts src/store/index.ts
git commit -m "feat: add boundary loading state and fetchBoundary action to mapModeStore"
```

---

### Task 3: Rewrite `BoundaryOverlayLayers.tsx`

**Files:**
- Modify: `src/components/map/layers/BoundaryOverlayLayers.tsx`

- [ ] **Step 1: Rewrite BoundaryOverlayLayers with config-driven approach**

Replace the entire contents of `src/components/map/layers/BoundaryOverlayLayers.tsx`:

```typescript
import { Source, Layer } from 'react-map-gl/maplibre';
import { useMapModeStore } from '../../../store';
import type { OverlayState } from '../../../store/mapModeStore';
import type { BoundaryLevel } from '../../../services/boundaryDataService';

interface BoundaryConfig {
  id: BoundaryLevel;
  storeKey: keyof OverlayState;
  color: string;
  width: number;
  opacity: number;
  minzoom?: number;
}

const BOUNDARY_CONFIGS: BoundaryConfig[] = [
  { id: 'state', storeKey: 'stateBoundaries', color: '#6b7280', width: 2.5, opacity: 0.7 },
  { id: 'county', storeKey: 'countyBoundaries', color: '#4b5563', width: 1.5, opacity: 0.6, minzoom: 6 },
  { id: 'municipal', storeKey: 'municipalBoundaries', color: '#9ca3af', width: 1.2, opacity: 0.5, minzoom: 8 },
];

export function BoundaryOverlayLayers() {
  const overlays = useMapModeStore((s) => s.overlays);
  const boundaryData = useMapModeStore((s) => s.boundaryData);

  return (
    <>
      {BOUNDARY_CONFIGS.map((config) => {
        const isOn = overlays[config.storeKey];
        const data = boundaryData[config.id];

        if (!isOn || !data) return null;

        return (
          <Source key={config.id} id={`${config.id}-boundaries`} type="geojson" data={data}>
            <Layer
              id={`${config.id}-boundaries-line`}
              type="line"
              source={`${config.id}-boundaries`}
              minzoom={config.minzoom}
              paint={{
                'line-color': config.color,
                'line-width': config.width,
                'line-opacity': config.opacity,
              }}
            />
          </Source>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd deflock-maps && npx tsc --noEmit`
Expected: No errors in `BoundaryOverlayLayers.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/map/layers/BoundaryOverlayLayers.tsx
git commit -m "feat: rewrite BoundaryOverlayLayers with config-driven rendering"
```

---

### Task 4: Update `MapPanel.tsx` overlay toggles

**Files:**
- Modify: `src/components/panels/MapPanel.tsx`

- [ ] **Step 1: Add loading indicator support to OverlayToggle**

In `src/components/panels/MapPanel.tsx`, find the `OverlayToggle` component (line ~140). Replace it with:

```typescript
function OverlayToggle({
  label,
  enabled,
  onToggle,
  loading,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${label}`}
      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors hover:bg-dark-800/60"
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs ${enabled ? 'text-dark-200' : 'text-dark-400'}`}>
          {label}
        </span>
        {loading && (
          <div className="w-3 h-3 border border-dark-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      <div
        className={`w-8 h-[18px] rounded-full relative transition-colors duration-200 ${
          enabled ? 'bg-accent' : 'bg-dark-700'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? 'translate-x-[16px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Update the overlay toggles section**

In `MapPanel.tsx`, find the Overlays section (line ~619). The component needs to read `boundaryLoading` and `fetchBoundary` from the store. Add to the destructured store values near the top of the `MapPanel` component:

```typescript
const boundaryLoading = useMapModeStore((s) => s.boundaryLoading);
const fetchBoundary = useMapModeStore((s) => s.fetchBoundary);
```

Create a helper that toggles the overlay and triggers the fetch:

```typescript
const handleBoundaryToggle = (overlayKey: keyof OverlayState, level: BoundaryLevel) => {
  toggleOverlay(overlayKey);
  // If turning on and not yet loaded, trigger fetch
  if (!overlays[overlayKey]) {
    fetchBoundary(level);
  }
};
```

Add the import at the top of the file:
```typescript
import type { OverlayState } from '../../store/mapModeStore';
import type { BoundaryLevel } from '../../services/boundaryDataService';
```

Replace the overlay toggles (lines ~621-638) with:

```tsx
<div className="space-y-0.5">
  <OverlayToggle
    label="State Boundaries"
    enabled={overlays.stateBoundaries}
    onToggle={() => handleBoundaryToggle('stateBoundaries', 'state')}
    loading={boundaryLoading.state === 'loading'}
  />
  <OverlayToggle
    label="County Boundaries"
    enabled={overlays.countyBoundaries}
    onToggle={() => handleBoundaryToggle('countyBoundaries', 'county')}
    loading={boundaryLoading.county === 'loading'}
  />
  <OverlayToggle
    label="Municipal Boundaries"
    enabled={overlays.municipalBoundaries}
    onToggle={() => handleBoundaryToggle('municipalBoundaries', 'municipal')}
    loading={boundaryLoading.municipal === 'loading'}
  />
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd deflock-maps && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/MapPanel.tsx
git commit -m "feat: update overlay toggles with municipal + loading indicators"
```

---

### Task 5: Remove baked-in boundary GeoJSON files

**Files:**
- Delete: `public/states-metrics.geojson`
- Delete: `public/geo/states-metrics.geojson`

Note: `public/counties-metrics.geojson` and `public/geo/counties-metrics.geojson` are **kept** because the density mode (`densityDataService.ts`) still references them. Those can be migrated to R2 separately.

- [ ] **Step 1: Verify density mode still references local files**

Run: `cd deflock-maps && grep -r "states-metrics" src/ --include="*.ts" --include="*.tsx"`

Expected: Only `densityDataService.ts` should reference `/geo/states-metrics.geojson`. The old `BoundaryOverlayLayers.tsx` reference should already be gone from Task 3.

If `densityDataService.ts` still loads states from `/geo/states-metrics.geojson`, the density mode needs that file. In that case, only delete `public/states-metrics.geojson` (the root copy), keep `public/geo/states-metrics.geojson`.

- [ ] **Step 2: Delete the redundant root-level file**

```bash
cd deflock-maps && rm -f public/states-metrics.geojson
```

Only delete `public/geo/states-metrics.geojson` if the grep in Step 1 confirmed nothing in `src/` references it. If `densityDataService.ts` references `/geo/states-metrics.geojson`, keep it.

- [ ] **Step 3: Verify the build still succeeds**

Run: `cd deflock-maps && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove baked-in state boundary GeoJSON (now loaded from R2)"
```

---

### Task 6: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `cd deflock-maps && npm run dev`

- [ ] **Step 2: Verify state boundary toggle**

1. Open `http://localhost:3000`
2. Open the Map panel on the left
3. Scroll to Layers > Overlays
4. Toggle "State Boundaries" on
5. Verify: a loading spinner briefly appears next to the label, then state boundary outlines render on the map with slightly thicker lines than before
6. Toggle off — boundaries disappear

- [ ] **Step 3: Verify county boundary toggle**

1. Zoom to z6+
2. Toggle "County Boundaries" on
3. Verify: loading spinner, then county outlines appear
4. Toggle off — boundaries disappear

- [ ] **Step 4: Verify municipal boundary toggle**

1. Zoom to z9+
2. Toggle "Municipal Boundaries" on
3. Verify: loading spinner (may take a moment for the larger file), then municipal outlines appear
4. Toggle off — boundaries disappear

Note: Municipal boundaries require `places.geojson` to exist on `data.dontgetflocked.com`. If the R2 bucket isn't set up yet, this will fail with a console error and the toggle will show a loading state then stop — which is expected behavior.

- [ ] **Step 5: Verify density mode still works**

1. Switch to Analysis/Density mode
2. Verify state and county choropleths still load and render correctly (they use `densityDataService.ts` which loads from local `/geo/` files)

- [ ] **Step 6: Verify police stations toggle is gone**

1. Check the Overlays section — should show exactly 3 toggles: State, County, Municipal
2. No "Police Stations" toggle visible

- [ ] **Step 7: Commit final state**

If everything works:
```bash
git add -A
git commit -m "feat: boundary overlay redesign complete — R2 loading + municipal support"
```
