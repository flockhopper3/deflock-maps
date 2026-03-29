# DeFlock Blue Theme Rebrand

## Overview

Rebrand all FlockHopper red UI and camera colors to DeFlock blue (`#0080bc`), using a direct find-and-replace approach with a defined shade mapping.

## Scope

**In scope:**
- Camera markers, clusters, cones, pulse/glow animations
- UI accent colors (primary, destructive, focus rings, CSS variables)
- Default dot density color
- Any Tailwind red classes used for brand/camera purposes

**Out of scope:**
- Heatmap color schemes (`colorSchemes.ts`)
- Density layer ramps (`DensityLayers.tsx`)
- Route colors (blue `#3b82f6` / orange `#f97316`)
- Network agency colors
- Dark theme backgrounds
- Green, amber, purple, cyan accents
- Error-state reds that are semantically "error" not "brand"

## Color Mapping

| Role | FlockHopper (Red) | DeFlock (Blue) | Notes |
|------|-------------------|----------------|-------|
| Primary brand | `#dc2626` | `#0080bc` | Main camera color, CSS `--primary`, Tailwind `primary` |
| Bright accent | `#ef4444` | `#0ea5e9` | Camera glow, small clusters, cone fill |
| Light accent | `#f87171` | `#38bdf8` | `accent.danger`, pulse animations |
| Stroke/outline | `#fca5a5` | `#7dd3fc` | Camera marker strokes |
| Dark cluster | `#b91c1c` | `#0369a1` | Medium-large clusters |
| Darkest cluster | `#991b1b` | `#075985` | Largest clusters |
| Very dark | `#7f1d1d` | `#0c4a6e` | Deepest accent shade |

RGBA equivalents (for CSS animations/glows):
- `rgba(220, 38, 38, *)` → `rgba(0, 128, 188, *)`
- `rgba(248, 113, 113, *)` → `rgba(56, 189, 248, *)`
- `rgba(239, 68, 68, *)` → `rgba(14, 165, 233, *)`

## Files to Change

### 1. `src/index.css`
- CSS variables: `--primary`, `--accent`, `--destructive`, `--ring` → `#0080bc`
- `.camera-pulse-ring` background → `#0080bc`
- `.camera-glow-outer` background → `#0080bc`
- `.camera-core` background, border, box-shadow → blue equivalents
- `.rec-indicator` rgba values → blue
- `.glow-red` rgba values → blue (rename to `.glow-blue`)
- `.animate-pulse-red` rgba values → blue (rename to `.animate-pulse-blue`)
- Leaflet tooltip border → blue rgba
- Scan line gradient → blue rgba

### 2. `tailwind.config.js`
- `accent.danger`: `#f87171` → `#38bdf8`
- `accent.DEFAULT`: `#dc2626` → `#0080bc`
- `primary`: `#dc2626` → `#0080bc`
- `destructive`: `#dc2626` → `#0080bc`
- `ring`: `#dc2626` → `#0080bc`

### 3. `src/components/map/MapLibreContainer.tsx`
- Cluster `circle-color` steps: 4 red shades → 4 blue shades
- Cluster `circle-stroke-color`: `#fca5a5` → `#7dd3fc`
- Unclustered point `circle-color`: `#dc2626` → `#0080bc`
- Unclustered stroke: `#fca5a5` → `#7dd3fc`
- Unclustered glow: `#ef4444` → `#0ea5e9`
- Direction cone fill: `#ef4444` → `#0ea5e9`
- Direction cone outline: `#dc2626` → `#0080bc`

### 4. `src/modes/dots/DotDensityControls.tsx`
- Default dot color in palette: `#ef4444` → `#0ea5e9`

### 5. Components with red Tailwind classes (brand usage only)
- `text-red-*` → `text-sky-*` (where used for camera/brand, not errors)
- `bg-red-*` → `bg-sky-*`
- `border-red-*` → `border-sky-*`
- Grep for `red-` in components and evaluate each usage

### 6. CSS class renames
- `.glow-red` → `.glow-blue` (update all references)
- `.animate-pulse-red` → `.animate-pulse-blue` (update all references)

## Approach

Direct find-and-replace using the color mapping table. Each file is updated systematically:
1. Config files first (Tailwind, CSS variables)
2. Map rendering (MapLibreContainer)
3. Mode-specific files (dots)
4. Component Tailwind classes (grep and evaluate each)
5. CSS animation class renames

## Verification

- `npm run build` must pass
- Visual check: camera markers, clusters, cones, pulse animations should all be blue
- UI elements (buttons, focus rings) should use DeFlock blue
- Heatmaps, density layers, routes, network colors should be unchanged
