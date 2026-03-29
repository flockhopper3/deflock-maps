# FlockHopper Frontend API Cleanup Design

## Goal

Strip all client-side routing logic from the FlockHopper frontend. Replace with a clean API client that calls the FlockHopper API at `api.dontgetflocked.com`. Keep camera data bundled for map visualization. Disable custom route feature until the API supports waypoints.

## Context

The routing algorithm has been consolidated into a standalone Express.js API (API V2) hosted on Hetzner. The frontend currently duplicates all routing logic client-side: camera-aware routing orchestration, GraphHopper integration, zone generation, bounding box filtering, route scoring, and iterative waypoint avoidance. This duplication is unnecessary now that the API handles everything.

## Approach

Single API service module (Approach A). One `apiClient.ts` file wraps all API calls. Minimal new code, no over-abstraction.

---

## Section 1: Files to Delete

| File | Lines | Reason |
|------|-------|--------|
| `src/services/cameraAwareRouting.ts` | ~593 | Entire 3-tier routing pipeline — now in API |
| `src/services/graphHopperService.ts` | ~728 | Direct GraphHopper HTTP client — API handles this |
| `src/utils/routeScoring.ts` | - | API returns scoring/comparison data |

Total: ~1,300+ lines of client-side routing logic removed.

## Section 2: New API Client

Create `src/services/apiClient.ts`:

- Reads `VITE_API_URL` from environment (`import.meta.env.VITE_API_URL`)
- Falls back to `https://api.dontgetflocked.com` if `VITE_API_URL` is not set, with a console warning in development
- Exports `calculateRoute(origin, destination, options?)` that POSTs to `/api/v1/route` with `format: 'full'`
- Returns typed response matching API's `CameraAwareRouteResult` + `ImprovementMetrics`
- Handles errors with user-friendly messages:
  - 400: Surface the API's error message directly (covers route-too-long/300-mile limit, bad costing, validation errors)
  - 502/503: "Routing service is temporarily unavailable. Please try again." (503 is defensive — API currently only returns 502 for GraphHopper down)
  - Network error: "Unable to reach the routing server. Check your connection."
- No retry logic, no caching — just a typed fetch wrapper

### Request Shape

```typescript
interface RouteRequest {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  format: 'full';
  costing?: 'auto' | 'bicycle' | 'pedestrian';
  cameraDistanceMeters?: number;
  useDirectionalZones?: boolean;
}
```

### Response Shape (format='full')

```typescript
interface RouteResponse {
  ok: true;
  result: {
    normalRoute: CameraAwareRouteResult;
    avoidanceRoute: CameraAwareRouteResult;
    improvement: ImprovementMetrics;
    poiMetrics?: POIMetrics;
  };
}

interface ImprovementMetrics {
  camerasAvoided: number;
  cameraReductionPercent: number;
  distanceIncrease: number;
  distanceIncreasePercent: number;
  durationIncrease: number;
  durationIncreasePercent: number;
  penaltyReduction: number;
}

interface POIMetrics {
  poisInArea: number;
  poisOnNormalRoute: number;
  poisOnAvoidanceRoute: number;
  poisAvoided: number;
}
```

### Error Shape

```typescript
interface RouteErrorResponse {
  ok: false;
  error: string;
}
```

## Section 3: Store Changes

### `routeStore.ts` — Replace `calculateRoutes` action

**Before:** Takes `cameras: ALPRCamera[]`, calls `calculateCameraAwareRoute()` which does bbox filtering, zone generation, GraphHopper calls, scoring — all client-side. Imports `DEFAULT_AVOIDANCE_CONFIG` from `cameraAwareRouting.ts`.

**After:** Takes no camera arg, calls `apiClient.calculateRoute(origin, destination, options)`, maps the API response to existing store state shape (`normalRoute`, `avoidanceRoute`, `comparison`, etc.). Passes `cameraDistanceMeters`, `costing`, and `useDirectionalZones` from store config to the API request.

**`DEFAULT_AVOIDANCE_CONFIG` migration:** Move the default config inline into `routeStore.ts` (or into `routingConfig.ts` alongside the other kept constants). Strip it down to only the fields the API accepts:

```typescript
const DEFAULT_ROUTE_OPTIONS = {
  cameraDistanceMeters: 75,
  costing: 'auto' as const,
  useDirectionalZones: true,
};
```

**Dead UI controls:** Remove `avoidanceWeight` and `maxDetourPercent` sliders from `RoutePlannerTab.tsx` — the API does not accept these parameters and they would silently do nothing. Also remove:
- `setAvoidanceWeight` and `setMaxDetour` action signatures from the `RouteState` interface in `routeStore.ts`
- Their implementations in the store
- The destructured imports of `setAvoidanceWeight` and `setMaxDetour` from `useRouteStore()` in `RoutePlannerTab.tsx`
- Corresponding state fields from the store's `avoidanceConfig`

**Slim down `CameraAvoidanceConfig` type** in `src/types/route.ts` to only API-supported fields:

```typescript
interface RouteOptions {
  cameraDistanceMeters: number;
  costing: 'auto' | 'bicycle' | 'pedestrian';
  useDirectionalZones: boolean;
}
```

Remove stale fields: `avoidanceWeight`, `maxDetourPercent`, `maxIterations`, `useIterativeWaypoints`, `bboxBufferDegrees`.

### `customRouteStore.ts` — Disable routing action

- `recalculateRoute()` becomes a no-op that sets an error: "Custom routing coming soon"
- All UI state management (waypoints, undo, etc.) stays intact for future API waypoint support
- Remove import of `calculateAvoidanceRouteWithWaypoints` from `graphHopperService`
- Remove import of `ZONE_SAFETY_MULTIPLIERS` from `routingConfig`
- Remove import of `findCamerasOnRoute` from `geo.ts`
- Keep import of `haversineDistance` from `geo.ts` — still used by `distanceToSegment()` in `addWaypoint` logic
- Remove import of `useRouteStore` from `routeStore` (dead after no-op change)
- Remove all bbox filtering and camera detection logic from `recalculateRoute` body

## Section 4: Cleanup `geo.ts`

### Keep (used by map visualization)

| Function | Used By |
|----------|---------|
| `haversineDistance()` | ZipSearch, cameraStore |
| `buildSpatialGrid()` | cameraStore |
| `getCamerasInBoundsFromGrid()` | cameraStore |
| `clearSpatialGridCache()` | cameraStore |
| `formatDistance()` | 6+ panel components |
| `formatDuration()` | 6+ panel components |
| `toRadians()` / `toDegrees()` | Used by haversineDistance and buildSpatialGrid |

### Remove (routing-only)

| Function | Reason |
|----------|--------|
| `generateDirectionalCone()` | Only used by graphHopperService (deleted) |
| `createCircle()` | Only used by graphHopperService (deleted) |
| `findCamerasOnRoute()` | Routing analysis — API does this |
| `isCameraFacingRoute()` | Helper for findCamerasOnRoute |
| `calculateAvoidanceWaypoint()` | Waypoint routing — API does this |
| `nearestPointOnSegment()` | Only used by routing functions |
| `destinationPoint()` | Only used by zone/waypoint generation |
| `parseDirection()` | Only used by routing functions |
| `normalizeAngle()` | Only used by generateDirectionalCone (deleted) |
| `calculateBearing()` | Only called by cameraAwareRouting and isCameraFacingRoute (both deleted) |

## Section 5: Cleanup `routingConfig.ts`

### Keep (used by `MapLibreContainer.tsx` for cone rendering)

- `DIRECTIONAL_ZONE` (cone FOV, arc segments)
- `CAMERA_DETECTION` (base radius)
- `ZONE_SAFETY_MULTIPLIERS` (block/penalty multipliers)

### Remove

- `GRAPHHOPPER_AVOIDANCE`
- `GRADUATED_PENALTIES`
- `WAYPOINT_AVOIDANCE`
- `ROUTE_SCORING`
- `DETOUR_LIMITS`
- `ROUTE_LIMITS`
- `ROAD_CLASS_PENALTIES`
- `ROUTING_DEBUG`
- `DEFAULT_AVOIDANCE_CONFIG` (moved inline to routeStore — see Section 3)

## Section 6: UI Changes

### Hide Custom Route Panel

- `RoutePanelContent.tsx` — remove `CustomRoutePanel` rendering and its import
- `TabbedPanel.tsx` — remove `CustomRoutePanel` rendering and its import
- `MapLibreContainer.tsx` — remove the `useCustomRouteStore` import and any conditional rendering/source/layer code that draws the custom route polyline. Leave all camera marker, cluster, cone, and density layer code untouched.

### Remove dead settings controls

- `RoutePlannerTab.tsx` — remove `avoidanceWeight` slider and `maxDetourPercent` slider

### Update barrel exports

- `src/services/index.ts` — remove re-exports of `cameraAwareRouting` and `graphHopperService`, add re-export of `apiClient`
- `src/utils/index.ts` — remove `export * from './routeScoring'`

## Section 7: Environment Config

### `.env.example` update

```
VITE_API_URL=https://api.dontgetflocked.com
VITE_TILES_URL=https://tiles.dontgetflocked.com
VITE_LOCATIONIQ_KEY=<optional>
VITE_PERF_LOGGING=false
```

Remove: `VITE_GRAPHHOPPER_ENDPOINT` (no longer used)

### `.env` for local dev

```
VITE_API_URL=https://api.dontgetflocked.com
VITE_TILES_URL=https://tiles.dontgetflocked.com
VITE_PERF_LOGGING=false
```

Local dev points at prod API (no local API needed).

### Cloudflare Pages dashboard

Set `VITE_API_URL=https://api.dontgetflocked.com` in environment variables.

### Fallback behavior

If `VITE_API_URL` is not set, `apiClient.ts` falls back to `https://api.dontgetflocked.com` and logs a console warning in development mode.

## Section 8: Types Cleanup

- Keep `src/types/route.ts` — add/align types to match API response shape
- Add `ImprovementMetrics` and `POIMetrics` interfaces matching the API
- Replace `CameraAvoidanceConfig` with slimmed-down `RouteOptions` (only API-supported fields)
- Remove types only used by deleted routing pipeline: `GraphHopperRequest`, `GraphHopperResponse`, `GraphHopperCustomModel`, zone-generation types, `CameraZone`, `ZoneGenerationOptions`
- Keep all types used by UI components: `Route`, `Location`, `Maneuver`, `CameraOnRoute`, `CameraAwareRouteResult`, etc.

## Out of Scope

- Migrating camera data to Cloudflare R2 (future work)
- Adding waypoint support to the API (future work — custom route feature re-enabled then)
- Migrating the API itself to Cloudflare Workers
- Changes to geocoding (LocationIQ/Photon) — stays as-is
- Changes to map visualization, density modes, game mode
