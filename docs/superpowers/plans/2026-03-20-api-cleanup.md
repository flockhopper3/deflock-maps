# API Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all client-side routing logic from the FlockHopper frontend and replace with a clean API client calling `api.dontgetflocked.com/api/v1/route`.

**Architecture:** Single `apiClient.ts` service module wraps all API calls. `routeStore` calls the API instead of the local routing pipeline. Camera data stays bundled for map visualization. Custom route feature disabled until API supports waypoints.

**Tech Stack:** React 18, TypeScript, Zustand, Vite (VITE_ env vars)

**Spec:** `docs/superpowers/specs/2026-03-20-api-cleanup-design.md`

---

## Chunk 1: Types, API Client, and Environment Config

### Task 1: Update Environment Config

**Files:**
- Modify: `FlockHopper/.env.example`
- Create: `FlockHopper/.env` (if not exists)

- [ ] **Step 1: Update `.env.example`**

Replace the contents of `.env.example` with:

```
# FlockHopper Environment Configuration
# Copy this file to .env and update values as needed

# FlockHopper API URL
# Default: https://api.dontgetflocked.com
VITE_API_URL=https://api.dontgetflocked.com

# Protomaps Vector Tile Server URL
VITE_TILES_URL=https://tiles.dontgetflocked.com

# LocationIQ geocoding API key (optional - falls back to Photon/OSM)
# VITE_LOCATIONIQ_KEY=your_key_here

# Performance logging (development only)
VITE_PERF_LOGGING=false
```

This removes `VITE_GRAPHHOPPER_ENDPOINT` and adds `VITE_API_URL`.

- [ ] **Step 2: Create/update `.env` for local dev**

```
VITE_API_URL=https://api.dontgetflocked.com
VITE_TILES_URL=https://tiles.dontgetflocked.com
VITE_PERF_LOGGING=false
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: update env config — replace GraphHopper endpoint with API URL"
```

Note: Do NOT commit `.env` — it should be in `.gitignore`.

---

### Task 2: Add API Response Types and Slim Down Route Types

**Files:**
- Modify: `FlockHopper/src/types/route.ts`

- [ ] **Step 1: Add `ImprovementMetrics`, `POIMetrics`, `RouteOptions`, and API response types**

Add after the existing `CameraRoutingResult` interface (after line 247):

```typescript
/**
 * API response types — matches FlockHopper API V2 at api.dontgetflocked.com
 */

export interface RouteOptions {
  cameraDistanceMeters: number;
  costing: 'auto' | 'bicycle' | 'pedestrian';
  useDirectionalZones: boolean;
}

export interface ImprovementMetrics {
  camerasAvoided: number;
  cameraReductionPercent: number;
  distanceIncrease: number;
  distanceIncreasePercent: number;
  durationIncrease: number;
  durationIncreasePercent: number;
  penaltyReduction: number;
}

export interface POIMetrics {
  poisInArea: number;
  poisOnNormalRoute: number;
  poisOnAvoidanceRoute: number;
  poisAvoided: number;
}

export interface APIRouteResponse {
  ok: true;
  result: {
    normalRoute: CameraAwareRouteResult;
    avoidanceRoute: CameraAwareRouteResult;
    improvement: ImprovementMetrics;
    poiMetrics?: POIMetrics;
  };
}

export interface APIRouteErrorResponse {
  ok: false;
  error: string;
}
```

- [ ] **Step 2: Remove GraphHopper-only types**

Delete the following blocks from `src/types/route.ts`:

- Lines 70-118: `GraphHopperRequest`, `GraphHopperResponse`, `GraphHopperPath`, `GraphHopperInstruction`, `GraphHopperConfig` interfaces
- Lines 63-68: `AvoidanceConfig` interface (old, not used by UI — distinct from `CameraAvoidanceConfig`)
- Lines 45-50: `AvoidanceRoute` interface (old, not used by UI)

Keep these (used by UI components):
- `Location`, `Route`, `Maneuver`, `RouteAnalysis`, `RouteComparison`
- `CameraAwareRouteResult`, `CameraRoutingResult`, `RouteScoreInfo`, `ZoneStats`
- `NominatimResult`, `GPXMetadata`

- [ ] **Step 3: Keep `CameraAvoidanceConfig` but mark deprecated**

Don't delete `CameraAvoidanceConfig` yet — it's still referenced by `routeStore.ts` and will be replaced in Task 4. Just add a deprecation comment above it (line 148):

```typescript
/** @deprecated Use RouteOptions instead — will be removed in Task 4 */
```

- [ ] **Step 4: Commit**

```bash
git add src/types/route.ts
git commit -m "feat: add API response types, remove GraphHopper-only types"
```

---

### Task 3: Create API Client

**Files:**
- Create: `FlockHopper/src/services/apiClient.ts`

- [ ] **Step 1: Create `src/services/apiClient.ts`**

```typescript
import type {
  Location,
  RouteOptions,
  APIRouteResponse,
  CameraAwareRouteResult,
  ImprovementMetrics,
  POIMetrics,
} from '../types';

const DEFAULT_API_URL = 'https://api.dontgetflocked.com';

function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    if (import.meta.env.DEV) {
      console.warn(
        'VITE_API_URL is not set — falling back to',
        DEFAULT_API_URL
      );
    }
    return DEFAULT_API_URL;
  }
  return url;
}

export interface CalculateRouteOptions {
  costing?: 'auto' | 'bicycle' | 'pedestrian';
  cameraDistanceMeters?: number;
  useDirectionalZones?: boolean;
}

export interface CalculateRouteResult {
  normalRoute: CameraAwareRouteResult;
  avoidanceRoute: CameraAwareRouteResult;
  improvement: ImprovementMetrics;
  poiMetrics?: POIMetrics;
}

export async function calculateRoute(
  origin: Location,
  destination: Location,
  options?: CalculateRouteOptions
): Promise<CalculateRouteResult> {
  const apiUrl = getApiUrl();

  const body = {
    origin: { lat: origin.lat, lon: origin.lon },
    destination: { lat: destination.lat, lon: destination.lon },
    format: 'full' as const,
    ...(options?.costing && { costing: options.costing }),
    ...(options?.cameraDistanceMeters != null && {
      cameraDistanceMeters: options.cameraDistanceMeters,
    }),
    ...(options?.useDirectionalZones != null && {
      useDirectionalZones: options.useDirectionalZones,
    }),
  };

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/v1/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Unable to reach the routing server. Check your connection.');
  }

  if (!response.ok) {
    if (response.status === 400) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.error || 'Invalid route request. Please check your locations.'
      );
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error(
        'Routing service is temporarily unavailable. Please try again.'
      );
    }
    throw new Error(`Routing failed (${response.status}). Please try again.`);
  }

  const data: APIRouteResponse = await response.json();

  if (!data.ok || !data.result) {
    throw new Error('Unexpected response from routing service.');
  }

  return data.result;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd FlockHopper && npx tsc --noEmit src/services/apiClient.ts 2>&1 | head -20`

If there are type errors, fix them. The types should align with what we added in Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/services/apiClient.ts
git commit -m "feat: add apiClient.ts — thin fetch wrapper for FlockHopper API"
```

---

## Chunk 2: Store and Config Changes

### Task 4: Rewrite `routeStore.ts` to Use API Client

**Files:**
- Modify: `FlockHopper/src/store/routeStore.ts`

- [ ] **Step 1: Replace imports at the top of the file (lines 1-13)**

Replace:

```typescript
import { create } from 'zustand';
import type {
  Location,
  Route,
  RouteComparison,
  CameraOnRoute,
  ALPRCamera,
  CameraAvoidanceConfig,
} from '../types';
import {
  calculateCameraAwareRoute,
  DEFAULT_AVOIDANCE_CONFIG,
} from '../services/cameraAwareRouting';
```

With:

```typescript
import { create } from 'zustand';
import type {
  Location,
  Route,
  RouteComparison,
  CameraOnRoute,
  RouteOptions,
} from '../types';
import { calculateRoute } from '../services/apiClient';
```

- [ ] **Step 2: Update `RouteState` interface — replace `avoidanceConfig` type and remove dead actions (lines 18-52)**

Replace the full `RouteState` interface with:

```typescript
interface RouteState {
  origin: Location | null;
  destination: Location | null;
  normalRoute: Route | null;
  avoidanceRoute: Route | null;
  comparison: RouteComparison | null;
  normalRouteCameras: CameraOnRoute[];
  avoidanceRouteCameras: CameraOnRoute[];
  isCalculating: boolean;
  error: string | null;
  activeRoute: 'normal' | 'avoidance';

  // Route options sent to API
  routeOptions: RouteOptions;

  // Location picking mode - for "choose on map" feature
  pickingLocation: LocationPickingMode;

  // Actions
  setOrigin: (location: Location | null) => void;
  setDestination: (location: Location | null) => void;
  calculateRoutes: () => Promise<void>;
  clearRoutes: () => void;
  setActiveRoute: (type: 'normal' | 'avoidance') => void;
  swapLocations: () => void;
  setCameraDistance: (meters: number) => void;
  setUseDirectionalZones: (enabled: boolean) => void;

  // Location picking actions
  startPickingLocation: (mode: 'origin' | 'destination') => void;
  cancelPickingLocation: () => void;
  setPickedLocation: (location: Location) => void;
}
```

Note: `calculateRoutes` no longer takes `cameras` arg. `setAvoidanceWeight` and `setMaxDetour` removed. `avoidanceConfig: CameraAvoidanceConfig` replaced with `routeOptions: RouteOptions`.

**IMPORTANT:** Preserve the `export type LocationPickingMode = 'origin' | 'destination' | null;` declaration at line 16 — it sits between the imports and the store body and must not be lost.

- [ ] **Step 3: Update the store implementation — default config and calculateRoutes (lines 54-154)**

Replace the store creation with:

```typescript
const DEFAULT_ROUTE_OPTIONS: RouteOptions = {
  cameraDistanceMeters: 75,
  costing: 'auto',
  useDirectionalZones: true,
};

export const useRouteStore = create<RouteState>((set, get) => ({
  origin: null,
  destination: null,
  normalRoute: null,
  avoidanceRoute: null,
  comparison: null,
  normalRouteCameras: [],
  avoidanceRouteCameras: [],
  isCalculating: false,
  error: null,
  activeRoute: 'normal',
  routeOptions: DEFAULT_ROUTE_OPTIONS,
  pickingLocation: null,

  setOrigin: (location: Location | null) => {
    set({
      origin: location,
      normalRoute: null,
      avoidanceRoute: null,
      comparison: null,
      error: null,
    });
  },

  setDestination: (location: Location | null) => {
    set({
      destination: location,
      normalRoute: null,
      avoidanceRoute: null,
      comparison: null,
      error: null,
    });
  },

  calculateRoutes: async () => {
    const { origin, destination, routeOptions, isCalculating } = get();

    if (isCalculating) return;

    if (!origin || !destination) {
      set({ error: 'Please select both origin and destination' });
      return;
    }

    set({ isCalculating: true, error: null });

    try {
      const result = await calculateRoute(origin, destination, {
        costing: routeOptions.costing,
        cameraDistanceMeters: routeOptions.cameraDistanceMeters,
        useDirectionalZones: routeOptions.useDirectionalZones,
      });

      const comparison: RouteComparison = {
        distanceIncrease: result.improvement.distanceIncrease,
        distanceIncreasePercent: result.improvement.distanceIncreasePercent,
        durationIncrease: result.improvement.durationIncrease,
        durationIncreasePercent: result.improvement.durationIncreasePercent,
        camerasAvoided: result.improvement.camerasAvoided,
        remainingCameras: result.avoidanceRoute.camerasOnRoute.length,
        normalCameras: result.normalRoute.camerasOnRoute,
        avoidanceCameras: result.avoidanceRoute.camerasOnRoute,
      };

      set({
        normalRoute: result.normalRoute.route,
        avoidanceRoute: result.avoidanceRoute.route,
        normalRouteCameras: result.normalRoute.camerasOnRoute,
        avoidanceRouteCameras: result.avoidanceRoute.camerasOnRoute,
        comparison,
        isCalculating: false,
        activeRoute:
          result.normalRoute.camerasOnRoute.length >
          result.avoidanceRoute.camerasOnRoute.length
            ? 'avoidance'
            : 'normal',
      });
    } catch (error) {
      console.error('Routing failed:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to calculate route',
        isCalculating: false,
      });
    }
  },

  clearRoutes: () => {
    set({
      normalRoute: null,
      avoidanceRoute: null,
      comparison: null,
      normalRouteCameras: [],
      avoidanceRouteCameras: [],
      error: null,
      activeRoute: 'normal',
    });
  },

  setActiveRoute: (type: 'normal' | 'avoidance') => {
    set({ activeRoute: type });
  },

  swapLocations: () => {
    const { origin, destination } = get();
    set({
      origin: destination,
      destination: origin,
      normalRoute: null,
      avoidanceRoute: null,
      comparison: null,
      error: null,
    });
  },

  setCameraDistance: (meters: number) => {
    const { routeOptions } = get();
    set({
      routeOptions: {
        ...routeOptions,
        cameraDistanceMeters: Math.max(10, Math.min(150, meters)),
      },
      error: null,
    });
  },

  setUseDirectionalZones: (enabled: boolean) => {
    const { routeOptions } = get();
    set({
      routeOptions: {
        ...routeOptions,
        useDirectionalZones: enabled,
      },
      error: null,
    });
  },

  // Location picking actions
  startPickingLocation: (mode: 'origin' | 'destination') => {
    set({ pickingLocation: mode });
  },

  cancelPickingLocation: () => {
    set({ pickingLocation: null });
  },

  setPickedLocation: (location: Location) => {
    const { pickingLocation } = get();
    if (pickingLocation === 'origin') {
      set({
        origin: location,
        pickingLocation: null,
        normalRoute: null,
        avoidanceRoute: null,
        comparison: null,
        error: null,
      });
    } else if (pickingLocation === 'destination') {
      set({
        destination: location,
        pickingLocation: null,
        normalRoute: null,
        avoidanceRoute: null,
        comparison: null,
        error: null,
      });
    }
  },
}));
```

- [ ] **Step 4: Remove the old `setAvoidanceWeight` and `setMaxDetour` implementations**

These should already be gone from Step 3 since we replaced the entire store. Verify by searching for `setAvoidanceWeight` and `setMaxDetour` — they should not appear in the file.

- [ ] **Step 5: Commit**

```bash
git add src/store/routeStore.ts
git commit -m "feat: rewrite routeStore to call API instead of client-side routing"
```

---

### Task 5: Update All `calculateRoutes` Call Sites

**Files:**
- Modify: `FlockHopper/src/components/panels/RoutePlannerTab.tsx`
- Modify: `FlockHopper/src/components/panels/RoutePanelContent.tsx`
- Modify: `FlockHopper/src/components/panels/ControlPanel.tsx`
- Modify: `FlockHopper/src/components/panels/RouteCheckTab.tsx`

All four files follow the same pattern: they import `useCameraStore` to get cameras, then call `calculateRoutes(cameras)`. Since `calculateRoutes()` no longer takes an arg, update each file:

- [ ] **Step 1: Update `RoutePlannerTab.tsx`**

- Remove the `useCameraStore` import and `const { cameras } = useCameraStore()` (line 35) if cameras is only used for `calculateRoutes`
- Change `calculateRoutes(cameras)` (line 39) to `calculateRoutes()`
- Remove `setAvoidanceWeight` and `setMaxDetour` from the `useRouteStore()` destructuring (lines 28-29)
- Remove the Avoidance Weight slider block (lines 152-173)
- Remove the Max Detour Percent slider block (lines 175-196)
- Also remove the parent settings toggle button and `{showSettings && (...)}` wrapper (lines 129-198) since there are no settings controls left in this component (camera distance and directional zones are in `RoutePanelContent.tsx`, not here). Remove the `showSettings` state variable too if it becomes unused.
- Change `avoidanceConfig` references to `routeOptions` where applicable

- [ ] **Step 2: Update `RoutePanelContent.tsx`**

- Remove `useCameraStore` import and `cameras` destructuring if only used for `calculateRoutes`
- Change `calculateRoutes(cameras)` (line 63) to `calculateRoutes()`
- Rename `avoidanceConfig` to `routeOptions` in the `useRouteStore()` destructuring (line 41)
- Update all field references: `avoidanceConfig.cameraDistanceMeters` → `routeOptions.cameraDistanceMeters` (lines 213, 224), `avoidanceConfig.useDirectionalZones` → `routeOptions.useDirectionalZones` (lines 244, 246, 249, 253)

- [ ] **Step 3: Update `ControlPanel.tsx`**

- Remove `useCameraStore` import and `cameras` destructuring if only used for `calculateRoutes`
- Change `calculateRoutes(cameras)` (line 32) to `calculateRoutes()`

- [ ] **Step 4: Update `RouteCheckTab.tsx`**

- Remove `useCameraStore` import and `cameras` destructuring if only used for `calculateRoutes`
- Change `calculateRoutes(cameras)` (line 26) to `calculateRoutes()`

- [ ] **Step 5: Update `CustomRoutePanel.tsx`**

Even though this panel will be hidden from the UI in Task 11, the file still compiles and must not reference the deleted `avoidanceConfig`.

- Rename `avoidanceConfig` to `routeOptions` in the `useRouteStore()` destructuring (line 33)
- Update all field references: `avoidanceConfig.cameraDistanceMeters` → `routeOptions.cameraDistanceMeters` and `avoidanceConfig.useDirectionalZones` → `routeOptions.useDirectionalZones` (lines 61, 169, 170, 190, 201, 221, 223, 226, 230)

- [ ] **Step 6: Build check**

Run: `cd FlockHopper && npx tsc --noEmit 2>&1 | head -30`

Fix any type errors from the `avoidanceConfig` → `routeOptions` rename.

- [ ] **Step 7: Commit**

```bash
git add src/components/panels/RoutePlannerTab.tsx src/components/panels/RoutePanelContent.tsx src/components/panels/ControlPanel.tsx src/components/panels/RouteCheckTab.tsx src/components/panels/CustomRoutePanel.tsx
git commit -m "refactor: update all calculateRoutes call sites — no camera arg needed"
```

---

### Task 6: Disable Custom Route Store

**Files:**
- Modify: `FlockHopper/src/store/customRouteStore.ts`

- [ ] **Step 1: Remove dead imports at top of file (lines 1-6)**

Replace:

```typescript
import { create } from 'zustand';
import type { Location, Route, CameraOnRoute, ALPRCamera } from '../types';
import { calculateAvoidanceRouteWithWaypoints } from '../services/graphHopperService';
import { findCamerasOnRoute, haversineDistance } from '../utils/geo';
import { useRouteStore } from './routeStore';
import { ZONE_SAFETY_MULTIPLIERS } from '../services/routingConfig';
```

With:

```typescript
import { create } from 'zustand';
import type { Location, Route, CameraOnRoute, ALPRCamera } from '../types';
import { haversineDistance } from '../utils/geo';
```

- [ ] **Step 2: Replace `recalculateRoute` implementation (lines 346-452)**

Replace the entire `recalculateRoute` method body with a no-op:

```typescript
  recalculateRoute: async (_cameras: ALPRCamera[]) => {
    set({
      error: 'Custom routing coming soon — waiting for API waypoint support',
      isRecalculating: false,
    });
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/store/customRouteStore.ts
git commit -m "refactor: disable custom route recalculation — pending API waypoint support"
```

---

## Chunk 3: Cleanup and Deletion

### Task 7: Delete Client-Side Routing Files

**Files:**
- Delete: `FlockHopper/src/services/cameraAwareRouting.ts`
- Delete: `FlockHopper/src/services/graphHopperService.ts`
- Delete: `FlockHopper/src/utils/routeScoring.ts`

- [ ] **Step 1: Delete the three files**

```bash
cd FlockHopper
rm src/services/cameraAwareRouting.ts
rm src/services/graphHopperService.ts
rm src/utils/routeScoring.ts
```

- [ ] **Step 2: Update barrel exports**

In `src/services/index.ts`, replace lines 10-12:

```typescript
// Routing services - GraphHopper (primary)
export * from './graphHopperService';
export * from './cameraAwareRouting';
```

With:

```typescript
// API client - FlockHopper routing API
export * from './apiClient';
```

In `src/utils/index.ts`, remove line 4:

```typescript
export * from './routeScoring';
```

- [ ] **Step 3: Build check**

Run: `cd FlockHopper && npx tsc --noEmit 2>&1 | head -30`

Fix any remaining import errors. Common issues: other files may still import types like `GraphHopperRequest` — remove those imports.

- [ ] **Step 4: Commit**

```bash
git add -A src/services/cameraAwareRouting.ts src/services/graphHopperService.ts src/utils/routeScoring.ts src/services/index.ts src/utils/index.ts
git commit -m "refactor: delete client-side routing pipeline (~1300 lines removed)"
```

---

### Task 8: Trim `routingConfig.ts`

**Files:**
- Modify: `FlockHopper/src/services/routingConfig.ts`

- [ ] **Step 1: Keep only visualization constants**

Replace the entire file with:

```typescript
/**
 * Routing Configuration — Visualization Constants
 *
 * These constants are used by MapLibreContainer.tsx for rendering
 * camera direction cones and detection zones on the map.
 *
 * All routing/avoidance logic is now handled by the API.
 */

// ============================================================================
// ZONE SAFETY MULTIPLIERS
// ============================================================================

/**
 * Multipliers for avoidance zones relative to the user's detection radius.
 * Used for map visualization of camera zones.
 */
export const ZONE_SAFETY_MULTIPLIERS = {
  /** Block zones are 1.6x the detection radius */
  block: 1.6,
  /** Penalty zones are 2.5x the detection radius */
  penalty: 2.5,
} as const;

// ============================================================================
// DIRECTIONAL ZONE SETTINGS
// ============================================================================

export const DIRECTIONAL_ZONE = {
  /** Total field of view for camera cone (degrees) */
  cameraFovDegrees: 70,
  /** Legacy — not used */
  detectionRangeMeters: 120,
  /** Small buffer behind camera (meters) */
  backBufferMeters: 15,
  /** Number of arc segments for the front curve of the cone */
  arcSegments: 8,
} as const;

// ============================================================================
// CAMERA DETECTION CONFIG
// ============================================================================

export const CAMERA_DETECTION = {
  /** Distance in meters for a camera to be considered "on route" */
  routeBufferMeters: 75,
  /** Bounding box buffer for filtering cameras to route area */
  bboxBufferDegrees: 0.5,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/services/routingConfig.ts
git commit -m "refactor: trim routingConfig to visualization-only constants"
```

---

### Task 9: Trim `geo.ts` — Remove Routing-Only Functions

**Files:**
- Modify: `FlockHopper/src/utils/geo.ts`

- [ ] **Step 1: Remove routing-only functions**

Delete these functions/blocks from `geo.ts`:

- Lines 9-15: `normalizeAngle()` function
- Lines 29-35: `offsetPoint()` function
- Lines 50-102: `generateDirectionalCone()` function
- Lines 109-129: `createCircle()` function
- Lines 249-268: `calculateBearing()` function
- Lines 273-302: `nearestPointOnSegment()` function
- Lines 314-360: `findCamerasOnRoute()` function
- Lines 366-386: `isCameraFacingRoute()` function (private, but remove it)
- Lines 392-428: `parseDirection()` function
- Lines 447-469: `destinationPoint()` function
- Lines 475-496: `calculateAvoidanceWaypoint()` function

- [ ] **Step 2: Remove the `CameraOnRoute` import**

Line 1 imports `ALPRCamera` and `CameraOnRoute`. After removing `findCamerasOnRoute`, `CameraOnRoute` is no longer needed. Update to:

```typescript
import type { ALPRCamera } from '../types';
```

- [ ] **Step 3: Verify `toRadians` and `toDegrees` are still defined**

These are private helper functions (lines 433-442) used by `haversineDistance`. They must remain. Verify they're still in the file after deletions.

- [ ] **Step 4: Build check**

Run: `cd FlockHopper && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/utils/geo.ts
git commit -m "refactor: remove routing-only functions from geo.ts"
```

---

### Task 10: Clean Up Types — Remove `CameraAvoidanceConfig` and Dead Types

**Files:**
- Modify: `FlockHopper/src/types/route.ts`

- [ ] **Step 1: Remove `CameraAvoidanceConfig` interface**

Delete lines 147-195 (the `CameraAvoidanceConfig` interface and its deprecation comment from Task 2). It's no longer referenced — `routeStore` now uses `RouteOptions`.

- [ ] **Step 2: Verify no remaining references**

Run: `grep -r "CameraAvoidanceConfig" FlockHopper/src/`

If any files still reference it, update them to use `RouteOptions`.

- [ ] **Step 3: Commit**

```bash
git add src/types/route.ts
git commit -m "refactor: remove CameraAvoidanceConfig — replaced by RouteOptions"
```

---

## Chunk 4: UI Changes

### Task 11: Hide Custom Route Panel from UI

**Files:**
- Modify: `FlockHopper/src/components/panels/RoutePanelContent.tsx`
- Modify: `FlockHopper/src/components/panels/TabbedPanel.tsx`
- Modify: `FlockHopper/src/components/panels/RoutePlannerTab.tsx`

- [ ] **Step 1: Update `RoutePanelContent.tsx`**

- Remove `import { CustomRoutePanel }` (line 8)
- Remove `isCustomizing` and `enterCustomMode` from `useCustomRouteStore()` destructuring (line 50)
- Remove `useCustomRouteStore` import if nothing else is destructured from it
- Remove the `{isCustomizing && <CustomRoutePanel />}` conditional render (lines 108-109)
- Remove "Customize This Route" and "Create Custom Route" buttons (lines 486-487, 518-525)

- [ ] **Step 2: Update `TabbedPanel.tsx`**

- Remove `import { CustomRoutePanel }` (line 5)
- Remove `import { useCustomRouteStore }` or `useCustomRouteStore` usage (line 6)
- Remove `const { isCustomizing } = useCustomRouteStore()` (line 53)
- Remove the `{isCustomizing && <CustomRoutePanel />}` conditional render (lines 144-145)
- Remove `!isCustomizing &&` guard from tab navigation (line 113) — tabs should always show now

- [ ] **Step 3: Update `RoutePlannerTab.tsx`**

- Remove `useCustomRouteStore` import (line 2)
- Remove `enterCustomMode` destructuring and usage
- Remove "Customize This Route" button (lines 352-359)
- Remove "Create Custom Route" button (lines 384-393)

- [ ] **Step 4: Build check**

Run: `cd FlockHopper && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/RoutePanelContent.tsx src/components/panels/TabbedPanel.tsx src/components/panels/RoutePlannerTab.tsx
git commit -m "refactor: hide custom route panel — pending API waypoint support"
```

---

### Task 12: Disable Custom Route Rendering in Map

**Files:**
- Modify: `FlockHopper/src/components/map/MapLibreContainer.tsx`

- [ ] **Step 1: Remove custom route store usage**

This is a large file (1400+ lines). `isCustomizing` and `editMode` are referenced in many places. Remove ALL of the following:

**Imports and store access:**
- Remove `useCustomRouteStore` from imports (line 14)
- Remove the destructuring of `isCustomizing`, `editMode`, `waypoints`, `customRoute`, `addWaypoint`, `updateWaypoint` from `useCustomRouteStore()` (lines 335-342)

**All `isCustomizing` conditional blocks** (search for `isCustomizing` — approximately 12+ occurrences):
- Cursor handling effects that check `isCustomizing` (around lines 1090, 1095, 1101, 1106)
- Map click handler waypoint-adding logic gated on `isCustomizing && editMode === 'waypoint'` (around line 963)
- The `<WaypointLayer>` conditional render block (lines 1470-1478)
- Custom mode desktop indicator block (around lines 1551-1564)
- Mobile bottom bar for custom mode (around lines 1568-1640) — this entire `{isCustomizing && ...}` block
- Mode toggle button calling `setEditMode()` (lines 1591-1593)
- Any `!isCustomizing &&` guards — remove the guard but keep the inner content
- Any reference to `editMode`, `waypoints` (custom route waypoints), `customRoute`, `addWaypoint`, `updateWaypoint`

**Strategy:** Search for every occurrence of `isCustomizing`, `editMode`, `customRoute`, `addWaypoint`, `updateWaypoint` in the file. For each:
- If it's a conditional block `{isCustomizing && <JSX>}` — remove the entire block
- If it's a `!isCustomizing &&` guard around other content — remove the guard, keep the content
- If it's in an effect dependency array — remove it from the array
- If it's in a click handler — simplify the handler to remove the custom route branch

Leave ALL camera marker, cluster, cone, density layer, and route line rendering code untouched.

- [ ] **Step 2: Build check**

Run: `cd FlockHopper && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/components/map/MapLibreContainer.tsx
git commit -m "refactor: remove custom route rendering from map"
```

---

## Chunk 5: Final Verification

### Task 13: Full Build and Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run: `cd FlockHopper && npx tsc --noEmit`

Expected: No errors. If there are errors, fix them — likely stale imports of deleted modules or renamed fields.

- [ ] **Step 2: Full Vite build**

Run: `cd FlockHopper && npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Lint check**

Run: `cd FlockHopper && npm run lint`

Expected: No new lint errors. There may be warnings about unused imports — fix those.

- [ ] **Step 4: Dev server smoke test**

Run: `cd FlockHopper && npm run dev`

Open `http://localhost:3000`. Verify:
1. Landing page loads
2. Map page loads with camera markers
3. Enter origin and destination → routes calculate (calls API)
4. Route comparison panel shows normal vs avoidance route
5. No "Customize Route" buttons visible
6. Camera distance slider and directional zones toggle still work

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve remaining type/lint issues from API cleanup"
```

---

### Task 14: Update CLAUDE.md

**Files:**
- Modify: `FlockHopper/CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md to reflect the new architecture**

Key changes:
- Under "Key Data Flow" section 2 (Route Calculation): Replace the client-side routing description with "Calls `api.dontgetflocked.com/api/v1/route` via `src/services/apiClient.ts`"
- Under "Critical Files": Remove `cameraAwareRouting.ts` and `graphHopperService.ts`, add `apiClient.ts`
- Under "Configuration": Replace `VITE_GRAPHHOPPER_ENDPOINT` with `VITE_API_URL`
- Under "Important Patterns > Camera Avoidance Strategy": Note this is now handled by the API
- Remove "GraphHopper routing server (required for route calculation)" from Commands section

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect API-based architecture"
```
