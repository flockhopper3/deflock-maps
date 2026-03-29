# Map Panel Stats Dashboard — Design Spec

**Date:** 2026-03-28
**Scope:** MapPanel component — add live viewport statistics above existing Layers/Filters sections

## Problem

The Map tab left panel is visually sparse. It opens with collapsed accordions (Layers, Filters, Heatmap Settings) and a camera count footer — mostly empty space. Users get no data narrative from the panel itself; all insight requires interacting with the map.

## Design

### Panel Layout (top to bottom)

1. **Header** — Title + tagline with data attribution
2. **Hero Card** — Live "cameras in view" count (viewport-reactive)
3. **Brands in View** — Horizontal bar chart breakdown (viewport-reactive)
4. **Layers** — Existing collapsible section (unchanged)
5. **Filters** — Existing collapsible section (unchanged)
6. **Heatmap Settings** — Existing conditional section (unchanged)
7. **Footer** — OSM attribution + total US camera count

### Header

- Title: "DeFlock Maps"
- Subtitle: "Crowdsourced ALPR surveillance map. Data from DeFlock & OSM contributors."
- DeFlock and OSM are accent-colored links (`deflock.me` and `openstreetmap.org`)
- Replaces the current "Map" title and shorter attribution text

### Hero Card

- Centered large number (accent color, ~40px font weight 700)
- Glowing dot indicator (8px accent circle with box-shadow) to the left of the number
- Label below: "CAMERAS IN VIEW" (uppercase, letter-spaced, muted color)
- Card background: subtle accent gradient (`linear-gradient` from `accent/10` to `accent/03`)
- Card border: `1px solid accent/15`, `rounded-xl`
- **Data source:** `getCamerasInBounds()` from `cameraStore` spatial grid, using current map bounds from `mapStore`
- **Updates on:** map `moveend` events (same mechanism as existing `CameraStats` overlay in top-right)

### Brands in View

- Section header: "BRANDS IN VIEW" (uppercase label) with "X brands" count on the right
- Horizontal bar chart listing brands sorted by count (descending)
- Each row: brand name (left), count (right, tabular-nums), gradient progress bar below
- Bar width proportional to the largest brand count (largest = 100% width)
- Top 4-5 brands shown individually, remainder grouped as "Other" with summed count
- Each brand bar uses a distinct gradient color:
  - 1st: cyan (`#38bdf8` → `#0ea5e9`)
  - 2nd: purple (`#a78bfa` → `#8b5cf6`)
  - 3rd: pink (`#f472b6` → `#ec4899`)
  - 4th: amber (`#fbbf24` → `#f59e0b`)
  - Other: slate (`#94a3b8` → `#64748b`)
- **Data source:** Computed from the same `getCamerasInBounds()` result — group by `camera.brand`, count each, sort descending
- Cameras with no brand value are excluded from the breakdown (not shown as "Unknown")
- **Updates on:** same map `moveend` events as the hero card

### Existing Sections

Layers, Filters, and Heatmap Settings sections are unchanged in behavior and content. They sit below the stats sections, separated by a divider.

### Footer

- Left: "Data from OpenStreetMap"
- Right: total US camera count (e.g. "84,666 total US") — this is the static full-dataset count, providing context against the dynamic "in view" number
- Replaces the current footer which showed filtered/total count

## Implementation Notes

### Performance

- The hero card and brands chart share the same viewport camera set — compute once per `moveend`, not separately
- Use `getCamerasInBounds()` or `getCamerasInBoundsFromGrid()` which leverages the 0.5° spatial grid for O(1) lookups
- Brand aggregation is a simple `reduce` over the viewport set — negligible cost even for 10k+ cameras
- Consider debouncing `moveend` updates (100-200ms) to avoid jank during rapid panning

### State

No new Zustand stores needed. The viewport stats can be computed as local state within `MapPanelContent` using existing store subscriptions:

- `useMapStore` for `bounds`
- `useCameraStore` for `getCamerasInBoundsFromGrid()` and `cameras.length` (total)

### Component Structure

```
MapPanel (wrapper — desktop sidebar / mobile bottom sheet)
└── MapPanelContent
    ├── Header (static)
    ├── HeroCard (viewport-reactive)
    ├── BrandsInView (viewport-reactive)
    ├── Section: Layers (existing, unchanged)
    ├── Section: Filters (existing, unchanged)
    ├── Section: Heatmap Settings (existing, conditional)
    └── Footer (static total)
```

`HeroCard` and `BrandsInView` can be inline within `MapPanelContent` or extracted as small components — no need for separate files given their simplicity.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/panels/MapPanel.tsx` | Add hero card and brands chart above existing sections. Update header text. Update footer to show total US count. Subscribe to map bounds for viewport stats. |

## Out of Scope

- Other panels (Route, Explore, Density, Network) — unchanged
- Mobile MobileTabDrawer — unchanged (uses same MapPanelContent)
- CameraStats overlay (top-right) — may become redundant with hero card but not removed in this change
- Adding new store state — viewport stats computed locally
