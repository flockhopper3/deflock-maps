# Boundary Overlay Redesign

## Summary

Redesign the map boundary overlay system to support three boundary levels (state, county, municipal), load all boundary data from R2 storage at `data.dontgetflocked.com`, and use a generic config-driven rendering approach that makes adding future boundary types trivial.

**Scope**: Boundary display only. No labels, no click-to-identify, no metrics overlays. Those are roadmap items.

## Data

Three geometry-only GeoJSON files hosted on R2:

| File | URL | Approx Size |
|---|---|---|
| `states.geojson` | `https://data.dontgetflocked.com/boundaries/states.geojson` | ~200KB |
| `counties.geojson` | `https://data.dontgetflocked.com/boundaries/counties.geojson` | ~2MB |
| `places.geojson` | `https://data.dontgetflocked.com/boundaries/places.geojson` | ~15-30MB |

Files contain geometry and basic identifying properties (GEOID, name, state code) but no surveillance metrics. Metrics stay in the existing `*-metrics.geojson` files used by density mode.

### Source Data

Boundary geometry sourced from US Census Bureau TIGER/Line shapefiles:
- States and counties: existing data, stripped of metrics
- Municipal (incorporated places): Census "Incorporated Places" dataset, simplified for web use

## Service: `boundaryDataService.ts`

New service at `src/services/boundaryDataService.ts`. Replaces the boundary-loading role for overlays (density mode keeps its own `densityDataService.ts` unchanged).

**Interface:**

```typescript
type BoundaryLevel = 'state' | 'county' | 'municipal';

function loadBoundaryData(level: BoundaryLevel): Promise<GeoJSON.FeatureCollection>;
```

**Behavior:**
- Fetches from `https://data.dontgetflocked.com/boundaries/{file}` on first call
- Module-scope cache per level with promise deduplication (same pattern as `densityDataService.ts`)
- Retry with exponential backoff (3 attempts)
- Returns cached data on subsequent calls

**URL mapping:**

```typescript
const BOUNDARY_URLS: Record<BoundaryLevel, string> = {
  state: 'https://data.dontgetflocked.com/boundaries/states.geojson',
  county: 'https://data.dontgetflocked.com/boundaries/counties.geojson',
  municipal: 'https://data.dontgetflocked.com/boundaries/places.geojson',
};
```

## Store: `mapModeStore.ts`

### OverlayState

Replace `policeStations` with `municipalBoundaries`:

```typescript
export interface OverlayState {
  stateBoundaries: boolean;
  countyBoundaries: boolean;
  municipalBoundaries: boolean;
}
```

### BoundaryLoadingState

New state to track fetch status and hold loaded GeoJSON per level:

```typescript
export interface BoundaryLoadingState {
  state: 'idle' | 'loading' | 'loaded' | 'error';
  county: 'idle' | 'loading' | 'loaded' | 'error';
  municipal: 'idle' | 'loading' | 'loaded' | 'error';
}

// GeoJSON data stored in the store so components can read it synchronously for rendering
boundaryData: {
  state: GeoJSON.FeatureCollection | null;
  county: GeoJSON.FeatureCollection | null;
  municipal: GeoJSON.FeatureCollection | null;
}
```

### toggleOverlay behavior

When toggling a boundary on:
1. Set loading state to `'loading'`
2. Call `loadBoundaryData(level)` from the service
3. On success: set loading state to `'loaded'`, store the GeoJSON in `boundaryData[level]`
4. On error: set loading state to `'error'`, flip the toggle back off

The rendering component reads `boundaryData` from the store synchronously — no async in the render path.

## Rendering: `BoundaryOverlayLayers.tsx`

Replace the current hardcoded Source/Layer pairs with a config-driven approach.

### Boundary config

```typescript
const BOUNDARY_CONFIGS = [
  { id: 'state', storeKey: 'stateBoundaries', color: '#6b7280', width: 2.5, opacity: 0.7 },
  { id: 'county', storeKey: 'countyBoundaries', color: '#4b5563', width: 1.5, opacity: 0.6, minzoom: 6 },
  { id: 'municipal', storeKey: 'municipalBoundaries', color: '#9ca3af', width: 1.2, opacity: 0.5, minzoom: 8 },
] as const;
```

### BoundaryLayer component

For each config entry:
- Reads toggle + loading state from store
- If toggled on AND data loaded: renders `<Source>` with cached GeoJSON + `<Layer>` with line styling
- If toggled on AND loading: renders nothing (UI shows spinner on the toggle)
- If toggled off: renders nothing

### Police stations layer

Removed entirely from `BoundaryOverlayLayers.tsx`. Can be re-added as a separate point layer component when data is available.

## UI: `MapPanel.tsx`

### Overlays section

Three toggles:

```
Overlays
  State Boundaries      [toggle]
  County Boundaries     [toggle]
  Municipal Boundaries  [toggle]
```

- Each toggle shows a small loading spinner during first fetch
- On fetch error, toggle flips back off with brief inline error indicator
- Police stations toggle removed

### No other UI changes

No labels, no click behavior, no info panels, no stats. Display-only for this iteration.

## Files Changed

| File | Change |
|---|---|
| `src/services/boundaryDataService.ts` | **New** — generic R2 boundary loader |
| `src/store/mapModeStore.ts` | Update `OverlayState`, add `BoundaryLoadingState` + fetch logic |
| `src/components/map/layers/BoundaryOverlayLayers.tsx` | Rewrite — config-driven generic boundary rendering |
| `src/components/panels/MapPanel.tsx` | Update overlay toggles (add municipal, remove police) |
| `public/states-metrics.geojson` | Remove (moved to R2) |
| `public/counties-metrics.geojson` | Keep (still used by density mode) |
| `public/geo/states-metrics.geojson` | Remove (moved to R2) |
| `public/geo/counties-metrics.geojson` | Keep (still used by density mode) |

## Out of Scope (Roadmap)

- Labels on boundaries
- Click-to-identify (click empty space → show boundary hierarchy)
- Camera count per boundary (client-side point-in-polygon)
- Metrics/density integration with boundary overlays
- Vector tile migration for boundaries
