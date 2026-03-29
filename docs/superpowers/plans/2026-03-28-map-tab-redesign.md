# Map Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Map" tab as the default landing experience with camera filtering, visualization toggles, and boundary overlays; rename Explore to Timeline.

**Architecture:** Bottom-up approach — types first, then stores, then extracted/new layer components, then the Map panel UI, then MapLibreContainer integration, and finally MapPage tab/routing updates. Each task produces a buildable, committable unit.

**Tech Stack:** React 18, TypeScript, Zustand, MapLibre GL (via react-map-gl/maplibre), Tailwind CSS

---

## File Structure

### New files:
| File | Responsibility |
|------|---------------|
| `src/store/mapModeStore.ts` | Map mode visualization + overlay toggle state |
| `src/components/map/layers/CameraMarkerLayers.tsx` | Shared camera markers, clusters, cones, pulse animation |
| `src/components/map/layers/BoundaryOverlayLayers.tsx` | State/county outline overlays, police station markers |
| `src/components/panels/MapPanel.tsx` | Map mode sidebar (filters, viz toggle, overlay toggles) |

### Modified files:
| File | Changes |
|------|---------|
| `src/types/camera.ts` | Extend `CameraFilters` with `surveillanceZones`, `mountTypes` |
| `src/store/appModeStore.ts` | Add `'map'` to `AppMode`, change default to `'map'` |
| `src/store/cameraStore.ts` | Add surveillanceZone/mountType filter logic |
| `src/store/index.ts` | Re-export `useMapModeStore` |
| `src/components/map/MapLibreContainer.tsx` | Extract camera layers, add map mode rendering |
| `src/pages/MapPage.tsx` | 5 tabs, new URL routing, MapPanel rendering |
| `src/components/panels/MobileTabDrawer.tsx` | Add Map tab, rename Explore to Timeline |

---

### Task 1: Extend CameraFilters type

**Files:**
- Modify: `src/types/camera.ts:26-31`

- [ ] **Step 1: Add surveillanceZones and mountTypes to CameraFilters**

In `src/types/camera.ts`, replace the `CameraFilters` interface:

```typescript
export interface CameraFilters {
  operators: string[];
  brands: string[];
  surveillanceZones: string[];
  mountTypes: string[];
  showAll: boolean;
  timelineDate?: string;  // YYYY-MM format, filters cameras by osmTimestamp
}
```

- [ ] **Step 2: Update cameraStore default filters to include new fields**

In `src/store/cameraStore.ts`, update the initial `filters` value (around line 81):

```typescript
  filters: {
    operators: [],
    brands: [],
    surveillanceZones: [],
    mountTypes: [],
    showAll: true,
  },
```

- [ ] **Step 3: Update clearFilters to include new fields**

In `src/store/cameraStore.ts`, update `clearFilters` (around line 266):

```typescript
  clearFilters: () => {
    const { cameras } = get();
    set({
      filters: {
        operators: [],
        brands: [],
        surveillanceZones: [],
        mountTypes: [],
        showAll: true,
        timelineDate: undefined,
      },
      filteredCameras: cameras,
    });
  },
```

- [ ] **Step 4: Add surveillanceZone and mountType filtering to setFilters**

In `src/store/cameraStore.ts`, inside the `setFilters` method (around line 251-257), add filtering after the brands filter block:

```typescript
    if (!updatedFilters.showAll) {
      if (updatedFilters.operators.length > 0) {
        filtered = filtered.filter(
          (c) => c.operator && updatedFilters.operators.includes(c.operator)
        );
      }

      if (updatedFilters.brands.length > 0) {
        filtered = filtered.filter(
          (c) => c.brand && updatedFilters.brands.includes(c.brand)
        );
      }

      if (updatedFilters.surveillanceZones.length > 0) {
        filtered = filtered.filter(
          (c) => c.surveillanceZone && updatedFilters.surveillanceZones.includes(c.surveillanceZone)
        );
      }

      if (updatedFilters.mountTypes.length > 0) {
        filtered = filtered.filter(
          (c) => c.mountType && updatedFilters.mountTypes.includes(c.mountType)
        );
      }
    }
```

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: No TypeScript errors, clean build

- [ ] **Step 6: Commit**

```bash
git add src/types/camera.ts src/store/cameraStore.ts
git commit -m "feat: extend CameraFilters with surveillanceZone and mountType filtering"
```

---

### Task 2: Add 'map' mode to AppMode and create mapModeStore

**Files:**
- Modify: `src/store/appModeStore.ts:3,102`
- Create: `src/store/mapModeStore.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Add 'map' to AppMode type and change default**

In `src/store/appModeStore.ts`, line 3, change:

```typescript
export type AppMode = 'map' | 'route' | 'explore' | 'density' | 'network';
```

In the same file, line 102, change the default:

```typescript
  appMode: 'map',
```

- [ ] **Step 2: Create mapModeStore.ts**

Create `src/store/mapModeStore.ts`:

```typescript
import { create } from 'zustand';

export type MapVisualization = 'clusters' | 'heatmap';

export interface OverlayState {
  stateBoundaries: boolean;
  countyBoundaries: boolean;
  policeStations: boolean;
}

interface MapModeState {
  visualization: MapVisualization;
  overlays: OverlayState;
  setVisualization: (viz: MapVisualization) => void;
  toggleOverlay: (key: keyof OverlayState) => void;
}

export const useMapModeStore = create<MapModeState>((set) => ({
  visualization: 'clusters',
  overlays: {
    stateBoundaries: false,
    countyBoundaries: false,
    policeStations: false,
  },
  setVisualization: (viz) => set({ visualization: viz }),
  toggleOverlay: (key) =>
    set((state) => ({
      overlays: { ...state.overlays, [key]: !state.overlays[key] },
    })),
}));
```

- [ ] **Step 3: Export from store index**

In `src/store/index.ts`, add after the existing exports:

```typescript
export { useMapModeStore } from './mapModeStore';
export type { MapVisualization, OverlayState } from './mapModeStore';
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: No TypeScript errors. Some components that exhaustively switch on `AppMode` may now have unhandled `'map'` case — if the build fails, check the error and add a `case 'map':` placeholder in any switch statement that errors. The main places to check are `MapPage.tsx` (URL sync effect) and `MobileTabDrawer.tsx` — these will be fully updated in later tasks, so for now just add a fallthrough to the default case if needed.

- [ ] **Step 5: Commit**

```bash
git add src/store/appModeStore.ts src/store/mapModeStore.ts src/store/index.ts
git commit -m "feat: add map mode to AppMode, create mapModeStore"
```

---

### Task 3: Extract CameraMarkerLayers component

**Files:**
- Create: `src/components/map/layers/CameraMarkerLayers.tsx`
- Modify: `src/components/map/MapLibreContainer.tsx`

This is the most critical task — extracting ~200 lines of camera marker rendering from MapLibreContainer into a reusable component.

- [ ] **Step 1: Create CameraMarkerLayers.tsx**

Create `src/components/map/layers/CameraMarkerLayers.tsx`:

```typescript
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';

import { useCameraStore, useMapStore } from '../../../store';
import { DIRECTIONAL_ZONE, CAMERA_DETECTION, ZONE_SAFETY_MULTIPLIERS } from '../../../services/routingConfig';
import type { ALPRCamera } from '../../../types';

// --- GeoJSON conversion (same as MapLibreContainer) ---

function camerasToGeoJSON(cameras: ALPRCamera[]): GeoJSON.FeatureCollection {
  const features = new Array(cameras.length);
  for (let i = 0; i < cameras.length; i++) {
    const camera = cameras[i];
    features[i] = {
      type: 'Feature' as const,
      id: camera.osmId,
      geometry: {
        type: 'Point' as const,
        coordinates: [camera.lon, camera.lat],
      },
      properties: {
        osmId: camera.osmId,
        osmType: camera.osmType,
        operator: camera.operator || '',
        brand: camera.brand || '',
        direction: camera.direction ?? null,
        directionCardinal: camera.directionCardinal || '',
        surveillanceZone: camera.surveillanceZone || '',
        mountType: camera.mountType || '',
        ref: camera.ref || '',
        startDate: camera.startDate || '',
        lat: camera.lat,
        lon: camera.lon,
        ts: camera.osmTimestamp ? new Date(camera.osmTimestamp).getTime() : 0,
      },
    };
  }
  return { type: 'FeatureCollection', features };
}

// --- Direction cone helper ---

function createDirectionCone(
  lon: number,
  lat: number,
  direction: number,
  lengthMeters: number = CAMERA_DETECTION.routeBufferMeters * ZONE_SAFETY_MULTIPLIERS.block,
  spreadDegrees: number = DIRECTIONAL_ZONE.cameraFovDegrees
): GeoJSON.Feature<GeoJSON.Polygon> {
  const earthRadius = 6371000;
  const latRad = (lat * Math.PI) / 180;
  const lengthDeg = (lengthMeters / earthRadius) * (180 / Math.PI);

  const points: [number, number][] = [[lon, lat]];

  const leftAngle = ((direction - spreadDegrees / 2) * Math.PI) / 180;
  const leftLon = lon + lengthDeg * Math.sin(leftAngle) / Math.cos(latRad);
  const leftLat = lat + lengthDeg * Math.cos(leftAngle);
  points.push([leftLon, leftLat]);

  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const angle = ((direction - spreadDegrees / 2 + (spreadDegrees * i) / steps) * Math.PI) / 180;
    const arcLon = lon + lengthDeg * Math.sin(angle) / Math.cos(latRad);
    const arcLat = lat + lengthDeg * Math.cos(angle);
    points.push([arcLon, arcLat]);
  }

  const rightAngle = ((direction + spreadDegrees / 2) * Math.PI) / 180;
  const rightLon = lon + lengthDeg * Math.sin(rightAngle) / Math.cos(latRad);
  const rightLat = lat + lengthDeg * Math.cos(rightAngle);
  points.push([rightLon, rightLat]);
  points.push([lon, lat]);

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [points] },
  };
}

// --- Layer style specs ---

const clusterLayer: maplibregl.LayerSpecification = {
  id: 'clusters',
  type: 'circle',
  source: 'cameras',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step', ['get', 'point_count'],
      '#ef4444', 5, '#dc2626', 20, '#b91c1c', 50, '#991b1b',
    ],
    'circle-radius': [
      'step', ['get', 'point_count'],
      14, 5, 16, 20, 20, 50, 26,
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fca5a5',
    'circle-stroke-opacity': 0.5,
  },
};

const clusterCountLayer: maplibregl.LayerSpecification = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'cameras',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
    'text-size': 13,
    'text-allow-overlap': true,
  },
  paint: { 'text-color': '#ffffff' },
};

const unclusteredPointLayer: maplibregl.LayerSpecification = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'cameras',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#dc2626',
    'circle-radius': 6,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fca5a5',
    'circle-opacity': 1,
  },
};

const unclusteredGlowLayer: maplibregl.LayerSpecification = {
  id: 'unclustered-glow',
  type: 'circle',
  source: 'cameras',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#ef4444',
    'circle-radius': 18,
    'circle-opacity': 0.3,
    'circle-blur': 0.6,
  },
};

const directionConeLayer: maplibregl.LayerSpecification = {
  id: 'direction-cones',
  type: 'fill',
  source: 'direction-cones',
  minzoom: 12,
  paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.35 },
};

const directionConeOutlineLayer: maplibregl.LayerSpecification = {
  id: 'direction-cones-outline',
  type: 'line',
  source: 'direction-cones',
  minzoom: 12,
  paint: { 'line-color': '#dc2626', 'line-width': 2, 'line-opacity': 0.7 },
};

// --- Component ---

interface CameraMarkerLayersProps {
  cameras: ALPRCamera[];
  visible: boolean;
  mapLoaded: boolean;
  mapRef: React.RefObject<{ getMap: () => maplibregl.Map } | null>;
}

export function CameraMarkerLayers({ cameras, visible, mapLoaded, mapRef }: CameraMarkerLayersProps) {
  const animationRef = useRef<number>();
  const pulseCleanupRef = useRef<(() => void) | null>(null);
  const showCameraLayer = useMapStore(s => s.showCameraLayer);

  const visibility: 'visible' | 'none' = visible ? 'visible' : 'none';

  // Camera GeoJSON
  const geojsonData = useMemo(() => {
    if (!showCameraLayer) return camerasToGeoJSON([]);
    return camerasToGeoJSON(cameras);
  }, [showCameraLayer, cameras]);

  // Direction cones GeoJSON
  const directionConesData = useMemo((): GeoJSON.FeatureCollection => {
    if (!showCameraLayer) {
      return { type: 'FeatureCollection', features: [] };
    }
    const camerasWithDirection = cameras.filter(
      (c) => c.direction !== undefined && c.direction !== null
    );
    return {
      type: 'FeatureCollection',
      features: camerasWithDirection.map((camera) => {
        const cone = createDirectionCone(camera.lon, camera.lat, camera.direction!);
        cone.properties = {
          ...cone.properties,
          ts: camera.osmTimestamp ? new Date(camera.osmTimestamp).getTime() : 0,
        };
        return cone;
      }),
    };
  }, [cameras, showCameraLayer]);

  // Pulse animation
  const startPulseAnimation = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    let startTime: number | null = null;
    let isCancelled = false;
    const duration = 1800;

    const animate = (timestamp: number) => {
      if (isCancelled) return;
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % duration;
      const progress = elapsed / duration;
      const breathe = (Math.sin(progress * Math.PI * 2) + 1) / 2;

      const outerOpacity = 0.15 + breathe * 0.35;
      const outerRadius = 16 + breathe * 4;
      const innerOpacity = 0.3 + breathe * 0.45;
      const innerRadius = 10 + breathe * 2;

      try {
        if (map.getLayer('pulse-ring-outer')) {
          map.setPaintProperty('pulse-ring-outer', 'circle-radius', outerRadius);
          map.setPaintProperty('pulse-ring-outer', 'circle-opacity', outerOpacity);
        }
        if (map.getLayer('pulse-ring-inner')) {
          map.setPaintProperty('pulse-ring-inner', 'circle-radius', innerRadius);
          map.setPaintProperty('pulse-ring-inner', 'circle-opacity', innerOpacity);
        }
      } catch {
        // Layer might not exist yet
      }

      if (!isCancelled) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [mapRef]);

  // Start/stop pulse based on visibility
  useEffect(() => {
    if (visible && mapLoaded) {
      pulseCleanupRef.current = startPulseAnimation() ?? null;
    } else {
      pulseCleanupRef.current?.();
      pulseCleanupRef.current = null;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }
    return () => {
      pulseCleanupRef.current?.();
      pulseCleanupRef.current = null;
    };
  }, [visible, mapLoaded, startPulseAnimation]);

  return (
    <>
      {/* Direction cones */}
      <Source id="direction-cones" type="geojson" data={directionConesData}>
        <Layer {...directionConeLayer} layout={{ visibility }} />
        <Layer {...directionConeOutlineLayer} layout={{ visibility }} />
      </Source>

      {/* Camera markers */}
      <Source
        id="cameras"
        type="geojson"
        data={geojsonData}
        cluster={true}
        clusterMaxZoom={11}
        clusterRadius={35}
      >
        <Layer
          id="pulse-ring-outer"
          type="circle"
          source="cameras"
          filter={['!', ['has', 'point_count']]}
          layout={{ visibility }}
          paint={{
            'circle-color': '#ef4444',
            'circle-radius': 12,
            'circle-opacity': 0.3,
            'circle-blur': 0.5,
          }}
        />
        <Layer
          id="pulse-ring-inner"
          type="circle"
          source="cameras"
          filter={['!', ['has', 'point_count']]}
          layout={{ visibility }}
          paint={{
            'circle-color': '#ef4444',
            'circle-radius': 8,
            'circle-opacity': 0.4,
            'circle-blur': 0.3,
          }}
        />
        <Layer {...unclusteredGlowLayer} layout={{ visibility }} />
        <Layer {...clusterLayer} layout={{ visibility }} />
        <Layer {...clusterCountLayer} layout={{ ...clusterCountLayer.layout, visibility }} />
        <Layer {...unclusteredPointLayer} layout={{ visibility }} />
      </Source>
    </>
  );
}
```

- [ ] **Step 2: Replace camera layer code in MapLibreContainer with CameraMarkerLayers**

In `src/components/map/MapLibreContainer.tsx`:

**2a. Add import** at the top (near the other layer imports around line 17):

```typescript
import { CameraMarkerLayers } from './layers/CameraMarkerLayers';
```

**2b. Remove the extracted code from MapLibreContainer:**

Delete the following sections (they now live in `CameraMarkerLayers.tsx`):
- `createDirectionCone` function (lines ~35-84)
- `camerasToGeoJSON` function (lines ~132-162)
- `clusterLayer` const (lines ~165-197)
- `clusterCountLayer` const (lines ~200-214)
- `unclusteredPointLayer` const (lines ~217-229)
- `unclusteredGlowLayer` const (lines ~232-243)
- `directionConeLayer` const (lines ~246-255)
- `directionConeOutlineLayer` const (lines ~258-268)

Inside the `MapLibreView` component, remove:
- `directionConesData` useMemo (lines ~516-539)
- `startPulseAnimation` useCallback (lines ~541-620)
- Pulse cleanup useEffect (lines ~622-638)

Keep: `geojsonData` useMemo, `geojsonDataRef`, and `cameraSource` — these are still used by timeline filtering and the watchdog. The `camerasToGeoJSON` function is needed by timeline/watchdog code, so keep a local copy or import it. Actually, since `CameraMarkerLayers` has its own `geojsonData`, the parent's copy is only needed for the watchdog/source-data listener logic. Keep the `camerasToGeoJSON` function and `geojsonData`/`geojsonDataRef` in MapLibreContainer for now — the watchdog depends on them. The CameraMarkerLayers component will maintain its own independent copy.

**2c. Replace the JSX blocks** (around lines ~1200-1246). Remove the direction-cones Source/Layer block and the cameras Source/Layer block. Replace with:

```tsx
{/* Camera markers + direction cones — always mounted, visibility controlled via prop */}
{/* Matches original pattern: layers are always present, visibility toggled via layout property */}
{/* This is required because explore mode's "show markers at zoom 13" needs the layers to exist */}
<CameraMarkerLayers
  cameras={cameraSource}
  visible={showCameraMarkers}
  mapLoaded={mapLoaded}
  mapRef={mapRef}
/>
```

Always mount the component (matching original behavior). The `visible` prop controls `layout.visibility` on every layer inside. The `showCameraMarkers` boolean (updated in Task 6) handles all modes: true for route, map+clusters, explore+showMarkers; false for density, network, map+heatmap.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build. Route mode should render identically to before.

- [ ] **Step 4: Commit**

```bash
git add src/components/map/layers/CameraMarkerLayers.tsx src/components/map/MapLibreContainer.tsx
git commit -m "refactor: extract CameraMarkerLayers from MapLibreContainer"
```

---

### Task 4: Create BoundaryOverlayLayers component

**Files:**
- Create: `src/components/map/layers/BoundaryOverlayLayers.tsx`

- [ ] **Step 1: Create BoundaryOverlayLayers.tsx**

Create `src/components/map/layers/BoundaryOverlayLayers.tsx`:

```typescript
import { Source, Layer } from 'react-map-gl/maplibre';
import { useMapModeStore } from '../../../store';

export function BoundaryOverlayLayers() {
  const overlays = useMapModeStore(s => s.overlays);

  return (
    <>
      {/* State boundaries — outline only */}
      <Source id="state-boundaries" type="geojson" data="/states-metrics.geojson">
        <Layer
          id="state-boundaries-line"
          type="line"
          source="state-boundaries"
          layout={{ visibility: overlays.stateBoundaries ? 'visible' : 'none' }}
          paint={{
            'line-color': '#6b7280',
            'line-width': 1.5,
            'line-opacity': 0.6,
          }}
        />
      </Source>

      {/* County boundaries — outline only */}
      <Source id="county-boundaries" type="geojson" data="/counties-metrics.geojson">
        <Layer
          id="county-boundaries-line"
          type="line"
          source="county-boundaries"
          layout={{ visibility: overlays.countyBoundaries ? 'visible' : 'none' }}
          minzoom={6}
          paint={{
            'line-color': '#4b5563',
            'line-width': 0.8,
            'line-opacity': 0.5,
          }}
        />
      </Source>

      {/* Police stations — placeholder, hidden until data is available */}
      {overlays.policeStations && (
        <Source id="police-stations" type="geojson" data="/police-stations.geojson">
          <Layer
            id="police-stations-circle"
            type="circle"
            source="police-stations"
            minzoom={8}
            paint={{
              'circle-color': '#3b82f6',
              'circle-radius': 5,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#93c5fd',
              'circle-opacity': 0.8,
            }}
          />
        </Source>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/map/layers/BoundaryOverlayLayers.tsx
git commit -m "feat: add BoundaryOverlayLayers for state/county outlines"
```

---

### Task 5: Create MapPanel component

**Files:**
- Create: `src/components/panels/MapPanel.tsx`

- [ ] **Step 1: Create MapPanel.tsx**

Create `src/components/panels/MapPanel.tsx`. This follows the same structure as `ExplorePanel.tsx` — desktop sidebar + mobile bottom sheet:

```typescript
import { useState, useEffect, useMemo } from 'react';
import { useCameraStore } from '../../store';
import { useMapModeStore } from '../../store/mapModeStore';
import { useAppModeStore } from '../../store/appModeStore';
import { BottomSheet, type SnapPoint } from '../common/BottomSheet';
import { HeatmapControls } from '../../modes/heatmap/HeatmapControls';
import { HeatmapLegend } from '../../modes/heatmap/HeatmapLegend';
import { ChevronLeft, ChevronRight, Map, Layers, Filter, X } from 'lucide-react';

export function MapPanel() {
  const [isMobile, setIsMobile] = useState(false);
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('minimized');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const cameras = useCameraStore(s => s.cameras);
  const filteredCameras = useCameraStore(s => s.filteredCameras);
  const filters = useCameraStore(s => s.filters);
  const setFilters = useCameraStore(s => s.setFilters);
  const clearFilters = useCameraStore(s => s.clearFilters);
  const availableBrands = useCameraStore(s => s.availableBrands);
  const availableOperators = useCameraStore(s => s.availableOperators);

  const visualization = useMapModeStore(s => s.visualization);
  const setVisualization = useMapModeStore(s => s.setVisualization);
  const overlays = useMapModeStore(s => s.overlays);
  const toggleOverlay = useMapModeStore(s => s.toggleOverlay);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    if (filters.showAll) return 0;
    return (
      (filters.operators.length > 0 ? 1 : 0) +
      (filters.brands.length > 0 ? 1 : 0) +
      (filters.surveillanceZones.length > 0 ? 1 : 0) +
      (filters.mountTypes.length > 0 ? 1 : 0)
    );
  }, [filters]);

  // Brand filter — searchable multi-select
  const [brandSearch, setBrandSearch] = useState('');
  const filteredBrandOptions = useMemo(() => {
    if (!brandSearch) return availableBrands.slice(0, 20);
    const lower = brandSearch.toLowerCase();
    return availableBrands.filter(b => b.toLowerCase().includes(lower)).slice(0, 20);
  }, [availableBrands, brandSearch]);

  // Operator filter — searchable multi-select
  const [operatorSearch, setOperatorSearch] = useState('');
  const filteredOperatorOptions = useMemo(() => {
    if (!operatorSearch) return availableOperators.slice(0, 20);
    const lower = operatorSearch.toLowerCase();
    return availableOperators.filter(o => o.toLowerCase().includes(lower)).slice(0, 20);
  }, [availableOperators, operatorSearch]);

  // Filter toggle helpers
  const toggleBrand = (brand: string) => {
    const current = filters.brands;
    const next = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand];
    setFilters({ brands: next, showAll: next.length === 0 && filters.operators.length === 0 && filters.surveillanceZones.length === 0 && filters.mountTypes.length === 0 });
  };

  const toggleOperator = (operator: string) => {
    const current = filters.operators;
    const next = current.includes(operator)
      ? current.filter(o => o !== operator)
      : [...current, operator];
    setFilters({ operators: next, showAll: next.length === 0 && filters.brands.length === 0 && filters.surveillanceZones.length === 0 && filters.mountTypes.length === 0 });
  };

  const toggleSurveillanceZone = (zone: string) => {
    const current = filters.surveillanceZones;
    const next = current.includes(zone)
      ? current.filter(z => z !== zone)
      : [...current, zone];
    setFilters({ surveillanceZones: next, showAll: next.length === 0 && filters.brands.length === 0 && filters.operators.length === 0 && filters.mountTypes.length === 0 });
  };

  const toggleMountType = (type: string) => {
    const current = filters.mountTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ mountTypes: next, showAll: next.length === 0 && filters.brands.length === 0 && filters.operators.length === 0 && filters.surveillanceZones.length === 0 });
  };

  const SURVEILLANCE_ZONES = ['traffic', 'town', 'parking', 'other'];
  const MOUNT_TYPES = ['pole', 'wall', 'street_light', 'other'];

  // Shared content renderer
  const renderContent = () => (
    <>
      {/* Visualization Toggle */}
      <div className="mb-6">
        <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-2 block">Visualization</label>
        <div className="flex rounded-xl bg-dark-800 p-1">
          <button
            onClick={() => setVisualization('clusters')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              visualization === 'clusters'
                ? 'bg-dark-600 text-white shadow-sm'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            Clusters
          </button>
          <button
            onClick={() => setVisualization('heatmap')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              visualization === 'heatmap'
                ? 'bg-dark-600 text-white shadow-sm'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Heatmap controls — only when heatmap is active */}
      {visualization === 'heatmap' && (
        <div className="mb-6">
          <HeatmapControls />
          <div className="mt-4">
            <HeatmapLegend />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </label>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {filters.brands.map(b => (
              <span key={b} className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-lg border border-cyan-500/30">
                {b}
                <button onClick={() => toggleBrand(b)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filters.operators.map(o => (
              <span key={o} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-lg border border-purple-500/30">
                {o}
                <button onClick={() => toggleOperator(o)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filters.surveillanceZones.map(z => (
              <span key={z} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-lg border border-amber-500/30">
                {z}
                <button onClick={() => toggleSurveillanceZone(z)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filters.mountTypes.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg border border-green-500/30">
                {t}
                <button onClick={() => toggleMountType(t)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Brand filter */}
        <div className="mb-3">
          <label className="text-xs text-dark-400 mb-1.5 block">Brand</label>
          <input
            type="text"
            placeholder="Search brands..."
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500/50"
          />
          <div className="mt-1.5 max-h-32 overflow-y-auto space-y-0.5">
            {filteredBrandOptions.map(brand => (
              <label key={brand} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="rounded border-dark-600 text-cyan-500 focus:ring-cyan-500/30 bg-dark-700"
                />
                <span className="text-xs text-dark-200 truncate">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Operator filter */}
        <div className="mb-3">
          <label className="text-xs text-dark-400 mb-1.5 block">
            Operator
            <span className="text-dark-500 ml-1">(~28% coverage)</span>
          </label>
          <input
            type="text"
            placeholder="Search operators..."
            value={operatorSearch}
            onChange={(e) => setOperatorSearch(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500/50"
          />
          <div className="mt-1.5 max-h-32 overflow-y-auto space-y-0.5">
            {filteredOperatorOptions.map(operator => (
              <label key={operator} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.operators.includes(operator)}
                  onChange={() => toggleOperator(operator)}
                  className="rounded border-dark-600 text-cyan-500 focus:ring-cyan-500/30 bg-dark-700"
                />
                <span className="text-xs text-dark-200 truncate">{operator}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Surveillance Zone checkboxes */}
        <div className="mb-3">
          <label className="text-xs text-dark-400 mb-1.5 block">Surveillance Zone</label>
          <div className="space-y-0.5">
            {SURVEILLANCE_ZONES.map(zone => (
              <label key={zone} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.surveillanceZones.includes(zone)}
                  onChange={() => toggleSurveillanceZone(zone)}
                  className="rounded border-dark-600 text-cyan-500 focus:ring-cyan-500/30 bg-dark-700"
                />
                <span className="text-xs text-dark-200 capitalize">{zone}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mount Type checkboxes */}
        <div className="mb-3">
          <label className="text-xs text-dark-400 mb-1.5 block">Mount Type</label>
          <div className="space-y-0.5">
            {MOUNT_TYPES.map(type => (
              <label key={type} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.mountTypes.includes(type)}
                  onChange={() => toggleMountType(type)}
                  className="rounded border-dark-600 text-cyan-500 focus:ring-cyan-500/30 bg-dark-700"
                />
                <span className="text-xs text-dark-200 capitalize">{type === 'street_light' ? 'Street Light' : type}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay Layers */}
      <div className="mb-6">
        <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Overlays
        </label>
        <div className="space-y-2">
          <label className="flex items-center justify-between px-3 py-2.5 bg-dark-800 rounded-xl cursor-pointer hover:bg-dark-750">
            <span className="text-sm text-dark-200">State Boundaries</span>
            <input
              type="checkbox"
              checked={overlays.stateBoundaries}
              onChange={() => toggleOverlay('stateBoundaries')}
              className="rounded border-dark-600 text-cyan-500 focus:ring-cyan-500/30 bg-dark-700"
            />
          </label>
          <label className="flex items-center justify-between px-3 py-2.5 bg-dark-800 rounded-xl cursor-pointer hover:bg-dark-750">
            <span className="text-sm text-dark-200">County Boundaries</span>
            <input
              type="checkbox"
              checked={overlays.countyBoundaries}
              onChange={() => toggleOverlay('countyBoundaries')}
              className="rounded border-dark-600 text-cyan-500 focus:ring-cyan-500/30 bg-dark-700"
            />
          </label>
          <label className="flex items-center justify-between px-3 py-2.5 bg-dark-800 rounded-xl cursor-pointer hover:bg-dark-750 opacity-50">
            <div>
              <span className="text-sm text-dark-200">Police Stations</span>
              <span className="text-xs text-dark-500 ml-2">Coming soon</span>
            </div>
            <input
              type="checkbox"
              checked={false}
              disabled
              className="rounded border-dark-600 text-cyan-500 bg-dark-700 cursor-not-allowed"
            />
          </label>
        </div>
      </div>
    </>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <BottomSheet
        snapPoint={snapPoint}
        onSnapPointChange={setSnapPoint}
        minimizedHeight={84}
        peekHeight={84}
        fullHeight={85}
        headerContent={
          <button
            onClick={() => setSnapPoint('full')}
            className="w-full flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Map className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  Map
                  {activeFilterCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                      {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                <p className="text-xs text-dark-400">{filteredCameras.length.toLocaleString()} / {cameras.length.toLocaleString()} cameras</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-dark-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
            </svg>
          </button>
        }
      >
        {snapPoint === 'full' && (
          <div className="pb-8">
            {renderContent()}
            <div className="mt-6 pt-4 border-t border-dark-700/50">
              <div className="flex items-center justify-between text-sm text-dark-400">
                <span>Data from OpenStreetMap</span>
                <span className="text-dark-300 font-medium">{filteredCameras.length.toLocaleString()} cameras</span>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    );
  }

  // Desktop: Side Panel
  return (
    <div className="hidden lg:block relative h-full">
      <div className={`flex flex-col h-full bg-dark-900 border-r border-dark-700/50 ${
        hasAnimated ? 'transition-all duration-300' : ''
      } ${isCollapsed ? 'w-0 overflow-hidden' : 'w-[400px]'}`}>
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-dark-700/50">
          <h2 className="text-lg font-display font-semibold text-white mb-1">Map</h2>
          <p className="text-xs text-dark-400 leading-relaxed">
            Browse ALPR cameras across the US. Filter by brand, operator, or zone. Toggle overlays for boundaries.
            {' '}Data from <a href="https://deflock.me" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">DeFlock</a> and{' '}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">OpenStreetMap</a>.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-dark-700/50 bg-dark-800/50">
          <div className="flex items-center justify-between text-sm text-dark-400">
            <span>Data from OpenStreetMap</span>
            <span className="text-dark-300 font-medium">{filteredCameras.length.toLocaleString()} / {cameras.length.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute z-50 top-1/2 -translate-y-1/2 ${
          hasAnimated ? 'transition-all duration-300' : ''
        } ${isCollapsed ? 'left-0' : 'left-[400px]'} w-6 h-16 bg-dark-800 hover:bg-dark-700 border border-dark-600 border-l-0 rounded-r-lg flex items-center justify-center group`}
        aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-dark-300 group-hover:text-white transition-colors" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-dark-300 group-hover:text-white transition-colors" />
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/MapPanel.tsx
git commit -m "feat: add MapPanel with visualization toggle, filters, and overlay controls"
```

---

### Task 6: Update MapLibreContainer for map mode

**Files:**
- Modify: `src/components/map/MapLibreContainer.tsx`

- [ ] **Step 1: Add mapModeStore import**

At the top of `MapLibreContainer.tsx`, add:

```typescript
import { useMapModeStore } from '../../store/mapModeStore';
import { BoundaryOverlayLayers } from './layers/BoundaryOverlayLayers';
```

- [ ] **Step 2: Update mode detection and showCameraMarkers logic**

Inside the `MapLibreView` component, after the existing mode detection block (around line ~311-327), update the logic:

Replace the existing `showCameraMarkers` derivation:

```typescript
  const isExploreMode = appMode === 'explore';
  const isDensityMode = appMode === 'density';
  const isNetworkMode = appMode === 'network';
  const isMapMode = appMode === 'map';
  const isHeatmapMode = isExploreMode && mapVisualization === 'heatmap';
  const isDotsMode = isExploreMode && mapVisualization === 'dots';
```

Add the map mode visualization store read:

```typescript
  const mapModeViz = useMapModeStore(s => s.visualization);
```

Update `showCameraMarkers` to include map mode:

```typescript
  const showCameraMarkers = !isNetworkMode && !isDensityMode && (
    appMode === 'route'
    || (isMapMode && mapModeViz === 'clusters')
    || (isHeatmapMode && (heatmapSettings.showMarkers || zoom >= 13))
    || (isDotsMode && (dotDensitySettings.showMarkers || zoom >= 13))
  );
```

- [ ] **Step 3: Add map mode heatmap rendering in the JSX**

In the conditional rendering section, add map mode heatmap alongside the existing explore heatmap:

```tsx
{isHeatmapMode && <HeatmapLayers />}
{isMapMode && mapModeViz === 'heatmap' && <HeatmapLayers />}
{isDotsMode && <DotDensityLayers />}
{isDensityMode && <DensityLayers />}
{isNetworkMode && <NetworkLayers />}
{isMapMode && <BoundaryOverlayLayers />}
```

- [ ] **Step 4: Update interactiveLayerIds**

Update the interactive layers logic to include map mode:

```typescript
interactiveLayerIds={isNetworkMode
  ? []
  : isDensityMode
    ? ['density-states-fill', 'density-counties-fill', 'density-states-extrusion', 'density-counties-extrusion']
    : showCameraMarkers ? ['clusters', 'unclustered-point'] : []}
```

This already works for map mode since `showCameraMarkers` now includes the map+clusters case.

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 6: Commit**

```bash
git add src/components/map/MapLibreContainer.tsx
git commit -m "feat: integrate map mode rendering in MapLibreContainer"
```

---

### Task 7: Update MapPage tabs, URL routing, and panel rendering

**Files:**
- Modify: `src/pages/MapPage.tsx`

- [ ] **Step 1: Update imports**

Add the MapPanel import and Map icon:

```typescript
import { MapPanel } from '@/components/panels/MapPanel';
import { Route, Compass, BarChart3, Menu, X, Network, Map as MapIcon } from 'lucide-react';
```

- [ ] **Step 2: Update MODE_LABELS**

Replace the MODE_LABELS constant (line 20-25):

```typescript
const MODE_LABELS: Record<AppMode, { icon: typeof Route; label: string }> = {
  map: { icon: MapIcon, label: 'Map' },
  route: { icon: Route, label: 'Route' },
  explore: { icon: Compass, label: 'Timeline' },
  density: { icon: BarChart3, label: 'Analysis' },
  network: { icon: Network, label: 'Network' },
};
```

- [ ] **Step 3: Update URL path detection**

Add map path detection alongside existing path checks (around line 44-47):

```typescript
  const isMapPath = location.pathname === '/map' || location.pathname === '/';
  const isRoutePath = location.pathname === '/route';
  const isExplorePath = location.pathname === '/explore';
  const isTimelinePath = location.pathname === '/timeline';
  const isAnalysisPath = location.pathname === '/analysis';
  const isNetworkPath = location.pathname === '/network';
```

- [ ] **Step 4: Update URL sync effect**

Replace the URL sync useEffect (lines 61-102):

```typescript
  useEffect(() => {
    if (isAnalysisPath) {
      setAppMode('density');
    } else if (isExplorePath) {
      useAppModeStore.setState({
        appMode: 'explore',
        mapVisualization: 'dots',
        timelineSettings: {
          currentDate: new Date().toISOString().slice(0, 10),
          isPlaying: false,
          playSpeed: 45,
        },
      });
    } else if (isTimelinePath) {
      useAppModeStore.setState({
        appMode: 'explore',
        mapVisualization: 'dots',
        timelineSettings: {
          currentDate: '2024-07-01',
          isPlaying: false,
          playSpeed: 45,
        },
      });
    } else if (isNetworkPath) {
      setAppMode('network');
    } else if (isRoutePath) {
      setAppMode('route');
    } else {
      const urlMode = searchParams.get('mode');
      if (urlMode === 'route') {
        setAppMode('route');
      } else if (urlMode === 'explore') {
        setAppMode('explore');
      } else if (urlMode === 'density') {
        setAppMode('density');
      } else if (urlMode === 'network') {
        setAppMode('network');
      } else {
        // Default: map mode
        setAppMode('map');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 5: Update handleSetAppMode URL params**

Replace handleSetAppMode (lines 105-116):

```typescript
  const handleSetAppMode = useCallback((mode: AppMode) => {
    setAppMode(mode);
    if (mode === 'map') {
      setSearchParams({}, { replace: true });
    } else if (mode === 'route') {
      setSearchParams({ mode: 'route' }, { replace: true });
    } else if (mode === 'explore') {
      setSearchParams({ mode: 'explore' }, { replace: true });
    } else if (mode === 'density') {
      setSearchParams({ mode: 'density' }, { replace: true });
    } else if (mode === 'network') {
      setSearchParams({ mode: 'network' }, { replace: true });
    }
  }, [setAppMode, setSearchParams]);
```

- [ ] **Step 6: Add MapPanel to desktop panel rendering**

In the desktop panel section (around lines 363-367), add MapPanel:

```tsx
  {/* Desktop: individual side panels */}
  {!isMobile && appMode === 'map' && <MapPanel />}
  {!isMobile && appMode === 'route' && <RoutePanel />}
  {!isMobile && appMode === 'explore' && <ExplorePanel />}
  {!isMobile && appMode === 'density' && <DensityPanel />}
  {!isMobile && appMode === 'network' && <NetworkPanel />}
```

- [ ] **Step 7: Add map mode legend**

After the existing route mode legend block (around line 411-432), add a map mode legend:

```tsx
  {/* Map Legend - map mode (clusters view) */}
  {appMode === 'map' && (
    <div className="absolute bottom-6 left-4 z-20 hidden lg:flex flex-col gap-2">
      <div className="bg-dark-900/95 backdrop-blur-md rounded-2xl border border-dark-700/50 px-5 py-3.5 shadow-xl shadow-black/20">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
            <span className="text-dark-100">ALPR Camera</span>
          </div>
        </div>
      </div>
    </div>
  )}
```

- [ ] **Step 8: Verify build passes**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 9: Commit**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat: add Map tab as default, rename Explore to Timeline, update URL routing"
```

---

### Task 8: Update MobileTabDrawer for new tab order

**Files:**
- Modify: `src/components/panels/MobileTabDrawer.tsx`

- [ ] **Step 1: Update imports and tab definitions**

Add Map icon import and update TABS array:

```typescript
import { Route, Compass, BarChart3, Network, Map as MapIcon } from 'lucide-react';
```

Replace the TABS array (lines 28-33):

```typescript
const TABS: TabDef[] = [
  { mode: 'map', label: 'Map', icon: MapIcon },
  { mode: 'route', label: 'Route', icon: Route },
  { mode: 'explore', label: 'Timeline', icon: Compass },
  { mode: 'density', label: 'Analysis', icon: BarChart3 },
  { mode: 'network', label: 'Network', icon: Network },
];
```

- [ ] **Step 2: Update grid columns for 5 tabs**

Change the header grid from 4 columns to 5 (line 107):

```tsx
<div className="grid grid-cols-5 gap-1">
```

- [ ] **Step 3: Add map mode content to renderTabContent**

In the `renderTabContent` switch statement (around line 132), add a `'map'` case before the `'route'` case:

```typescript
      /* ---------- MAP ---------- */
      case 'map':
        return (
          <div className="pb-8">
            <p className="text-xs text-dark-400 mb-3 leading-relaxed">
              Browse ALPR cameras across the US. Filter by brand, operator, or zone.
              {' '}Data from <a href="https://deflock.me" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">DeFlock</a>
              {' '}&amp;{' '}
              <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">OSM</a>
              {' '}contributors.
            </p>
            <p className="text-sm text-dark-300">
              Use the map to explore cameras. Expand controls from the bottom sheet header.
            </p>
          </div>
        );
```

Note: On mobile, the MapPanel's own BottomSheet handles the full filter/overlay UI. The MobileTabDrawer's map content is minimal — just a description. The actual controls are in `MapPanel`'s mobile bottom sheet. However, since `MobileTabDrawer` replaces all panels on mobile (see MapPage line 361), we need to render MapPanel content inline here instead.

Actually, looking at the code more carefully: on mobile, `MobileTabDrawer` is the single unified drawer. Individual panels like `ExplorePanel` are only rendered on desktop. So the map mode filter controls need to go into `MobileTabDrawer`'s map case. Let me revise:

```typescript
      /* ---------- MAP ---------- */
      case 'map':
        return <MapMobileContent />;
```

But this would require importing all the map mode filter logic into MobileTabDrawer, which is messy. A cleaner approach: extract the filter content from `MapPanel` into a shared component `MapPanelContent` (similar to how `RoutePanelContent` exists for route). For now, keep it simple — render a basic version in the MobileTabDrawer and note this as a follow-up refinement.

Simpler approach — import and use the stores directly:

```typescript
      /* ---------- MAP ---------- */
      case 'map':
        return (
          <div className="pb-8">
            <p className="text-xs text-dark-400 mb-3 leading-relaxed">
              Browse ALPR cameras across the US. Filter by brand, operator, or zone.
              {' '}Data from{' '}
              <a href="https://deflock.me" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">DeFlock</a>
              {' '}&amp;{' '}
              <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">OSM</a>.
            </p>

            {/* Visualization toggle */}
            <div className="mb-4">
              <label className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-2 block">Visualization</label>
              <div className="flex rounded-xl bg-dark-800 p-1">
                <button
                  onClick={() => useMapModeStore.getState().setVisualization('clusters')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    mapModeViz === 'clusters'
                      ? 'bg-dark-600 text-white shadow-sm'
                      : 'text-dark-400 hover:text-dark-200'
                  }`}
                >
                  Clusters
                </button>
                <button
                  onClick={() => useMapModeStore.getState().setVisualization('heatmap')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    mapModeViz === 'heatmap'
                      ? 'bg-dark-600 text-white shadow-sm'
                      : 'text-dark-400 hover:text-dark-200'
                  }`}
                >
                  Heatmap
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-dark-700/50">
              <div className="flex items-center justify-between text-sm text-dark-400">
                <span>Data from OpenStreetMap</span>
                <span className="text-dark-300 font-medium">{cameraCount.toLocaleString()} US cameras</span>
              </div>
            </div>
          </div>
        );
```

- [ ] **Step 4: Add mapModeStore import and state read**

At the top of MobileTabDrawer.tsx, add:

```typescript
import { useMapModeStore } from '../../store/mapModeStore';
import { Map as MapIcon } from 'lucide-react';
```

Inside the component, add the store read alongside other store reads:

```typescript
  const mapModeViz = useMapModeStore(s => s.visualization);
```

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 6: Run dev server and manually test**

Run: `npm run dev`

Verify:
1. App loads to Map tab by default (not Route)
2. All 5 tabs appear: Map, Route, Timeline, Analysis, Network
3. Map tab shows clusters with camera markers and direction cones
4. Switching to heatmap via sidebar toggle works
5. Route tab still works as before
6. Timeline (was Explore) tab still works
7. URL updates correctly when switching tabs
8. `/` and `/map` both load Map mode
9. `/route` loads Route mode
10. `/timeline` loads Timeline mode

- [ ] **Step 7: Commit**

```bash
git add src/components/panels/MobileTabDrawer.tsx
git commit -m "feat: update MobileTabDrawer with Map tab and 5-tab layout"
```

---

### Task 9: Lint and final verification

**Files:** All modified files

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors (warnings are acceptable).

Fix any lint issues that appear.

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors.

- [ ] **Step 3: Final commit if lint fixes were needed**

```bash
git add -A
git commit -m "fix: lint cleanup for map tab redesign"
```
