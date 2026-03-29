# Map Panel Stats Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty MapPanel with a live stats dashboard showing cameras in view, brand breakdown bar chart, then existing Layers/Filters sections.

**Architecture:** Single-file change to `MapPanel.tsx`. Add viewport-reactive stats computed from `getCamerasInBounds()` (spatial grid, O(1) lookup) triggered by map bounds changes via `useMapStore`. Brand aggregation is a simple `reduce` over the viewport camera set.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS

---

### Task 1: Add Viewport Camera Subscription to MapPanelContent

**Files:**
- Modify: `src/components/panels/MapPanel.tsx:1-8` (imports), `src/components/panels/MapPanel.tsx:351-403` (MapPanelContent top)

- [ ] **Step 1: Add useMapStore import**

In `src/components/panels/MapPanel.tsx`, update the import on line 2:

```typescript
import { useCameraStore } from '../../store';
```

to:

```typescript
import { useCameraStore, useMapStore } from '../../store';
```

- [ ] **Step 2: Add viewport camera computation inside MapPanelContent**

Inside `MapPanelContent()`, after the existing `const hasActiveFilters = appliedFilterCount > 0;` line (line 402), add:

```typescript
  // Viewport-reactive stats
  const { bounds } = useMapStore();
  const getCamerasInBounds = useCameraStore((s) => s.getCamerasInBounds);

  const viewportStats = useMemo(() => {
    if (!bounds) return { count: 0, brands: [] as { name: string; count: number }[] };

    const inView = getCamerasInBounds(bounds.north, bounds.south, bounds.east, bounds.west);
    const count = inView.length;

    // Aggregate brands
    const brandCounts = new Map<string, number>();
    for (const cam of inView) {
      if (cam.brand) {
        brandCounts.set(cam.brand, (brandCounts.get(cam.brand) ?? 0) + 1);
      }
    }

    // Sort descending, take top 4, group rest as "Other"
    const sorted = Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    const brands: { name: string; count: number }[] = [];
    let otherCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      if (i < 4) {
        brands.push({ name: sorted[i][0], count: sorted[i][1] });
      } else {
        otherCount += sorted[i][1];
      }
    }

    if (otherCount > 0) {
      brands.push({ name: 'Other', count: otherCount });
    }

    return { count, brands };
  }, [bounds, getCamerasInBounds]);

  const maxBrandCount = viewportStats.brands.length > 0
    ? viewportStats.brands[0].count
    : 1;

  const brandCount = viewportStats.brands.length > 0
    ? viewportStats.brands[viewportStats.brands.length - 1].name === 'Other'
      ? viewportStats.brands.length - 1 + (viewportStats.brands.length > 4 ? 1 : 0)
      : viewportStats.brands.length
    : 0;
```

Wait — the `brandCount` above gets complicated. Let's simplify. Replace the `brandCount` block with:

```typescript
  // Count unique brands (excluding the "Other" aggregate)
  const uniqueBrandCount = useMemo(() => {
    if (!bounds) return 0;
    const inView = getCamerasInBounds(bounds.north, bounds.south, bounds.east, bounds.west);
    const brands = new Set<string>();
    for (const cam of inView) {
      if (cam.brand) brands.add(cam.brand);
    }
    return brands.size;
  }, [bounds, getCamerasInBounds]);
```

Actually this recomputes `getCamerasInBounds` twice. Let's fold it into the existing `viewportStats` memo instead. Here is the complete, final version of the viewport stats block to add after `const hasActiveFilters = appliedFilterCount > 0;`:

```typescript
  // Viewport-reactive stats
  const { bounds } = useMapStore();
  const getCamerasInBounds = useCameraStore((s) => s.getCamerasInBounds);

  const viewportStats = useMemo(() => {
    if (!bounds) return { count: 0, uniqueBrands: 0, brands: [] as { name: string; count: number }[] };

    const inView = getCamerasInBounds(bounds.north, bounds.south, bounds.east, bounds.west);

    // Aggregate brands
    const brandCounts = new Map<string, number>();
    for (const cam of inView) {
      if (cam.brand) {
        brandCounts.set(cam.brand, (brandCounts.get(cam.brand) ?? 0) + 1);
      }
    }

    const uniqueBrands = brandCounts.size;

    // Sort descending, take top 4, group rest as "Other"
    const sorted = Array.from(brandCounts.entries()).sort((a, b) => b[1] - a[1]);
    const brands: { name: string; count: number }[] = [];
    let otherCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      if (i < 4) {
        brands.push({ name: sorted[i][0], count: sorted[i][1] });
      } else {
        otherCount += sorted[i][1];
      }
    }
    if (otherCount > 0) {
      brands.push({ name: 'Other', count: otherCount });
    }

    return { count: inView.length, uniqueBrands, brands };
  }, [bounds, getCamerasInBounds]);

  const maxBrandCount = viewportStats.brands[0]?.count ?? 1;
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean compilation (no type errors). The new variables are unused in JSX so far — that's fine, they'll be consumed in the next task.

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/MapPanel.tsx
git commit -m "feat(map-panel): add viewport-reactive camera and brand stats computation"
```

---

### Task 2: Add Hero Card and Brands Bar Chart to Panel JSX

**Files:**
- Modify: `src/components/panels/MapPanel.tsx:404-512` (MapPanelContent return block)

The bar chart uses these gradient colors per brand position:

| Position | From | To |
|----------|------|----|
| 1st | `#38bdf8` | `#0ea5e9` |
| 2nd | `#a78bfa` | `#8b5cf6` |
| 3rd | `#f472b6` | `#ec4899` |
| 4th | `#fbbf24` | `#f59e0b` |
| Other | `#94a3b8` | `#64748b` |

- [ ] **Step 1: Add brand color constant**

At the top of `MapPanel.tsx`, after the existing `CAMERA_VIEW_OPTIONS` constant (after line 30), add:

```typescript
const BRAND_COLORS = [
  { from: '#38bdf8', to: '#0ea5e9' },
  { from: '#a78bfa', to: '#8b5cf6' },
  { from: '#f472b6', to: '#ec4899' },
  { from: '#fbbf24', to: '#f59e0b' },
  { from: '#94a3b8', to: '#64748b' },
];
```

- [ ] **Step 2: Replace the MapPanelContent return block**

Replace the entire return block in `MapPanelContent` (from `return (` through the closing `);`). The new return block inserts the hero card and brands chart above the existing Layers section:

```tsx
  return (
    <div className="flex flex-col">
      {/* Hero: Cameras in View */}
      <div className="px-6 pt-4 pb-3">
        <div className="bg-gradient-to-br from-accent/10 to-accent/[0.03] border border-accent/15 rounded-xl px-5 py-4 text-center">
          <div className="flex items-baseline justify-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(56,189,248,0.5)] flex-shrink-0 relative -top-0.5" />
            <span className="text-[40px] font-bold text-accent tracking-tight leading-none tabular-nums">
              {viewportStats.count.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-dark-500 uppercase tracking-[1.5px] mt-1">
            cameras in view
          </p>
        </div>
      </div>

      {/* Brands in View */}
      {viewportStats.brands.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-[0.08em]">
              Brands in View
            </span>
            <span className="text-[10px] text-dark-500">
              {viewportStats.uniqueBrands} brand{viewportStats.uniqueBrands !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {viewportStats.brands.map((brand, i) => {
              const color = BRAND_COLORS[Math.min(i, BRAND_COLORS.length - 1)];
              const widthPct = Math.max((brand.count / maxBrandCount) * 100, 2);
              return (
                <div key={brand.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-dark-200">{brand.name}</span>
                    <span className="text-xs text-dark-500 tabular-nums">
                      {brand.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-dark-800 rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${widthPct}%`,
                        background: `linear-gradient(90deg, ${color.from}, ${color.to})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider before sections */}
      <div className="h-px bg-dark-700/50 mx-6" />

      {/* Section: Layers */}
      <Section title="Layers">
        <CameraViewSelector
          visualization={visualization}
          activeView={activeView}
          onChange={setVisualization}
        />

        <div className="mt-4 pt-4 border-t border-dark-700/30">
          <SubLabel>Overlays</SubLabel>
          <div className="space-y-0.5">
            <OverlayToggle
              label="State Boundaries"
              enabled={overlays.stateBoundaries}
              onToggle={() => toggleOverlay('stateBoundaries')}
            />
            <OverlayToggle
              label="County Boundaries"
              enabled={overlays.countyBoundaries}
              onToggle={() => toggleOverlay('countyBoundaries')}
            />
            <OverlayToggle
              label="Police Stations"
              enabled={overlays.policeStations}
              onToggle={() => toggleOverlay('policeStations')}
              disabled
              disabledLabel="Coming soon"
            />
          </div>
        </div>
      </Section>

      {/* Section: Filters */}
      <Section title="Filters" badge={appliedFilterCount} defaultOpen={false}>
        <div className="space-y-1">
          <SearchableMultiSelect
            label="Brand"
            items={availableBrands}
            selected={pendingFilters.brands}
            onToggle={(v) => togglePendingFilter('brands', v)}
          />
          <SearchableMultiSelect
            label="Operator"
            items={availableOperators}
            selected={pendingFilters.operators}
            onToggle={(v) => togglePendingFilter('operators', v)}
            note="~28% of cameras have operator data"
          />
          <CheckboxGroup
            label="Surveillance Zone"
            options={SURVEILLANCE_ZONES}
            selected={pendingFilters.surveillanceZones}
            onToggle={(v) => togglePendingFilter('surveillanceZones', v)}
          />
          <CheckboxGroup
            label="Mount Type"
            options={MOUNT_TYPES}
            selected={pendingFilters.mountTypes}
            onToggle={(v) => togglePendingFilter('mountTypes', v)}
          />
        </div>

        {/* Apply / Reset buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-dark-700/30">
          <button
            onClick={resetAllFilters}
            className="flex-1 px-3 py-2 rounded-lg text-[11px] font-medium text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={applyPendingFilters}
            disabled={pendingChangeCount === 0}
            className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
              pendingChangeCount > 0
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-dark-800 text-dark-600 cursor-not-allowed'
            }`}
          >
            Apply{pendingChangeCount > 0 ? ` (${pendingChangeCount})` : ''}
          </button>
        </div>
      </Section>

      {/* Section: Heatmap Settings */}
      {activeView === 'heatmap' && (
        <Section title="Heatmap Settings">
          <HeatmapControls />
          <div className="mt-4">
            <HeatmapLegend />
          </div>
        </Section>
      )}

      {/* Footer */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between text-sm text-dark-400">
          <span>Cameras shown</span>
          <span className="text-dark-300 font-medium">
            {hasActiveFilters
              ? `${filteredCameras.length.toLocaleString()} / ${cameras.length.toLocaleString()}`
              : cameras.length.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean compilation, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/MapPanel.tsx
git commit -m "feat(map-panel): add hero card and brands bar chart above existing sections"
```

---

### Task 3: Update Header and Footer Text

**Files:**
- Modify: `src/components/panels/MapPanel.tsx:594-661` (MapPanel desktop sidebar)

- [ ] **Step 1: Update desktop header**

In the `MapPanel` component's desktop return block, find the header section (around line 602-625):

```tsx
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-dark-700/50">
          <h2 className="text-lg font-display font-semibold text-white mb-1">Map</h2>
          <p className="text-xs text-dark-400 leading-relaxed">
            Browse and filter ALPR cameras. Data from{' '}
            <a
              href="https://deflock.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              DeFlock
            </a>{' '}
            &amp;{' '}
            <a
              href="https://www.openstreetmap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              OSM
            </a>{' '}
            contributors.
          </p>
        </div>
```

Replace with:

```tsx
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-dark-700/50">
          <h2 className="text-lg font-display font-semibold text-white mb-1">DeFlock Maps</h2>
          <p className="text-xs text-dark-400 leading-relaxed">
            Crowdsourced ALPR surveillance map. Data from{' '}
            <a
              href="https://deflock.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              DeFlock
            </a>{' '}
            &amp;{' '}
            <a
              href="https://www.openstreetmap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              OSM
            </a>{' '}
            contributors.
          </p>
        </div>
```

- [ ] **Step 2: Update desktop footer**

Find the desktop footer section (around line 633-641):

```tsx
        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-dark-700/50 bg-dark-800/50">
          <div className="flex items-center justify-between text-sm text-dark-400">
            <span>Data from OpenStreetMap</span>
            <span className="text-dark-300 font-medium">
              {filteredCount === cameraCount
                ? `${cameraCount.toLocaleString()} cameras`
                : `${filteredCount.toLocaleString()} / ${cameraCount.toLocaleString()}`}
            </span>
          </div>
        </div>
```

Replace with:

```tsx
        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-dark-700/50 bg-dark-800/50">
          <div className="flex items-center justify-between text-sm text-dark-400">
            <span>Data from OpenStreetMap</span>
            <span className="text-dark-300 font-medium tabular-nums">
              {cameraCount.toLocaleString()} total US
            </span>
          </div>
        </div>
```

- [ ] **Step 3: Update mobile header text**

Find the mobile bottom sheet header (around line 554-581). Locate the line:

```tsx
                  <p className="text-sm font-semibold text-white">Map</p>
```

Replace with:

```tsx
                  <p className="text-sm font-semibold text-white">DeFlock Maps</p>
```

- [ ] **Step 4: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: Clean build, no lint errors.

- [ ] **Step 5: Visual verification**

Run: `npm run dev`

Open `http://localhost:3000` in browser. Verify:
1. Panel header says "DeFlock Maps" with updated tagline
2. Hero card shows live camera count with accent gradient and glowing dot
3. Panning the map updates the hero count and brand bars in real time
4. Brand bars show top 4 brands + "Other", sorted by count, with gradient colors
5. Brands section header shows "X brands" count
6. Layers, Filters, Heatmap Settings sections work as before below the stats
7. Footer shows "XX,XXX total US"
8. Mobile bottom sheet header shows "DeFlock Maps"

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/MapPanel.tsx
git commit -m "feat(map-panel): update header and footer text for stats dashboard"
```
