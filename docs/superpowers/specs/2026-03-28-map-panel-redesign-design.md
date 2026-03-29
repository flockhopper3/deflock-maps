# Map Panel Redesign — Design Spec

**Date:** 2026-03-28
**Scope:** MapPanel component (Map mode sidebar), mapModeStore, cameraStore filter logic

## Problem

The current MapPanel has a flat, unorganized layout. Filter lists are capped at 160px and feel janky because every checkbox toggle immediately re-filters 60K+ cameras. The clusters-vs-heatmap toggle is too limited — users can't view individual unclustered cameras or get automatic zoom-based transitions.

## Design

### Panel Layout

Three collapsible sections in this order:

1. **Layers** — camera view selection + overlay toggles (expanded by default)
2. **Filters** — brand, operator, surveillance zone, mount type (collapsed by default)
3. **Heatmap Settings** — color scheme, intensity, radius, opacity, legend (auto-shows only when heatmap is the active view)

Footer shows camera count (filtered/total when filters active).

### Camera View (Radio Selection)

Four mutually exclusive options:

| Option | Behavior |
|--------|----------|
| **Auto** (default) | Zoom-based transitions between heatmap/clusters/individual |
| **Heatmap** | Locked to heatmap regardless of zoom |
| **Clusters** | Locked to clustered markers regardless of zoom |
| **Individual** | Locked to unclustered individual camera points regardless of zoom |

Only one can be active at a time. Selecting any manual option overrides Auto. Selecting Auto re-enables zoom-based transitions.

### Auto Mode Zoom Thresholds

| Zoom Level | Active View | Reasoning |
|------------|-------------|-----------|
| < 9 | Heatmap | National/regional — too many points for clusters |
| 9 – 12 | Clusters | City/metro — clusters readable and useful |
| 13+ | Individual | Street level — exact positions + direction cones |

Transitions are instant (no crossfade). When Auto is selected, a parenthetical label shows the current computed view: `Auto (Heatmap)`.

Switching from a manual mode back to Auto immediately applies whatever the current zoom level dictates.

### Overlay Toggles

Independent toggle switches (not mutually exclusive):

- State boundaries
- County boundaries
- Police stations

These live in the Layers section below the Camera View radio group, under an "Overlays" sub-label.

### Staged Filter Pattern

**Current behavior (removed):** Every checkbox toggle immediately calls `setFilters()` and re-filters 60K+ cameras.

**New behavior:** Selections are staged as pending state. Filtering only runs when the user clicks "Apply Filters."

#### UI Structure

```
▼ Filters                         (N applied)
  ▼ Brand
    [search brands...              ]
    ┌──────────────────────────────┐
    │ ☑ Flock Safety               │  scrollable, max-h-60 (240px)
    │ ☑ Motorola Solutions         │
    │ ☐ Genetec                    │
    │ ...                          │
    └──────────────────────────────┘
  ▶ Operator                       (0)
  ▶ Surveillance Zone              (0)
  ▶ Mount Type                     (0)

  [ Reset ]  [ Apply (N) ]
```

- Filter sub-categories are individually collapsible
- Search within each category is preserved
- Scrollable lists use `max-h-60` (240px) instead of current `max-h-40` (160px)
- **Apply button** shows count of pending (unapplied) changes; disabled when no pending changes
- **Reset button** clears both pending and applied filters
- Section header badge shows count of *applied* filters, not pending
- Pending selections are visually distinct from applied (lighter highlight)

### Heatmap Settings Section

Visible only when the active view is `heatmap` (either via Auto at low zoom, or manual Heatmap selection). Contains existing controls:

- Color scheme selector (6 presets: neon, thermal, inferno, classic, plasma, viridis)
- Intensity slider (0.1 – 3.0)
- Radius slider (1 – 80px)
- Opacity slider (0.1 – 1.0)
- Heatmap legend (gradient bar, Low → High)

No changes to heatmap control functionality — only relocated within the panel hierarchy.

## State Management Changes

### mapModeStore

```typescript
// Current
visualization: 'clusters' | 'heatmap'

// New
visualization: 'auto' | 'heatmap' | 'clusters' | 'individual'  // user selection (default: 'auto')
activeView: 'heatmap' | 'clusters' | 'individual'               // computed view (derived from zoom when auto)
setVisualization(viz)    // sets visualization + computes activeView
setActiveView(view)      // called by zoom listener in auto mode
```

When `visualization === 'auto'`, a map zoom listener computes `activeView` from zoom thresholds. When manual, `activeView` mirrors `visualization`.

### cameraStore

```typescript
// New additions
pendingFilters: { brands: string[]; operators: string[]; surveillanceZones: string[]; mountTypes: string[] }
setPendingFilter(key, values)   // updates pending state (cheap, no re-filter)
applyFilters()                  // copies pendingFilters → filters, triggers spatial re-filter
resetFilters()                  // clears both pending and active filters
```

Existing `filters` and `setFilters` remain for the actual applied state. `filteredCameras` recomputation only triggers on `applyFilters()`.

### MapLibreContainer

- Reads `activeView` instead of `visualization`
- When `visualization === 'auto'`: registers a `zoomend` listener that updates `activeView` based on thresholds
- When manual: removes the zoom listener; `activeView` = `visualization`
- `CameraMarkerLayers` receives a `clustered` prop: `true` for clusters mode, `false` for individual mode (controls the `cluster` property on the GeoJSON source)
- `HeatmapLayers` visibility tied to `activeView === 'heatmap'`

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/panels/MapPanel.tsx` | Full rewrite — new section layout, radio camera view, staged filters, collapsible sections |
| `src/store/mapModeStore.ts` | Add `'auto'` and `'individual'` to visualization, add `activeView` computed state |
| `src/store/cameraStore.ts` | Add `pendingFilters`, `setPendingFilter`, `applyFilters`, `resetFilters` |
| `src/components/map/MapLibreContainer.tsx` | Read `activeView`, add zoom listener for auto mode, pass `clustered` prop to CameraMarkerLayers |
| `src/components/map/layers/CameraMarkerLayers.tsx` | Accept `clustered` prop, conditionally set `cluster={clustered}` on GeoJSON source. Note: changing `cluster` on a live MapLibre source requires unmounting/remounting the `<Source>` — use a `key` prop tied to the clustered state to force re-creation. |

## Out of Scope

- ExplorePanel, DensityPanel, NetworkPanel — unchanged
- Mobile MobileTabDrawer — separate effort
- Heatmap control functionality — unchanged, only relocated
- Route mode panels — unchanged
