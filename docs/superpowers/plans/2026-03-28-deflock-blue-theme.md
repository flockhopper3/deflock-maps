# DeFlock Blue Theme Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all FlockHopper red brand colors with DeFlock blue (`#0080bc`) across camera markers, UI accents, and animations.

**Architecture:** Direct find-and-replace using a shade mapping table. Red hex values and rgba equivalents are swapped for corresponding blue shades. CSS animation classes are renamed from `*-red` to `*-blue`.

**Tech Stack:** CSS, Tailwind config, React/TypeScript components, MapLibre GL

---

## Color Mapping Reference

| Role | Old (Red) | New (Blue) |
|------|-----------|------------|
| Primary brand | `#dc2626` / `rgba(220, 38, 38, *)` | `#0080bc` / `rgba(0, 128, 188, *)` |
| Bright accent | `#ef4444` / `rgba(239, 68, 68, *)` | `#0ea5e9` / `rgba(14, 165, 233, *)` |
| Light accent | `#f87171` / `rgba(248, 113, 113, *)` | `#38bdf8` / `rgba(56, 189, 248, *)` |
| Stroke/outline | `#fca5a5` | `#7dd3fc` |
| Dark shade | `#b91c1c` | `#0369a1` |
| Darkest shade | `#991b1b` | `#075985` |
| Very dark | `#7f1d1d` | `#0c4a6e` |

---

### Task 1: Update Tailwind Config Colors

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Update accent and theme colors**

In `tailwind.config.js`, replace:

```js
accent: {
  primary: '#818cf8',    // Brighter Indigo
  secondary: '#22d3ee',  // Cyan
  danger: '#f87171',     // Brighter Red for cameras
  success: '#4ade80',    // Brighter Green for avoidance
  warning: '#fbbf24',    // Brighter Amber
  DEFAULT: '#dc2626',    // Red accent
},
```

With:

```js
accent: {
  primary: '#818cf8',    // Brighter Indigo
  secondary: '#22d3ee',  // Cyan
  danger: '#38bdf8',     // DeFlock Blue (light) for cameras
  success: '#4ade80',    // Brighter Green for avoidance
  warning: '#fbbf24',    // Brighter Amber
  DEFAULT: '#0080bc',    // DeFlock Blue accent
},
```

- [ ] **Step 2: Update primary, destructive, and ring**

In the same file, replace:

```js
primary: {
  DEFAULT: '#dc2626',
  foreground: '#fafafa',
},
```

With:

```js
primary: {
  DEFAULT: '#0080bc',
  foreground: '#fafafa',
},
```

Replace:

```js
destructive: {
  DEFAULT: '#dc2626',
  foreground: '#fafafa',
},
```

With:

```js
destructive: {
  DEFAULT: '#0080bc',
  foreground: '#fafafa',
},
```

Replace:

```js
ring: '#dc2626',
```

With:

```js
ring: '#0080bc',
```

- [ ] **Step 3: Rename pulse-red animation to pulse-blue**

In the `animation` object, replace:

```js
'pulse-red': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
```

With:

```js
'pulse-blue': 'pulse-blue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
```

In the `keyframes` object, replace:

```js
'pulse-red': {
  '0%, 100%': { opacity: '1' },
  '50%': { opacity: '0.5' },
},
```

With:

```js
'pulse-blue': {
  '0%, 100%': { opacity: '1' },
  '50%': { opacity: '0.5' },
},
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: rebrand Tailwind config from red to DeFlock blue"
```

---

### Task 2: Update CSS Variables and Animations

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update CSS custom properties**

Replace the `:root` variables (lines 16, 22, 24, 28):

```css
--primary: #dc2626;
```
→ `--primary: #0080bc;`

```css
--accent: #dc2626;
```
→ `--accent: #0080bc;`

```css
--destructive: #dc2626;
```
→ `--destructive: #0080bc;`

```css
--ring: #dc2626;
```
→ `--ring: #0080bc;`

- [ ] **Step 2: Update camera marker colors**

Replace `.camera-pulse-ring` background (line 140):
```css
background: #dc2626;
```
→ `background: #0080bc;`

Replace `.camera-glow-outer` background (line 163):
```css
background: #dc2626;
```
→ `background: #0080bc;`

Replace `.camera-core` (lines 172-176):
```css
background: #dc2626;
border: 1.5px solid #fca5a5;
box-shadow: 0 0 4px 1px rgba(220, 38, 38, 0.5);
```
→
```css
background: #0080bc;
border: 1.5px solid #7dd3fc;
box-shadow: 0 0 4px 1px rgba(0, 128, 188, 0.5);
```

- [ ] **Step 3: Update Leaflet tooltip border**

Replace (line 235):
```css
border: 1px solid rgba(220, 38, 38, 0.3) !important;
```
→
```css
border: 1px solid rgba(0, 128, 188, 0.3) !important;
```

- [ ] **Step 4: Update rec-blink animation**

Replace the `rec-blink` keyframes (lines 250-256):
```css
@keyframes rec-blink {
  0%, 100% {
    opacity: 0.4;
    box-shadow: 0 0 4px 1px rgba(248, 113, 113, 0.3);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 12px 4px rgba(248, 113, 113, 0.6);
  }
}
```
→
```css
@keyframes rec-blink {
  0%, 100% {
    opacity: 0.4;
    box-shadow: 0 0 4px 1px rgba(56, 189, 248, 0.3);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 12px 4px rgba(56, 189, 248, 0.6);
  }
}
```

- [ ] **Step 5: Rename glow-red to glow-blue and update colors**

Replace (lines 263-282):
```css
/* Custom glowing red animations for surveillance theme */
@keyframes glow-red {
  0%, 100% {
    box-shadow:
      0 0 15px rgba(220, 38, 38, 0.4),
      0 0 30px rgba(220, 38, 38, 0.2);
    border-color: rgba(220, 38, 38, 0.3);
  }
  50% {
    box-shadow:
      0 0 25px rgba(220, 38, 38, 0.6),
      0 0 50px rgba(220, 38, 38, 0.3);
    border-color: rgba(220, 38, 38, 0.6);
  }
}

.glow-red {
  animation: glow-red 2s ease-in-out infinite;
  will-change: box-shadow, border-color;
}
```
→
```css
/* Custom glowing blue animations for DeFlock theme */
@keyframes glow-blue {
  0%, 100% {
    box-shadow:
      0 0 15px rgba(0, 128, 188, 0.4),
      0 0 30px rgba(0, 128, 188, 0.2);
    border-color: rgba(0, 128, 188, 0.3);
  }
  50% {
    box-shadow:
      0 0 25px rgba(0, 128, 188, 0.6),
      0 0 50px rgba(0, 128, 188, 0.3);
    border-color: rgba(0, 128, 188, 0.6);
  }
}

.glow-blue {
  animation: glow-blue 2s ease-in-out infinite;
  will-change: box-shadow, border-color;
}
```

- [ ] **Step 6: Rename pulse-red to pulse-blue and update colors**

Replace (lines 284-298):
```css
/* Pulsing red dot animation - REC light effect */
@keyframes pulse-red {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 0 8px 2px rgba(220, 38, 38, 0.5);
  }
}

.animate-pulse-red {
  animation: pulse-red 1.5s ease-in-out infinite;
}
```
→
```css
/* Pulsing blue dot animation - DeFlock indicator effect */
@keyframes pulse-blue {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 128, 188, 0.7);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 0 8px 2px rgba(0, 128, 188, 0.5);
  }
}

.animate-pulse-blue {
  animation: pulse-blue 1.5s ease-in-out infinite;
}
```

- [ ] **Step 7: Update scan line gradient**

Replace (line 710-713):
```css
background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(220, 38, 38, 0.1) 50%,
    transparent 100%
  );
```
→
```css
background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 128, 188, 0.1) 50%,
    transparent 100%
  );
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/index.css
git commit -m "feat: rebrand CSS variables and animations to DeFlock blue"
```

---

### Task 3: Update MapLibre Camera Layers

**Files:**
- Modify: `src/components/map/MapLibreContainer.tsx`

- [ ] **Step 1: Update cluster circle colors**

Find the cluster layer paint with stepped circle-color (around line 174):
```ts
'#ef4444', // Red for small clusters
5,
'#dc2626', // Darker red for medium
20,
'#b91c1c', // Even darker for large
50,
'#991b1b', // Darkest for huge
```
→
```ts
'#0ea5e9', // Blue for small clusters
5,
'#0080bc', // Darker blue for medium
20,
'#0369a1', // Even darker for large
50,
'#075985', // Darkest for huge
```

- [ ] **Step 2: Update cluster stroke color**

```ts
'circle-stroke-color': '#fca5a5',
```
→
```ts
'circle-stroke-color': '#7dd3fc',
```

- [ ] **Step 3: Update unclustered camera point**

```ts
'circle-color': '#dc2626',
```
→
```ts
'circle-color': '#0080bc',
```

And its stroke:
```ts
'circle-stroke-color': '#fca5a5',
```
→
```ts
'circle-stroke-color': '#7dd3fc',
```

- [ ] **Step 4: Update unclustered glow layer**

```ts
'circle-color': '#ef4444',
```
→
```ts
'circle-color': '#0ea5e9',
```

- [ ] **Step 5: Update direction cone colors**

Cone fill:
```ts
'fill-color': '#ef4444',
```
→
```ts
'fill-color': '#0ea5e9',
```

Cone outline:
```ts
'line-color': '#dc2626',
```
→
```ts
'line-color': '#0080bc',
```

- [ ] **Step 6: Update remaining camera circle colors in JSX**

There are several more `'circle-color': '#ef4444'` instances in the JSX return section (around lines 1222, 1236, 1331, 1371). Replace all of them:

```ts
'circle-color': '#ef4444',
```
→
```ts
'circle-color': '#0ea5e9',
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/map/MapLibreContainer.tsx
git commit -m "feat: rebrand map camera layers to DeFlock blue"
```

---

### Task 4: Update Dot Density Default Color

**Files:**
- Modify: `src/modes/dots/DotDensityControls.tsx`
- Modify: `src/store/appModeStore.ts`

- [ ] **Step 1: Update dot color palette default**

In `src/modes/dots/DotDensityControls.tsx`, replace the first entry in `DOT_COLORS`:
```ts
{ id: '#ef4444', name: 'Red', preview: '#ef4444' },
```
→
```ts
{ id: '#0ea5e9', name: 'Blue', preview: '#0ea5e9' },
```

- [ ] **Step 2: Update store default**

In `src/store/appModeStore.ts` line 66, replace:
```ts
color: '#ef4444',
```
→
```ts
color: '#0ea5e9',
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/modes/dots/DotDensityControls.tsx src/store/appModeStore.ts
git commit -m "feat: rebrand dot density default color to DeFlock blue"
```

---

### Task 5: Update Component Tailwind Classes (Brand Red → Blue)

**Files:**
- Modify: `src/components/panels/RouteCheckTab.tsx`
- Modify: `src/components/panels/RoutePanelContent.tsx`
- Modify: `src/components/map/MapLoadingScreen.tsx`
- Modify: `src/pages/MapPage.tsx`
- Modify: `src/components/map/CameraStats.tsx`
- Modify: `src/components/panels/RoutePlannerTab.tsx`
- Modify: `src/components/panels/CustomRoutePanel.tsx`
- Modify: `src/components/panels/ExploreTab.tsx`
- Modify: `src/components/panels/RouteComparison.tsx`
- Modify: `src/components/panels/TabbedPanel.tsx`
- Modify: `src/components/panels/MobileRoutePreview.tsx`
- Modify: `src/components/panels/ControlPanel.tsx`

This task covers updating inline rgba shadows and `red-*` Tailwind classes used for brand/camera purposes (not error states).

- [ ] **Step 1: Update inline rgba shadows across components**

In every component that has `shadow-[0_0_*px_rgba(239,68,68,*)]`, replace:
- `rgba(239,68,68,0.6)` → `rgba(14,165,233,0.6)`
- `rgba(239,68,68,0.5)` → `rgba(14,165,233,0.5)`

Files with these patterns:
- `src/pages/MapPage.tsx` (lines 297, 342, 416)
- `src/components/map/CameraStats.tsx` (line 24)
- `src/components/panels/RoutePanelContent.tsx` (line 295)
- `src/components/panels/RouteCheckTab.tsx` (line 126)

- [ ] **Step 2: Update MapLoadingScreen brand reds**

In `src/components/map/MapLoadingScreen.tsx`:

Replace the radial gradient (line 114):
```ts
background: 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.08) 0%, transparent 50%)',
```
→
```ts
background: 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.08) 0%, transparent 50%)',
```

Replace brand-colored buttons and progress bars:
- `bg-red-600 hover:bg-red-700` → `bg-sky-600 hover:bg-sky-700` (line 136)
- `text-red-400` (loading status, line 163, 166) → `text-sky-400`
- `from-red-600 to-red-500` (progress bar, line 177) → `from-sky-600 to-sky-500`
- `text-red-400 font-medium` ("Did you know?", line 209) → `text-sky-400 font-medium`

- [ ] **Step 3: Update RouteCheckTab brand gradient**

In `src/components/panels/RouteCheckTab.tsx` line 88:
```tsx
className="w-full py-4 bg-gradient-to-r from-accent-danger to-red-600 hover:from-red-600 hover:to-accent-danger disabled:from-dark-600 disabled:to-dark-600 disabled:cursor-not-allowed text-white font-display font-bold text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-accent-danger/20 disabled:shadow-none"
```
→
```tsx
className="w-full py-4 bg-gradient-to-r from-accent-danger to-sky-600 hover:from-sky-600 hover:to-accent-danger disabled:from-dark-600 disabled:to-dark-600 disabled:cursor-not-allowed text-white font-display font-bold text-lg rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-accent-danger/20 disabled:shadow-none"
```

- [ ] **Step 4: Update MapPage brand buttons**

In `src/pages/MapPage.tsx` line 387:
```tsx
className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
```
→
```tsx
className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
```

- [ ] **Step 5: Update RoutePanelContent brand text**

In `src/components/panels/RoutePanelContent.tsx` line 108:
```tsx
<p className="text-sm font-semibold text-red-600 uppercase tracking-widest">
```
→
```tsx
<p className="text-sm font-semibold text-sky-600 uppercase tracking-widest">
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/panels/RouteCheckTab.tsx src/components/panels/RoutePanelContent.tsx src/components/map/MapLoadingScreen.tsx src/pages/MapPage.tsx src/components/map/CameraStats.tsx
git commit -m "feat: rebrand component Tailwind classes from red to DeFlock blue"
```

---

### Task 6: Update Error-State Components (Keep as Error Red or Switch to Blue)

These files use `red-*` Tailwind classes in error/failure contexts. Since these are error states (not brand colors), they should stay red — but review each to confirm.

**Files to review (no changes expected):**
- `src/components/common/ErrorBoundary.tsx` — error boundary UI → **keep red** (semantic error)
- `src/components/panels/DensityPanel.tsx` — "Failed to load" error → **keep red** (semantic error)
- `src/components/panels/NetworkPanelContent.tsx` — "Failed to load" error → **keep red** (semantic error)
- `src/components/panels/MobileTabDrawer.tsx` — "Failed to load" error → **keep red** (semantic error)

- [ ] **Step 1: Verify no brand-red leakage in error components**

Skim the above files to confirm all `red-*` usage is for error states, not brand styling. No code changes needed unless brand-red is found in error components.

- [ ] **Step 2: Commit (if any changes were made)**

Only if changes are needed — otherwise skip this step.

---

### Task 7: Final Verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings related to missing CSS classes.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 3: Grep for remaining red hex values (brand, not error)**

Run: `grep -rn '#dc2626\|#ef4444\|#f87171\|#fca5a5\|#b91c1c\|#991b1b' src/ --include='*.tsx' --include='*.ts' --include='*.css' --include='*.js'`

Expected: No matches in files that were supposed to be changed. Any remaining matches should be in heatmap/density files (out of scope) or error states.

- [ ] **Step 4: Grep for leftover glow-red / pulse-red references**

Run: `grep -rn 'glow-red\|pulse-red' src/ --include='*.tsx' --include='*.ts' --include='*.css'`

Expected: No matches (all renamed to glow-blue / pulse-blue).

- [ ] **Step 5: Visual smoke test**

Run: `npm run dev`

Verify:
- Camera markers on map are blue (not red)
- Camera clusters scale from light blue to dark blue
- Direction cones are blue
- Pulse/glow animations are blue
- Route panel buttons and accents are blue
- Loading screen progress bar is blue
- Error states still show red (semantic errors unchanged)
- Heatmaps and density ramps are unchanged
- Route lines (blue/orange) are unchanged
