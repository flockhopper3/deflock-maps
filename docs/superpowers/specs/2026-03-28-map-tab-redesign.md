# Map Tab Redesign — DeFlock Maps

## Overview

Add a new "Map" tab as the default landing experience for DeFlock Maps. This replaces Route as the first tab, providing an interactive camera map with filtering, visualization toggles, and boundary overlays. The existing Explore tab is renamed to "Timeline."

## Tab Structure

**Order:** Map | Route | Timeline | Analysis | Network

**URL routing:**

| URL | Mode |
|-----|------|
| `/`, `/map` | Map (new default) |
| `/route` | Route |
| `/timeline` | Timeline (internally `explore`) |
| `/analysis` | Density |
| `/network` | Network |

**AppMode type:** `'map' | 'route' | 'explore' | 'density' | 'network'`

The internal mode name `'explore'` is preserved for Timeline to minimize churn in stores and layer components that already reference it. Only the tab label changes to "Timeline."

Default mode changes from `'route'` to `'map'`.

## Shared Camera Layers Extraction

### New Component: `src/components/map/layers/CameraMarkerLayers.tsx`

Extracted from `MapLibreContainer.tsx`. Renders:
- Clustered camera markers (clusters, cluster-count, unclustered-point, unclustered-glow)
- Direction cones (direction-cones, direction-cones-outline)
- Pulse ring animations

Consumes `filteredCameras` from `cameraStore` so filters automatically affect rendering. Filters persist across mode switches — if a user filters to "Flock Safety" cameras in Map mode and switches to Route, they still see only Flock Safety cameras. The filter UI only appears in the Map panel, but the clear-all button is accessible from there.

**Used by:**
- **Map mode** (when visualization is set to "clusters")
- **Route mode** (always, same as today — route lines render on top)

**What stays in MapLibreContainer:**
- Mode switching logic (which layer components to mount)
- Route-specific layers (route lines, origin/destination markers)
- `interactiveLayerIds` array based on active mode

This is a lift-and-shift of ~150 lines of existing layer code. No behavior changes for Route mode.

## Map Mode Panel (`MapPanel.tsx`)

Desktop: left sidebar panel (consistent with Explore/Timeline panel positioning).
Mobile: bottom sheet with peek showing visualization toggle and active filter count.

### Sections (top to bottom):

#### Visualization Toggle
- Segmented control: "Clusters" | "Heatmap"
- Mutually exclusive — one or the other, never both
- When heatmap is active, show heatmap controls (intensity, radius, opacity, color scheme) reused from existing `HeatmapControls` component

#### Filters
- **Brand** — searchable multi-select dropdown. Powered by `availableBrands` from `cameraStore`. Show top brands by camera count.
- **Operator** — searchable multi-select dropdown. Powered by `availableOperators` from `cameraStore`. Show note about coverage (~28% of cameras have operator data).
- **Surveillance Zone** — checkbox group: traffic, town, parking, other
- **Mount Type** — checkbox group: pole, wall, other
- **Active filter chips** at top of section with clear-all button
- All filters use existing `setFilters()` / `filteredCameras` plumbing in `cameraStore`

Note: `CameraFilters` type in `cameraStore` currently supports `operators` and `brands`. Needs extension to support `surveillanceZones` and `mountTypes` arrays with the same filter pattern.

#### Overlay Layers
Toggle switches for:
- State boundaries (outline only, from existing `states-metrics.geojson`)
- County boundaries (outline only, from existing `counties-metrics.geojson`)
- Police stations / LEAs (circle markers, from future `police-stations.geojson`)

Each overlay is a separate MapLibre source + layer with visibility toggled independently.

#### Legend
Dynamic based on active visualization:
- Clusters: camera marker color key
- Heatmap: color ramp

## State Management

### New Store: `src/store/mapModeStore.ts`

```typescript
interface MapModeState {
  visualization: 'clusters' | 'heatmap';
  overlays: {
    stateBoundaries: boolean;
    countyBoundaries: boolean;
    policeStations: boolean;
  };
}
```

Defaults: visualization `'clusters'`, all overlays `false`.

Actions: `setVisualization()`, `toggleOverlay()`.

### Existing Store Changes

**`appModeStore.ts`:**
- Add `'map'` to `AppMode` union type
- Change default from `'route'` to `'map'`

**`cameraStore.ts`:**
- Extend `CameraFilters` type to include `surveillanceZones: string[]` and `mountTypes: string[]`
- Extend `setFilters()` logic to filter on these new fields
- No other changes — existing brand/operator filter infrastructure is already built

## MapLibreContainer Integration

### Layer rendering by mode:

| Mode | Layers |
|------|--------|
| `map` + clusters | `CameraMarkerLayers` + `BoundaryOverlayLayers` |
| `map` + heatmap | `HeatmapLayers` + `BoundaryOverlayLayers` |
| `route` | `CameraMarkerLayers` + route lines/markers |
| `explore` (Timeline) | `HeatmapLayers` or `DotDensityLayers` + timeline bar |
| `density` | `DensityLayers` |
| `network` | `NetworkLayers` |

### New Component: `src/components/map/layers/BoundaryOverlayLayers.tsx`

- Renders state/county boundaries as `line` layers (outlines only, no fills)
- Sources: existing `states-metrics.geojson` and `counties-metrics.geojson`
- Police stations: `circle` layer from future `police-stations.geojson`
- Only mounts when `appMode === 'map'`
- Visibility driven by `mapModeStore.overlays`

### Interactive layer IDs:

| Mode | Interactive Layers |
|------|-------------------|
| `map` + clusters | `['clusters', 'unclustered-point']` |
| `map` + heatmap | `[]` |
| `route` | `['clusters', 'unclustered-point']` |
| `explore` | `[]` |
| `density` | `['density-states-fill', 'density-counties-fill', ...]` |
| `network` | `[]` |

### Camera click popup
Same popup as Route mode — shows camera details (brand, operator, direction, etc). Already exists, fires in Map mode when clusters visualization is active.

## Files Changed / Created

### New files:
- `src/components/map/layers/CameraMarkerLayers.tsx` — extracted shared camera layer component
- `src/components/map/layers/BoundaryOverlayLayers.tsx` — boundary overlay layers
- `src/components/panels/MapPanel.tsx` — Map mode sidebar panel
- `src/store/mapModeStore.ts` — Map mode state

### Modified files:
- `src/store/appModeStore.ts` — add `'map'` mode, change default
- `src/store/cameraStore.ts` — extend `CameraFilters` with surveillanceZone/mountType
- `src/types/camera.ts` — extend `CameraFilters` interface
- `src/components/map/MapLibreContainer.tsx` — extract camera layers, add Map mode rendering logic
- `src/pages/MapPage.tsx` — update tab labels/order, URL routing, panel rendering

## Data Dependencies

**Already available:**
- `states-metrics.geojson` — state boundaries with polygons
- `counties-metrics.geojson` — county boundaries with polygons
- Camera data with brand, operator, surveillanceZone, mountType fields

**Needs to be sourced:**
- `police-stations.geojson` — coordinates and metadata for police stations/LEAs. The overlay toggle will be present in the UI but disabled/hidden until this data is added to `/public/`.
