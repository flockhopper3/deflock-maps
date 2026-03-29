import { useState, useEffect, useMemo } from 'react';
import { useCameraStore, useMapStore } from '../../store';
import { useMapModeStore } from '../../store/mapModeStore';
import type { MapVisualization, ActiveView } from '../../store/mapModeStore';
import { BottomSheet, type SnapPoint } from '../common/BottomSheet';
import { HeatmapControls } from '../../modes/heatmap/HeatmapControls';
import { HeatmapLegend } from '../../modes/heatmap/HeatmapLegend';
import { ChevronLeft, ChevronRight, ChevronDown, Map as MapIcon, Search } from 'lucide-react';

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

// ─── Collapsible Section (top-level) ────────────────────────────────────────
function Section({
  title,
  badge,
  defaultOpen = false,
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
        className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-dark-800/30 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-white tracking-tight">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-dark-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="px-6 pb-5">{children}</div>}
    </div>
  );
}

// ─── Sub-label (within a section) ───────────────────────────────────────────
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-semibold text-dark-500 uppercase tracking-[0.08em] mb-2">
      {children}
    </span>
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
      <SubLabel>Camera View</SubLabel>
      <div className="grid grid-cols-2 gap-1.5">
        {CAMERA_VIEW_OPTIONS.map(({ id, label, description }) => {
          const isSelected = visualization === id;
          const autoSuffix = id === 'auto' && isSelected
            ? ` (${activeView.charAt(0).toUpperCase() + activeView.slice(1)})`
            : '';

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                isSelected
                  ? 'bg-accent/10 ring-1 ring-accent/30'
                  : 'hover:bg-dark-800/80'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-accent' : 'border-dark-600'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-medium leading-none ${isSelected ? 'text-white' : 'text-dark-300'}`}>
                  {label}{autoSuffix}
                </span>
                <p className="text-[10px] text-dark-500 leading-tight mt-0.5">{description}</p>
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
      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-dark-800/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs ${enabled ? 'text-dark-200' : 'text-dark-400'}`}>
          {label}
        </span>
        {disabledLabel && (
          <span className="text-[10px] text-dark-600 italic">{disabledLabel}</span>
        )}
      </div>
      <div
        className={`w-8 h-[18px] rounded-full relative transition-colors duration-200 ${
          disabled ? 'bg-dark-700' : enabled ? 'bg-accent' : 'bg-dark-700'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? 'translate-x-[16px]' : 'translate-x-[2px]'
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

// ─── Collapsible Checkbox Group (Staged) ────────────────────────────────────
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
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="mt-1 mb-3 space-y-0.5">
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
      )}
    </div>
  );
}

// ─── MapPanelContent ────────────────────────────────────────────────────────
export function MapPanelContent() {
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
  void maxBrandCount; // consumed by next task

  return (
    <div className="flex flex-col">
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
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-dark-600 flex items-center justify-center">
                <MapIcon className="w-4 h-4 text-accent" />
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

  // Desktop: Side Panel
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
