# Map Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the MapPanel with collapsible sections (Layers/Filters/Heatmap Settings), auto/manual camera view switching, and staged filter application.

**Architecture:** Expand `mapModeStore` with `'auto'` and `'individual'` visualization modes plus a computed `activeView`. Add `pendingFilters` to `cameraStore` so filter changes are staged and only applied on button click. Rewrite `MapPanel` layout into three collapsible sections. Wire `MapLibreContainer` to read `activeView` and manage a zoom listener for auto mode.

**Tech Stack:** React 18, TypeScript, Zustand, MapLibre GL, Tailwind CSS

---

### Task 1: Expand mapModeStore with auto/individual modes

**Files:**
- Modify: `src/store/mapModeStore.ts`

- [ ] **Step 1: Update the MapVisualization type and add ActiveView**

In `src/store/mapModeStore.ts`, replace the entire file contents:

```typescript
import { create } from 'zustand';

export type MapVisualization = 'auto' | 'heatmap' | 'clusters' | 'individual';
export type ActiveView = 'heatmap' | 'clusters' | 'individual';

export interface OverlayState {
  stateBoundaries: boolean;
  countyBoundaries: boolean;
  policeStations: boolean;
}

// Zoom thresholds for auto mode
const AUTO_ZOOM_THRESHOLDS = {
  heatmapMax: 9,    // < 9 = heatmap
  clusterMax: 13,   // 9-12 = clusters, 13+ = individual
} as const;

export function getActiveViewForZoom(zoom: number): ActiveView {
  if (zoom < AUTO_ZOOM_THRESHOLDS.heatmapMax) return 'heatmap';
  if (zoom < AUTO_ZOOM_THRESHOLDS.clusterMax) return 'clusters';
  return 'individual';
}

interface MapModeState {
  visualization: MapVisualization;
  activeView: ActiveView;
  overlays: OverlayState;
  setVisualization: (viz: MapVisualization, currentZoom?: number) => void;
  setActiveView: (view: ActiveView) => void;
  toggleOverlay: (key: keyof OverlayState) => void;
}

export const useMapModeStore = create<MapModeState>((set) => ({
  visualization: 'auto',
  activeView: 'heatmap', // default for zoomed-out view
  overlays: {
    stateBoundaries: false,
    countyBoundaries: false,
    policeStations: false,
  },
  setVisualization: (viz, currentZoom) =>
    set(() => {
      if (viz === 'auto') {
        const zoom = currentZoom ?? 5;
        return { visualization: viz, activeView: getActiveViewForZoom(zoom) };
      }
      return { visualization: viz, activeView: viz as ActiveView };
    }),
  setActiveView: (view) => set({ activeView: view }),
  toggleOverlay: (key) =>
    set((state) => ({
      overlays: { ...state.overlays, [key]: !state.overlays[key] },
    })),
}));
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper" && npx tsc --noEmit 2>&1 | head -30`

Expected: Type errors in files that still reference the old `'clusters' | 'heatmap'` type. That's expected — we'll fix them in later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/store/mapModeStore.ts
git commit -m "feat(store): expand mapModeStore with auto/individual modes and activeView"
```

---

### Task 2: Add staged pending filters to cameraStore

**Files:**
- Modify: `src/store/cameraStore.ts`

- [ ] **Step 1: Add pendingFilters state and actions**

In `src/store/cameraStore.ts`, add to the `CameraState` interface (after the `clearFilters` action, around line 70):

```typescript
  // Staged filter state — pending changes not yet applied
  pendingFilters: {
    brands: string[];
    operators: string[];
    surveillanceZones: string[];
    mountTypes: string[];
  };
  togglePendingFilter: (key: 'brands' | 'operators' | 'surveillanceZones' | 'mountTypes', value: string) => void;
  applyPendingFilters: () => void;
  resetAllFilters: () => void;
  getPendingChangeCount: () => number;
```

- [ ] **Step 2: Add initial state and implementations**

In `src/store/cameraStore.ts`, add after the initial `_initPromise: null,` line (around line 101):

```typescript
  pendingFilters: {
    brands: [],
    operators: [],
    surveillanceZones: [],
    mountTypes: [],
  },
```

Then add the action implementations after `clearFilters` (around line 443):

```typescript
  togglePendingFilter: (key, value) => {
    const { pendingFilters } = get();
    const current = pendingFilters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    set({ pendingFilters: { ...pendingFilters, [key]: next } });
  },

  applyPendingFilters: () => {
    const { pendingFilters, cameras, filters, dataVersion } = get();
    const hasAnyFilter =
      pendingFilters.brands.length > 0 ||
      pendingFilters.operators.length > 0 ||
      pendingFilters.surveillanceZones.length > 0 ||
      pendingFilters.mountTypes.length > 0;

    const updatedFilters: CameraFilters = {
      ...filters,
      brands: pendingFilters.brands,
      operators: pendingFilters.operators,
      surveillanceZones: pendingFilters.surveillanceZones,
      mountTypes: pendingFilters.mountTypes,
      showAll: !hasAnyFilter,
    };

    let filtered = cameras;

    if (updatedFilters.timelineDate) {
      const cutoff = updatedFilters.timelineDate + 'T23:59:59Z';
      filtered = filtered.filter((c) => !c.osmTimestamp || c.osmTimestamp <= cutoff);
    }

    if (!updatedFilters.showAll) {
      if (updatedFilters.brands.length > 0) {
        filtered = filtered.filter((c) => c.brand && updatedFilters.brands.includes(c.brand));
      }
      if (updatedFilters.operators.length > 0) {
        filtered = filtered.filter((c) => c.operator && updatedFilters.operators.includes(c.operator));
      }
      if (updatedFilters.surveillanceZones.length > 0) {
        filtered = filtered.filter((c) => c.surveillanceZone && updatedFilters.surveillanceZones.includes(c.surveillanceZone));
      }
      if (updatedFilters.mountTypes.length > 0) {
        filtered = filtered.filter((c) => c.mountType && updatedFilters.mountTypes.includes(c.mountType));
      }
    }

    set({
      filters: updatedFilters,
      filteredCameras: filtered,
      dataVersion: dataVersion + 1,
      error: null,
    });
  },

  resetAllFilters: () => {
    const { cameras } = get();
    set({
      pendingFilters: { brands: [], operators: [], surveillanceZones: [], mountTypes: [] },
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

  getPendingChangeCount: () => {
    const { pendingFilters, filters } = get();
    let count = 0;
    for (const key of ['brands', 'operators', 'surveillanceZones', 'mountTypes'] as const) {
      const pending = new Set(pendingFilters[key]);
      const applied = new Set(filters[key]);
      // Count additions and removals
      for (const v of pending) if (!applied.has(v)) count++;
      for (const v of applied) if (!pending.has(v)) count++;
    }
    return count;
  },
```

- [ ] **Step 3: Verify build**

Run: `cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper" && npx tsc --noEmit 2>&1 | head -20`

Expected: Should compile (pending filters are additive, no breaking changes).

- [ ] **Step 4: Commit**

```bash
git add src/store/cameraStore.ts
git commit -m "feat(store): add staged pending filters with apply/reset to cameraStore"
```

---

### Task 3: Rewrite MapPanel with collapsible section layout

**Files:**
- Modify: `src/components/panels/MapPanel.tsx`

This is the largest task. The full MapPanel gets rewritten with three collapsible sections: Layers, Filters, Heatmap Settings.

- [ ] **Step 1: Rewrite MapPanel.tsx**

Replace the entire contents of `src/components/panels/MapPanel.tsx` with:

```tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCameraStore } from '../../store';
import { useMapModeStore } from '../../store/mapModeStore';
import type { MapVisualization, ActiveView } from '../../store/mapModeStore';
import { BottomSheet, type SnapPoint } from '../common/BottomSheet';
import { HeatmapControls } from '../../modes/heatmap/HeatmapControls';
import { HeatmapLegend } from '../../modes/heatmap/HeatmapLegend';
import { ChevronLeft, ChevronRight, ChevronDown, Map, Search, X } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const SURVEILLANCE_ZONES = [
  { value: 'traffic', label: 'Traffic' },
  { value: 'town', label: 'Town' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other' },
] as const;

const MOUNT_TYPES = [
  { value: 'pole', label: 'Pole' },
  { value: 'wall', label: 'Wall' },
  { value: 'street_light', label: 'Street Light' },
  { value: 'other', label: 'Other' },
] as const;

const CAMERA_VIEW_OPTIONS: { id: MapVisualization; label: string; description: string }[] = [
  { id: 'auto', label: 'Auto', description: 'Zoom-based transitions' },
  { id: 'heatmap', label: 'Heatmap', description: 'Density blobs' },
  { id: 'clusters', label: 'Clusters', description: 'Grouped markers' },
  { id: 'individual', label: 'Individual', description: 'All camera points' },
];

// ─── Collapsible Section ────────────────────────────────────────────────────
function Section({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-dark-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-dark-800/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-dark-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="px-6 pb-5">{children}</div>}
    </div>
  );
}

// ─── Camera View Radio Group ────────────────────────────────────────────────
function CameraViewSelector({
  visualization,
  activeView,
  onChange,
}: {
  visualization: MapVisualization;
  activeView: ActiveView;
  onChange: (viz: MapVisualization) => void;
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-dark-400 uppercase tracking-wider mb-2">
        Camera View
      </span>
      <div className="space-y-1">
        {CAMERA_VIEW_OPTIONS.map(({ id, label, description }) => {
          const isSelected = visualization === id;
          const autoSuffix = id === 'auto' && isSelected
            ? ` (${activeView.charAt(0).toUpperCase() + activeView.slice(1)})`
            : '';

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                isSelected
                  ? 'bg-accent/10 border border-accent/30'
                  : 'border border-transparent hover:bg-dark-800'
              }`}
            >
              {/* Radio dot */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-accent' : 'border-dark-500'
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <div className="min-w-0">
                <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-dark-300'}`}>
                  {label}{autoSuffix}
                </span>
                <p className="text-xs text-dark-500 truncate">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Overlay Toggle ─────────────────────────────────────────────────────────
function OverlayToggle({
  label,
  enabled,
  onToggle,
  disabled,
  disabledLabel,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${label}`}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
        disabled
          ? 'border-dark-700/30 opacity-50 cursor-not-allowed'
          : enabled
            ? 'bg-dark-700 border-dark-600'
            : 'bg-dark-800 border-dark-600 hover:border-dark-500'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${enabled ? 'text-white' : 'text-dark-300'}`}>
          {label}
        </span>
        {disabledLabel && (
          <span className="text-xs text-dark-500 italic">{disabledLabel}</span>
        )}
      </div>
      <div
        className={`w-10 h-[22px] rounded-full relative transition-colors ${
          disabled ? 'bg-dark-700' : enabled ? 'bg-accent' : 'bg-dark-600'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-[20px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
    </button>
  );
}

// ─── Searchable Multi-Select (Staged) ───────────────────────────────────────
function SearchableMultiSelect({
  label,
  items,
  selected,
  onToggle,
  maxVisible = 50,
  note,
}: {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  maxVisible?: number;
  note?: string;
}) {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(q)).slice(0, maxVisible);
  }, [items, search, maxVisible]);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between py-2"
      >
        <span className="text-xs font-medium text-dark-300 uppercase tracking-wider">
          {label}
          {selected.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold normal-case tracking-normal">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-dark-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="mt-1 mb-3">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-dark-800 border border-dark-600 rounded-lg text-white placeholder:text-dark-500 focus:outline-none focus:border-accent/50"
            />
          </div>

          {note && <p className="text-xs text-dark-500 mb-2">{note}</p>}

          <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="text-xs text-dark-500 py-2 text-center">No results</p>
            ) : (
              filtered.map((item) => {
                const isChecked = selected.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => onToggle(item)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      isChecked
                        ? 'bg-accent/10 text-white'
                        : 'text-dark-300 hover:bg-dark-800'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-accent border-accent'
                          : 'border-dark-500 bg-dark-800'
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs truncate">{item}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Checkbox Group (Staged) ────────────────────────────────────────────────
function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-dark-300 uppercase tracking-wider mb-2">
        {label}
      </span>
      <div className="space-y-1">
        {options.map(({ value, label: optLabel }) => {
          const isChecked = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => onToggle(value)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                isChecked
                  ? 'bg-accent/10 text-white'
                  : 'text-dark-300 hover:bg-dark-800'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  isChecked
                    ? 'bg-accent border-accent'
                    : 'border-dark-500 bg-dark-800'
                }`}
              >
                {isChecked && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs">{optLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MapPanelContent ────────────────────────────────────────────────────────
function MapPanelContent() {
  const cameras = useCameraStore((s) => s.cameras);
  const filteredCameras = useCameraStore((s) => s.filteredCameras);
  const filters = useCameraStore((s) => s.filters);
  const availableBrands = useCameraStore((s) => s.availableBrands);
  const availableOperators = useCameraStore((s) => s.availableOperators);
  const pendingFilters = useCameraStore((s) => s.pendingFilters);
  const togglePendingFilter = useCameraStore((s) => s.togglePendingFilter);
  const applyPendingFilters = useCameraStore((s) => s.applyPendingFilters);
  const resetAllFilters = useCameraStore((s) => s.resetAllFilters);

  const visualization = useMapModeStore((s) => s.visualization);
  const activeView = useMapModeStore((s) => s.activeView);
  const setVisualization = useMapModeStore((s) => s.setVisualization);
  const overlays = useMapModeStore((s) => s.overlays);
  const toggleOverlay = useMapModeStore((s) => s.toggleOverlay);

  // Sync pending filters from applied filters on mount
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      // Initialize pending from current applied state
      useCameraStore.setState({
        pendingFilters: {
          brands: [...filters.brands],
          operators: [...filters.operators],
          surveillanceZones: [...filters.surveillanceZones],
          mountTypes: [...filters.mountTypes],
        },
      });
      setInitialized(true);
    }
  }, [initialized, filters]);

  // Count pending changes (differences from applied)
  const pendingChangeCount = useMemo(() => {
    let count = 0;
    for (const key of ['brands', 'operators', 'surveillanceZones', 'mountTypes'] as const) {
      const pending = new Set(pendingFilters[key]);
      const applied = new Set(filters[key]);
      for (const v of pending) if (!applied.has(v)) count++;
      for (const v of applied) if (!pending.has(v)) count++;
    }
    return count;
  }, [pendingFilters, filters]);

  const appliedFilterCount =
    filters.brands.length +
    filters.operators.length +
    filters.surveillanceZones.length +
    filters.mountTypes.length;

  const hasActiveFilters = appliedFilterCount > 0;

  return (
    <div className="flex flex-col">
      {/* ── Section: Layers ──────────────────────────────────────────── */}
      <Section title="Layers" defaultOpen={true}>
        <CameraViewSelector
          visualization={visualization}
          activeView={activeView}
          onChange={setVisualization}
        />

        <div className="mt-5">
          <span className="block text-xs font-medium text-dark-400 uppercase tracking-wider mb-2">
            Overlays
          </span>
          <div className="space-y-2">
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

      {/* ── Section: Filters ─────────────────────────────────────────── */}
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
        <div className="flex gap-2 mt-4">
          <button
            onClick={resetAllFilters}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium border border-dark-600 text-dark-300 hover:text-white hover:border-dark-500 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={applyPendingFilters}
            disabled={pendingChangeCount === 0}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              pendingChangeCount > 0
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-dark-700 text-dark-500 cursor-not-allowed'
            }`}
          >
            Apply{pendingChangeCount > 0 ? ` (${pendingChangeCount})` : ''}
          </button>
        </div>
      </Section>

      {/* ── Section: Heatmap Settings ────────────────────────────────── */}
      {activeView === 'heatmap' && (
        <Section title="Heatmap Settings" defaultOpen={true}>
          <HeatmapControls />
          <div className="mt-4">
            <HeatmapLegend />
          </div>
        </Section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
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
}

// ─── MapPanel (exported) ────────────────────────────────────────────────────
export function MapPanel() {
  const [isMobile, setIsMobile] = useState(false);
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('minimized');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const cameraCount = useCameraStore((s) => s.cameras.length);
  const filteredCount = useCameraStore((s) => s.filteredCameras.length);
  const filters = useCameraStore((s) => s.filters);

  const activeFilterCount =
    filters.brands.length +
    filters.operators.length +
    filters.surveillanceZones.length +
    filters.mountTypes.length;

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

  // ─── Mobile: Bottom Sheet ──────────────────────────────────────────────
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
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-dark-600 flex items-center justify-center">
                <Map className="w-4 h-4 text-accent" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">Map</p>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                      {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-400">
                  {filteredCount === cameraCount
                    ? `${cameraCount.toLocaleString()} cameras`
                    : `${filteredCount.toLocaleString()} / ${cameraCount.toLocaleString()} cameras`}
                </p>
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
            <MapPanelContent />
          </div>
        )}
      </BottomSheet>
    );
  }

  // ─── Desktop: Side Panel ───────────────────────────────────────────────
  return (
    <div className="hidden lg:block relative h-full">
      <div
        className={`flex flex-col h-full bg-dark-900 border-r border-dark-700/50 ${
          hasAnimated ? 'transition-all duration-300' : ''
        } ${isCollapsed ? 'w-0 overflow-hidden' : 'w-[400px]'}`}
      >
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <MapPanelContent />
        </div>

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

- [ ] **Step 2: Verify build**

Run: `cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper" && npx tsc --noEmit 2>&1 | head -30`

Expected: May have errors in MapLibreContainer (still references old types). MapPanel itself should be clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/MapPanel.tsx
git commit -m "feat(panel): rewrite MapPanel with collapsible Layers/Filters/Heatmap sections"
```

---

### Task 4: Update CameraMarkerLayers to support unclustered mode

**Files:**
- Modify: `src/components/map/layers/CameraMarkerLayers.tsx`

- [ ] **Step 1: Add clustered prop to CameraMarkerLayers**

In `src/components/map/layers/CameraMarkerLayers.tsx`, update the props interface (around line 200):

```typescript
interface CameraMarkerLayersProps {
  cameras: ALPRCamera[];
  visible: boolean;
  clustered: boolean;
  mapLoaded: boolean;
  mapRef: React.RefObject<{ getMap: () => maplibregl.Map } | null>;
}
```

Update the function signature (around line 207):

```typescript
export function CameraMarkerLayers({ cameras, visible, clustered, mapLoaded, mapRef }: CameraMarkerLayersProps) {
```

Update the `<Source>` element (around line 358) to use the `clustered` prop with a `key` to force remount:

```tsx
      {/* Camera markers */}
      <Source
        key={clustered ? 'cameras-clustered' : 'cameras-unclustered'}
        id="cameras"
        type="geojson"
        data={geojsonData}
        cluster={clustered}
        clusterMaxZoom={11}
        clusterRadius={35}
      >
```

- [ ] **Step 2: Verify build**

Run: `cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper" && npx tsc --noEmit 2>&1 | head -20`

Expected: Error in MapLibreContainer where `<CameraMarkerLayers>` is missing the `clustered` prop. Fixed in next task.

- [ ] **Step 3: Commit**

```bash
git add src/components/map/layers/CameraMarkerLayers.tsx
git commit -m "feat(layers): add clustered prop to CameraMarkerLayers for individual view mode"
```

---

### Task 5: Wire MapLibreContainer to use activeView and zoom listener

**Files:**
- Modify: `src/components/map/MapLibreContainer.tsx`

- [ ] **Step 1: Update imports and store reads**

In `src/components/map/MapLibreContainer.tsx`, find where `mapModeViz` is read (around line 158):

```typescript
  const mapModeViz = useMapModeStore(s => s.visualization);
```

Replace with:

```typescript
  const mapModeViz = useMapModeStore(s => s.visualization);
  const activeView = useMapModeStore(s => s.activeView);
  const setActiveView = useMapModeStore(s => s.setActiveView);
```

Add import for `getActiveViewForZoom` at the top of the file alongside existing mapModeStore imports:

```typescript
import { useMapModeStore, getActiveViewForZoom } from '../../store/mapModeStore';
```

(If the import already exists as `import { useMapModeStore } from ...`, just add the named exports.)

- [ ] **Step 2: Add zoom listener for auto mode**

Find the section where `mapLoaded` effects are handled (after the map's `onLoad` or in an existing `useEffect` that runs when `mapLoaded` changes). Add a new `useEffect` for the auto zoom listener:

```typescript
  // Auto mode: update activeView based on zoom level
  useEffect(() => {
    if (!mapLoaded || !isMapMode || mapModeViz !== 'auto') return;

    const map = mapRef.current?.getMap();
    if (!map) return;

    // Set initial activeView from current zoom
    setActiveView(getActiveViewForZoom(map.getZoom()));

    const handleZoomEnd = () => {
      setActiveView(getActiveViewForZoom(map.getZoom()));
    };

    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [mapLoaded, isMapMode, mapModeViz, setActiveView]);
```

- [ ] **Step 3: Update showCameraMarkers logic**

Find the `showCameraMarkers` computation (around line 165):

```typescript
  const showCameraMarkers = !isNetworkMode && !isDensityMode && (
    appMode === 'route'
    || (isMapMode && mapModeViz === 'clusters')
    || (isHeatmapMode && (heatmapSettings.showMarkers || zoom >= 13))
    || (isDotsMode && (dotDensitySettings.showMarkers || zoom >= 13))
  );
```

Replace with:

```typescript
  const showCameraMarkers = !isNetworkMode && !isDensityMode && (
    appMode === 'route'
    || (isMapMode && activeView !== 'heatmap')
    || (isHeatmapMode && (heatmapSettings.showMarkers || zoom >= 13))
    || (isDotsMode && (dotDensitySettings.showMarkers || zoom >= 13))
  );
```

- [ ] **Step 4: Update heatmap layer rendering for map mode**

Find the heatmap rendering line (around line 911):

```tsx
      {isMapMode && mapModeViz === 'heatmap' && <HeatmapLayers />}
```

Replace with:

```tsx
      {isMapMode && activeView === 'heatmap' && <HeatmapLayers />}
```

- [ ] **Step 5: Pass clustered prop to CameraMarkerLayers**

Find the `<CameraMarkerLayers` call (around line 919):

```tsx
      <CameraMarkerLayers
        cameras={cameraSource}
        visible={showCameraMarkers}
        mapLoaded={mapLoaded}
        mapRef={mapRef}
      />
```

Replace with:

```tsx
      <CameraMarkerLayers
        cameras={cameraSource}
        visible={showCameraMarkers}
        clustered={!isMapMode || activeView !== 'individual'}
        mapLoaded={mapLoaded}
        mapRef={mapRef}
      />
```

- [ ] **Step 6: Update interactiveLayerIds**

Find the `interactiveLayerIds` prop on `<ReactMapGL>` (around line 903):

```tsx
          : showCameraMarkers ? ['clusters', 'unclustered-point'] : []}
```

Replace with:

```tsx
          : showCameraMarkers
            ? (isMapMode && activeView === 'individual')
              ? ['unclustered-point']
              : ['clusters', 'unclustered-point']
            : []}
```

- [ ] **Step 7: Verify build compiles clean**

Run: `cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper" && npx tsc --noEmit 2>&1 | head -30`

Expected: Clean compilation (0 errors).

- [ ] **Step 8: Commit**

```bash
git add src/components/map/MapLibreContainer.tsx
git commit -m "feat(map): wire activeView zoom listener and individual camera mode"
```

---

### Task 6: Full integration test — verify dev server works

**Files:** None (testing only)

- [ ] **Step 1: Start dev server and verify no runtime errors**

Run: `cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper" && npm run build 2>&1 | tail -20`

Expected: Successful production build with no TypeScript errors.

- [ ] **Step 2: Verify no unused imports or variables**

Run: `cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper" && npm run lint 2>&1 | tail -30`

Expected: Clean lint or only pre-existing warnings (no new errors from our changes).

- [ ] **Step 3: Fix any issues found and commit**

If there are lint or build errors, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve lint/build issues from map panel redesign"
```
