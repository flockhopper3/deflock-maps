# Editorial Cartography Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current AI-aesthetic dark UI with an editorial cartography design — single accent color, hairline borders, uppercase labels, no glassmorphism.

**Architecture:** Pure visual/styling overhaul. No store, service, or utility changes. Tailwind token updates cascade through all components. Accessibility fixes are structural (aria attributes on existing elements).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, MapLibre GL, Framer Motion (BottomSheet only)

**Spec:** `docs/superpowers/specs/2026-03-28-editorial-redesign-design.md`

---

## File Map

| Task | Creates | Modifies |
|------|---------|----------|
| 1 | — | `tailwind.config.js`, `index.html`, `src/index.css` |
| 2 | — | `src/components/ui/button.tsx` |
| 3 | — | `src/pages/MapPage.tsx` |
| 4 | — | `src/components/panels/TabbedPanel.tsx`, `src/components/panels/ControlPanel.tsx` |
| 5 | — | `src/components/panels/RouteCheckTab.tsx`, `src/components/panels/RoutePlannerTab.tsx`, `src/components/panels/RoutePanelContent.tsx`, `src/components/panels/RouteComparison.tsx` |
| 6 | — | `src/components/panels/MapPanel.tsx`, `src/components/panels/ExplorePanel.tsx`, `src/components/panels/ExploreTab.tsx`, `src/components/panels/DensityPanel.tsx`, `src/components/panels/NetworkPanel.tsx`, `src/components/panels/NetworkPanelContent.tsx`, `src/components/panels/CustomRoutePanel.tsx` |
| 7 | — | `src/components/map/MapSearch.tsx`, `src/components/map/CameraStats.tsx`, `src/components/map/MapStyleControl.tsx`, `src/components/map/NetworkLegendBar.tsx`, `src/components/map/DensityLegendBar.tsx`, `src/components/map/NetworkAgencyCount.tsx` |
| 8 | — | `src/components/map/layers/CameraMarkerLayers.tsx`, `src/components/map/MapLibreContainer.tsx`, `src/components/map/layers/BoundaryOverlayLayers.tsx`, `src/components/map/WaypointLayer.tsx` |
| 9 | — | `src/modes/heatmap/HeatmapControls.tsx`, `src/modes/heatmap/HeatmapLegend.tsx`, `src/modes/density/DensityControls.tsx`, `src/modes/density/DensityLegend.tsx`, `src/modes/density/DensityFeaturePopup.tsx`, `src/modes/dots/DotDensityControls.tsx`, `src/modes/timeline/TimelineBar.tsx` |
| 10 | — | `src/components/common/BottomSheet.tsx`, `src/components/panels/MobileTabDrawer.tsx`, `src/components/panels/MobileRoutePreview.tsx` |
| 11 | — | `src/components/inputs/AddressSearch.tsx`, plus all files from Tasks 3-10 (aria attributes) |
| 12 | — | `src/index.css`, `src/components/map/MapLoadingScreen.tsx`, `src/main.tsx` |

---

### Task 1: Foundation — Tokens, Fonts, Global CSS

Update the design system foundation. Everything else builds on this.

**Files:**
- Modify: `tailwind.config.js`
- Modify: `index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Update tailwind.config.js color tokens**

Replace the colors and font configuration:

```js
// tailwind.config.js — full replacement of the `extend` block
extend: {
  colors: {
    dark: {
      900: '#0a0a0f',
      800: '#101018',
      700: '#1a1a24',
      600: '#252530',
      500: '#6b7280',
      400: '#9ca3af',
      300: '#d1d5db',
      200: '#e5e7eb',
      100: '#f3f4f6',
    },
    accent: {
      DEFAULT: '#0080BC',
      hover: '#0095d9',
      muted: 'rgba(0,128,188,0.12)',
    },
    route: {
      direct: '#e5a04d',
      avoid: '#0080BC',
    },
    danger: '#ef4444',
    success: '#22c55e',
    // Shadcn compatibility
    background: '#0a0a0f',
    foreground: '#f3f4f6',
    card: { DEFAULT: '#101018', foreground: '#f3f4f6' },
    popover: { DEFAULT: '#101018', foreground: '#f3f4f6' },
    primary: { DEFAULT: '#0080BC', foreground: '#fafafa' },
    secondary: { DEFAULT: '#1a1a24', foreground: '#f3f4f6' },
    muted: { DEFAULT: '#252530', foreground: '#9ca3af' },
    destructive: { DEFAULT: '#ef4444', foreground: '#fafafa' },
    border: '#252530',
    input: '#1a1a24',
    ring: '#0080BC',
  },
  fontFamily: {
    sans: ['DM Sans', 'system-ui', 'sans-serif'],
    display: ['Space Grotesk', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
  },
  fontSize: {
    'xs': ['0.75rem', { lineHeight: '1.25rem' }],    // 12px
    'sm': ['0.875rem', { lineHeight: '1.375rem' }],   // 14px
    'base': ['0.9375rem', { lineHeight: '1.5rem' }],  // 15px
    'lg': ['1.125rem', { lineHeight: '1.625rem' }],   // 18px
    'xl': ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],        // 24px
  },
  borderRadius: {
    lg: '0.5rem',
    md: '0.375rem',
    sm: '0.25rem',
  },
  animation: {
    'fade-in': 'fadeIn 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
    'slide-up': 'slideUp 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0', transform: 'translateY(8px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
    slideUp: {
      '0%': { opacity: '0', transform: 'translateY(16px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
  },
},
```

Key changes:
- `dark-800` changed from `#12121a` to `#101018`
- `dark-600` changed from `#2a2a38` to `#252530`
- `accent` simplified to single color `#0080BC` with `hover` and `muted` variants
- Removed: `accent.primary`, `accent.secondary`, `accent.danger`, `accent.success`, `accent.warning`
- `fontFamily.sans` changed from Space Grotesk to DM Sans
- `fontFamily.display` keeps Space Grotesk for headlines
- Removed decorative animations (`pulse-slow`, `pulse-blue`, `scale-in`)
- Font sizes adjusted (xs: 12px down from 13px, sm: 14px down from 15px)

- [ ] **Step 2: Update index.html font loading**

Replace the font loading section:

```html
<!-- Fonts - preload for fastest LCP -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@700&display=swap">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
```

Also update the inline `<style>` in `<body>`:

```html
<style>
  .font-bold { font-weight: 700; }
  h1 { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
</style>
```

No change needed to the `h1` rule — it stays Space Grotesk for display.

- [ ] **Step 3: Update src/index.css — CSS variables**

Replace the `:root` block:

```css
:root {
  --background: #0a0a0f;
  --foreground: #f3f4f6;
  --card: #101018;
  --card-foreground: #f3f4f6;
  --popover: #101018;
  --popover-foreground: #f3f4f6;
  --primary: #0080BC;
  --primary-foreground: #fafafa;
  --secondary: #1a1a24;
  --secondary-foreground: #f3f4f6;
  --muted: #252530;
  --muted-foreground: #9ca3af;
  --accent: #0080BC;
  --accent-foreground: #fafafa;
  --destructive: #ef4444;
  --destructive-foreground: #fafafa;
  --border: #252530;
  --input: #1a1a24;
  --ring: #0080BC;
  --radius: 0.375rem;
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
}
```

Update `body` font-family:

```css
body {
  font-family: 'DM Sans', system-ui, sans-serif;
  /* rest unchanged */
}
```

- [ ] **Step 4: Update src/index.css — Remove decorative animations**

Remove these entire keyframe blocks and their associated classes:
- `@keyframes rec-pulse` and `.camera-marker .animate-ping`
- `@keyframes camera-pulse-expand` and `.camera-pulse-ring`
- `.camera-glow-outer` (the blur glow ring)
- `.camera-core` — replace with simplified version:
  ```css
  .camera-core {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #0080BC;
  }
  ```
- `@keyframes rec-blink` and `.rec-indicator`
- `@keyframes glow-blue` and `.glow-blue`
- `@keyframes pulse-blue` and `.animate-pulse-blue`
- `@keyframes pulse-purple` and `.waypoint-pulse`
- `@keyframes scan-line-move` and `.scan-line`

Keep these animations (they serve functional purposes):
- `@keyframes camera-fade-in` — simplify to opacity only:
  ```css
  @keyframes camera-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  ```
- `@keyframes fadeIn` and `.animate-fade-in` — keep as-is (entrance animation)
- `@keyframes slideUp` and `.animate-slide-up` — keep as-is
- `@keyframes spin` and `.animate-spin` — keep (loading spinner)
- `@keyframes ticker-scroll-left/right` — keep (landing page only)

- [ ] **Step 5: Update src/index.css — Global style updates**

Update range slider thumb from indigo to accent:

```css
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #101018;
  cursor: pointer;
  border: 2px solid #0080BC;
  box-shadow: none;
  transition: transform 0.15s var(--ease-out-quart);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #101018;
  cursor: pointer;
  border: 2px solid #0080BC;
  box-shadow: none;
}
```

Update range track height:

```css
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 2px;
  border-radius: 1px;
  background: #252530;
}
```

Update focus styles:

```css
button:focus-visible {
  outline: 2px solid #0080BC;
  outline-offset: 2px;
}

::selection {
  background: rgba(0, 128, 188, 0.3);
  color: #fff;
}
```

Update MapLibre styles:

```css
.maplibregl-map {
  font-family: 'DM Sans', system-ui, sans-serif;
}

.maplibregl-ctrl-attrib a {
  color: #0080BC !important;
}

.maplibregl-ctrl-group {
  background: #101018 !important;
  border-radius: 6px !important;
  border: 1px solid #252530 !important;
  box-shadow: none !important;
  overflow: hidden;
}

.maplibregl-ctrl-group button {
  background: #101018 !important;
  border: none !important;
  border-bottom: 1px solid #252530 !important;
  width: 36px !important;
  height: 36px !important;
}

.maplibregl-ctrl-group button:hover {
  background: #1a1a24 !important;
}

.maplibregl-popup-content {
  background: #1a1a24 !important;
  color: #f3f4f6 !important;
  border-radius: 6px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  border: 1px solid #252530 !important;
  padding: 0 !important;
  font-family: 'DM Sans', system-ui, sans-serif !important;
}
```

Update Leaflet tooltip:

```css
.leaflet-tooltip {
  background: rgba(16, 16, 24, 0.95) !important;
  border: 1px solid #252530 !important;
  border-radius: 6px !important;
  color: #f3f4f6 !important;
  font-family: 'DM Sans', system-ui, sans-serif !important;
  padding: 6px 10px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}
```

Update `.font-display` utility:

```css
.font-display {
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
```

- [ ] **Step 6: Add reduced motion media query**

At the end of `src/index.css`, before the landing page sections:

```css
/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds. There will be Tailwind warnings about removed color classes — these are expected and will be resolved in subsequent tasks.

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.js index.html src/index.css
git commit -m "feat(design): update foundation — tokens, fonts, global CSS

- Replace scattered accent palette with single #0080BC
- Switch body font from Space Grotesk to DM Sans
- Remove decorative animations (glow, pulse, rec-blink)
- Simplify camera markers, range sliders, focus styles
- Add reduced motion media query
- Update MapLibre control styling to editorial aesthetic"
```

---

### Task 2: Base UI Components

Update the shared button component to match the editorial design.

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Update button variants**

Replace the `buttonVariants` definition:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium uppercase tracking-wider transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover',
        destructive:
          'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/20',
        outline:
          'border border-dark-600 bg-transparent text-dark-300 hover:bg-dark-700 hover:text-dark-200',
        secondary:
          'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-200',
        ghost:
          'text-dark-300 hover:bg-dark-700 hover:text-dark-200',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
```

Key changes:
- Base: added `text-xs uppercase tracking-wider` for editorial button style
- Base: replaced `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` with `focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`
- `default`: solid `bg-accent` replaces `bg-primary`
- `outline`: uses `dark-600` border, `dark-300` text, `dark-700` hover
- `secondary`: uses `dark-700` background
- `ghost`: uses `dark-300` text
- Removed `shadow-xs` from outline variant

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(design): update button variants to editorial style

- Solid accent background, no gradients
- Uppercase tracking on all buttons
- Outline/ghost variants use dark-600/700 tokens
- Focus indicator uses accent outline"
```

---

### Task 3: Header Redesign

Replace the current pill-tab header with the editorial style.

**Files:**
- Modify: `src/pages/MapPage.tsx`

- [ ] **Step 1: Replace the header section**

In `MapPage.tsx`, find the `<header>` element (around line 262) and replace it entirely:

```tsx
{/* Header - Editorial style */}
<header className="h-12 bg-dark-900 border-b border-dark-600 flex items-center z-50 shrink-0">
  <div className="w-full px-4 lg:px-5">
    <div className="flex items-center justify-between h-12">
      {/* Logo */}
      <a href="https://deflock.org" className="flex items-center gap-2 group flex-shrink-0">
        <img
          src="/deflock-logo.svg"
          alt="DeFlock Logo"
          className="h-7 lg:h-8 w-auto object-contain transition-opacity duration-150 group-hover:opacity-80"
        />
        <span className="text-dark-400 text-xs tracking-widest uppercase hidden sm:inline">Maps</span>
      </a>

      {/* Desktop: Mode tabs - editorial underline style */}
      <nav className="hidden lg:flex items-center gap-6" aria-label="App modes">
        {(Object.entries(MODE_LABELS) as [AppMode, typeof MODE_LABELS[AppMode]][]).map(([mode, { label }]) => (
          <button
            key={mode}
            onClick={() => handleSetAppMode(mode)}
            className={`relative text-xs uppercase tracking-widest pb-1 transition-colors duration-150 ${
              appMode === mode
                ? 'text-accent'
                : 'text-dark-400 hover:text-dark-200'
            }`}
            aria-current={appMode === mode ? 'page' : undefined}
          >
            {label}
            {appMode === mode && (
              <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-accent" />
            )}
          </button>
        ))}
      </nav>

      {/* Mobile: Camera count + hamburger */}
      <div className="lg:hidden flex items-center gap-2">
        <span className="text-xs text-dark-400">
          <span className="text-dark-200 font-semibold tabular-nums">{viewCameraCount.toLocaleString()}</span> in view
        </span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center w-10 h-10 text-dark-300 hover:text-dark-100 transition-colors duration-150"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop: Right spacer */}
      <div className="hidden lg:flex items-center flex-shrink-0" />
    </div>
  </div>
</header>
```

- [ ] **Step 2: Replace the mobile menu**

Find the mobile slide-down menu (around line 328) and replace:

```tsx
{/* Mobile slide-down menu */}
{mobileMenuOpen && (
  <nav
    className="lg:hidden absolute top-12 left-0 right-0 z-[60] bg-dark-800 border-b border-dark-600"
    aria-label="Mobile navigation"
  >
    <div className="px-4 py-2 space-y-0.5">
      {(Object.entries(MODE_LABELS) as [AppMode, typeof MODE_LABELS[AppMode]][]).map(([mode, { icon: Icon, label }]) => (
        <button
          key={mode}
          onClick={() => {
            handleSetAppMode(mode);
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 ${
            appMode === mode
              ? 'text-accent'
              : 'text-dark-300 hover:text-dark-100'
          }`}
          aria-current={appMode === mode ? 'page' : undefined}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  </nav>
)}
```

- [ ] **Step 3: Remove Icon import from desktop tabs**

The desktop tabs no longer show icons — only text. The `Icon` component is still used in mobile menu, so keep the imports.

- [ ] **Step 4: Update the page container class**

Find `className={`map-page h-screen...` (line 260) and replace:

```tsx
<div className={`map-page h-screen w-screen flex flex-col bg-dark-900 overflow-hidden ${isExploreMode ? 'timeline-active' : ''}`}>
```

No change needed — the class is already correct.

- [ ] **Step 5: Remove the mobile camera count badge**

The loading spinner and REC indicator in the mobile header are replaced by the flat text version above. Remove the old `<div className="flex items-center gap-1.5 bg-dark-800 rounded-full...">` block entirely (lines 294-309).

- [ ] **Step 6: Verify visually**

Run: `npm run dev`
Check:
- Desktop: Thin header, logo left, uppercase text tabs right with underline indicator
- Mobile: Logo left, flat camera count, hamburger icon
- No gradients, no pill tabs, no REC indicator

- [ ] **Step 7: Commit**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat(design): redesign header — editorial underline tabs

- Replace pill navigation with uppercase text + underline indicator
- Remove backdrop-blur from header
- Replace REC indicator with flat camera count text
- Add aria-label, aria-expanded, aria-current attributes
- Simplify mobile menu to flat list"
```

---

### Task 4: Side Panel Chrome

Establish the editorial section pattern on panel containers.

**Files:**
- Modify: `src/components/panels/TabbedPanel.tsx`
- Modify: `src/components/panels/ControlPanel.tsx`

- [ ] **Step 1: Rewrite TabbedPanel.tsx**

This component wraps the Route mode sub-tabs (Route Check, Route Planner, Explore). Replace the current gradient mobile toggle and pill tabs with the editorial style.

Key changes:
- Mobile toggle: remove `bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl shadow-lg`. Replace with `bg-accent rounded-md`.
- Tab buttons: remove `bg-dark-600 text-white shadow-sm` active style. Replace with `text-accent` + underline.
- Panel container: remove `rounded-2xl shadow-2xl shadow-black/30`. Replace with `bg-dark-800 border-r border-dark-600`.
- All colors: replace any `accent-primary`, `accent-secondary`, `cyan-*`, `indigo-*` with `accent`.
- Add `aria-label` to mobile toggle button.
- Add `role="tablist"` to tab container, `role="tab"` and `aria-selected` to tab buttons.

- [ ] **Step 2: Update ControlPanel.tsx**

Key changes:
- Remove `bg-gradient-to-r` from any buttons. Use solid `bg-accent`.
- Replace `accent-primary` with `accent`.
- Add `aria-label="Swap origin and destination"` to swap button.
- Add `aria-label` to collapse toggle.

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Check: Route panel has editorial styling — uppercase section labels, hairline dividers, no gradients.

- [ ] **Step 4: Commit**

```bash
git add src/components/panels/TabbedPanel.tsx src/components/panels/ControlPanel.tsx
git commit -m "feat(design): editorial panel chrome — TabbedPanel, ControlPanel

- Replace gradient toggles with solid accent buttons
- Replace pill tabs with underline tab indicators
- Remove rounded-2xl and shadow-2xl from panel containers
- Add aria-label, role=tablist, aria-selected attributes"
```

---

### Task 5: Route Panels

Apply editorial styling to all Route mode panel content.

**Files:**
- Modify: `src/components/panels/RouteCheckTab.tsx`
- Modify: `src/components/panels/RoutePlannerTab.tsx`
- Modify: `src/components/panels/RoutePanelContent.tsx`
- Modify: `src/components/panels/RouteComparison.tsx`

- [ ] **Step 1: Update RouteCheckTab.tsx**

Search-and-replace pattern across this file:
- `bg-gradient-to-r from-accent-danger to-sky-600` → `bg-accent`
- `bg-gradient-to-r from-blue-500 to-indigo-600` → `bg-accent`
- `bg-gradient-to-br from-dark-800 to-dark-900` → `bg-dark-800`
- `bg-gradient-to-br from-accent-danger/10 via-transparent to-transparent` → remove (delete the overlay div)
- `rounded-2xl` → `rounded-md`
- `shadow-xl shadow-black/20` → remove
- `backdrop-blur-sm` → remove
- `text-cyan-400` → `text-accent`
- `border-cyan-500/30` → `border-dark-600`
- Any `text-[10px]` or `text-[11px]` → `text-xs`
- Add `aria-label` to all buttons.

- [ ] **Step 2: Update RoutePlannerTab.tsx**

Same pattern:
- `bg-gradient-to-r from-accent-success to-emerald-600` → `bg-accent`
- All gradient overlays → remove
- `rounded-2xl` → `rounded-md`
- `text-cyan-400` → `text-accent`
- `text-[10px]` → `text-xs`
- Add `aria-label` to route calculate button, swap button.

- [ ] **Step 3: Update RoutePanelContent.tsx**

Same pattern:
- `bg-gradient-to-r from-accent-primary to-indigo-600` → `bg-accent`
- `hover:from-indigo-600 hover:to-accent-primary` → `hover:bg-accent-hover`
- All gradient card backgrounds → solid `bg-dark-800` or `bg-dark-700`
- Replace `border-accent-danger` and `border-accent-success` with `border-accent` and `border-route-direct`
- Route comparison cards: orange border → `border-route-direct`, blue border → `border-accent`
- Toggle: increase to `w-10 h-[22px]` with `w-[18px] h-[18px]` thumb. Add `role="switch"` and `aria-checked`.
- Add `aria-label="Camera avoidance distance"` to range input.
- Add `aria-selected` to route selection buttons.

- [ ] **Step 4: Update RouteComparison.tsx**

- Replace hard-coded `#f97316` in inline styles with CSS variable or Tailwind class `route-direct`
- Replace any gradient overlays with flat backgrounds
- Add `aria-label` to comparison elements.

- [ ] **Step 5: Verify visually**

Run: `npm run dev`, navigate to Route mode.
Check: All route panels use solid backgrounds, accent-only colors, no gradients, clean borders.

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/RouteCheckTab.tsx src/components/panels/RoutePlannerTab.tsx src/components/panels/RoutePanelContent.tsx src/components/panels/RouteComparison.tsx
git commit -m "feat(design): editorial route panels

- Replace all gradient buttons/backgrounds with solid colors
- Replace cyan/indigo/purple with single accent
- Reduce border-radius to rounded-md
- Remove decorative shadows and overlays
- Add aria-labels, role=switch, aria-checked, aria-selected"
```

---

### Task 6: Mode Panels

Apply editorial styling to Map, Explore, Density, Network, and Custom Route panels.

**Files:**
- Modify: `src/components/panels/MapPanel.tsx`
- Modify: `src/components/panels/ExplorePanel.tsx`
- Modify: `src/components/panels/ExploreTab.tsx`
- Modify: `src/components/panels/DensityPanel.tsx`
- Modify: `src/components/panels/NetworkPanel.tsx`
- Modify: `src/components/panels/NetworkPanelContent.tsx`
- Modify: `src/components/panels/CustomRoutePanel.tsx`

- [ ] **Step 1: Global search-and-replace across all 7 files**

Apply these replacements in every file:
- `text-cyan-400` → `text-accent`
- `text-cyan-300` → `text-accent`
- `bg-cyan-500/10` → `bg-accent/10`
- `bg-cyan-500/20` → `bg-accent/10`
- `bg-cyan-500` → `bg-accent`
- `border-cyan-500/30` → `border-dark-600`
- `border-cyan-500` → `border-accent`
- `text-indigo-*` → `text-accent`
- `text-purple-*` → `text-accent`
- `bg-purple-*/10` → `bg-accent/10`
- `bg-gradient-to-br from-dark-800 to-dark-900` → `bg-dark-800`
- `bg-gradient-to-br from-purple-600/20 to-indigo-600/20` → `bg-accent/10`
- `border border-purple-500/30` → `border border-dark-600`
- `rounded-2xl` → `rounded-md`
- `shadow-xl shadow-black/20` → (remove)
- `shadow-2xl shadow-black/30` → (remove)
- `backdrop-blur-md` → (remove)
- `backdrop-blur-sm` → (remove)
- `text-[10px]` → `text-xs`
- `text-[11px]` → `text-xs`
- `text-[9px]` → `text-xs`

- [ ] **Step 2: Update toggle switches in all panels**

For every toggle that uses `w-8 h-[18px]`, update to:
```tsx
<button
  role="switch"
  aria-checked={isEnabled}
  aria-label="Toggle [feature name]"
  onClick={handleToggle}
  className="relative w-10 h-[22px] rounded-full transition-colors duration-150"
>
  <div className={`absolute inset-0 rounded-full ${isEnabled ? 'bg-accent' : 'bg-dark-600'}`} />
  <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-150 ${
    isEnabled ? 'translate-x-[20px]' : 'translate-x-[2px]'
  }`} />
</button>
```

- [ ] **Step 3: Add aria-labels to all interactive elements**

Each panel has expand/collapse buttons, filter toggles, and links. Add:
- `aria-label` to every icon-only button
- `aria-expanded` to every collapsible section trigger
- `aria-hidden="true"` to all decorative SVG icons

- [ ] **Step 4: Verify visually**

Run: `npm run dev`, cycle through all modes.
Check: Consistent editorial styling across Map, Timeline, Density, Network modes.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/MapPanel.tsx src/components/panels/ExplorePanel.tsx src/components/panels/ExploreTab.tsx src/components/panels/DensityPanel.tsx src/components/panels/NetworkPanel.tsx src/components/panels/NetworkPanelContent.tsx src/components/panels/CustomRoutePanel.tsx
git commit -m "feat(design): editorial mode panels

- Unify all panels to single accent color
- Replace all cyan/indigo/purple references
- Remove gradient backgrounds and decorative shadows
- Increase toggle switch size to 40x22px with role=switch
- Add aria-labels and aria-expanded throughout"
```

---

### Task 7: Map Overlays

Strip the decorative chrome from everything that floats over the map.

**Files:**
- Modify: `src/components/map/MapSearch.tsx`
- Modify: `src/components/map/CameraStats.tsx`
- Modify: `src/components/map/MapStyleControl.tsx`
- Modify: `src/components/map/NetworkLegendBar.tsx`
- Modify: `src/components/map/DensityLegendBar.tsx`
- Modify: `src/components/map/NetworkAgencyCount.tsx`

- [ ] **Step 1: Update MapSearch.tsx**

- Replace `backdrop-blur-md` with solid `bg-dark-800`
- Replace `rounded-2xl` with `rounded-md`
- Replace `shadow-xl` with `shadow-none` (or remove)
- Replace search result container: solid `bg-dark-700` background, `border border-dark-600`, `rounded-md`
- Replace `text-gray-400` with `text-dark-400`
- Add `aria-label="Search locations"` to search input
- Add `aria-label="Clear search"` to clear button
- Add `aria-label="Search"` to search button
- Add `role="listbox"` to results dropdown, `role="option"` to each result

- [ ] **Step 2: Update CameraStats.tsx**

Replace the entire card wrapper. The camera count should be flat text, not a blurred card:

- Remove `backdrop-blur-md`, `rounded-2xl`, `shadow-xl`, `bg-dark-900/95`
- Replace with: `bg-dark-800/90 rounded-md px-3 py-1.5 border border-dark-600`
- Remove the REC indicator dot and `rec-indicator` class
- Camera count: `<span className="text-accent font-semibold tabular-nums">{count}</span>`
- Label: `<span className="text-dark-400 text-xs ml-1.5">in view</span>`
- Remove `font-display` from count — use default DM Sans

- [ ] **Step 3: Update MapStyleControl.tsx**

Replace ALL hard-coded hex values with Tailwind tokens:
- `bg-[#12121a]` → `bg-dark-800`
- `border-[#2a2a38]` → `border-dark-600`
- `text-[#9ca3af]` → `text-dark-400`
- `text-[#d1d5db]` → `text-dark-300`
- `bg-[#2a2a38]` → `bg-dark-600`
- `hover:bg-[#1a1a24]` → `hover:bg-dark-700`
- `bg-cyan-500/15` → `bg-accent/10`
- `text-white` (active) → `text-dark-100`
- `bg-cyan-500` (indicator dot) → `bg-accent`
- `bg-cyan-600` (toggle track) → `bg-accent`
- `shadow-[0_4px_16px_rgba(0,0,0,0.5)]` → remove
- `rounded-xl` → `rounded-md`
- Trigger button: `w-[40px] h-[40px]` → `w-9 h-9` (36px)
- `rounded-[14px]` → `rounded-md`
- Add `aria-label="Change map style"` to trigger button
- Add `aria-expanded={isOpen}` to trigger button
- Add `role="switch"` and `aria-checked={labels}` to labels toggle

- [ ] **Step 4: Update legend bars**

For `NetworkLegendBar.tsx`, `DensityLegendBar.tsx`, `NetworkAgencyCount.tsx`:
- Remove `backdrop-blur-md`
- Remove `rounded-2xl`, `shadow-xl`
- Replace with: flat text on a subtle `bg-dark-800/90 rounded-md px-3 py-2 border border-dark-600` background
- Replace `text-dark-500` (fails contrast) with `text-dark-400`
- Replace `text-blue-400` with `text-accent`
- Add `aria-label` to legend containers

- [ ] **Step 5: Verify visually**

Run: `npm run dev`
Check: All map overlays are flat, no blur, no decorative shadows. Camera count is inline text. Legends are subtle flat bars.

- [ ] **Step 6: Commit**

```bash
git add src/components/map/MapSearch.tsx src/components/map/CameraStats.tsx src/components/map/MapStyleControl.tsx src/components/map/NetworkLegendBar.tsx src/components/map/DensityLegendBar.tsx src/components/map/NetworkAgencyCount.tsx
git commit -m "feat(design): strip map overlay chrome

- Replace backdrop-blur with solid backgrounds on all overlays
- Replace hard-coded hex with Tailwind tokens in MapStyleControl
- Flat camera count text, no REC indicator
- Flat legend bars with border, no shadows
- Add aria-labels, aria-expanded, role attributes"
```

---

### Task 8: Map Layers & Markers

Simplify camera markers and update map layer styling.

**Files:**
- Modify: `src/components/map/layers/CameraMarkerLayers.tsx`
- Modify: `src/components/map/MapLibreContainer.tsx`
- Modify: `src/components/map/layers/BoundaryOverlayLayers.tsx`
- Modify: `src/components/map/WaypointLayer.tsx`

- [ ] **Step 1: Update CameraMarkerLayers.tsx**

- Replace any `#1E90FF` with `#0080BC` for marker colors
- Replace cluster background colors to use `#0080BC`
- Update cluster text font to `'DM Sans', 'Arial Unicode MS Bold'` (replacing `'Open Sans Bold'`)
- Simplify marker paint properties — remove glow/halo properties if any exist in MapLibre paint configuration

- [ ] **Step 2: Update MapLibreContainer.tsx popup styles**

Find the camera popup rendering section and update:
- Remove any `backdrop-blur` from popup wrappers
- Replace inline color values with token equivalents
- Replace `text-cyan-*` with `text-accent`
- Replace `rounded-2xl` with `rounded-md`
- Replace `max-w-[120px]` labels: ensure text-xs minimum
- Add `aria-label` to popup close button if custom

- [ ] **Step 3: Update BoundaryOverlayLayers.tsx**

Replace hard-coded hex values in MapLibre paint properties:
- `#6b7280` → keep (this is a map layer color, not a UI token — map layers can't use Tailwind)
- `#3b82f6` → `#0080BC` (align to brand)
- Document in a comment: `// Map layer colors — not Tailwind tokens, used in MapLibre GL paint properties`

- [ ] **Step 4: Update WaypointLayer.tsx**

- Replace `#8b5cf6` (purple) with `#0080BC` for waypoint line color
- Remove reference to `waypoint-pulse` animation class (deleted in Task 1)

- [ ] **Step 5: Verify visually**

Run: `npm run dev`, zoom into camera clusters.
Check: Markers are solid blue dots, no glow. Popups have flat styling. Waypoints are accent-colored.

- [ ] **Step 6: Commit**

```bash
git add src/components/map/layers/CameraMarkerLayers.tsx src/components/map/MapLibreContainer.tsx src/components/map/layers/BoundaryOverlayLayers.tsx src/components/map/WaypointLayer.tsx
git commit -m "feat(design): simplify map markers and layers

- Replace marker colors with brand #0080BC
- Remove glow/halo from camera markers
- Update popup styling to editorial flat style
- Replace purple waypoint color with accent
- Update cluster text font to DM Sans"
```

---

### Task 9: Mode Controls

Update the visualization controls for Heatmap, Density, Timeline, and Dot Density modes.

**Files:**
- Modify: `src/modes/heatmap/HeatmapControls.tsx`
- Modify: `src/modes/heatmap/HeatmapLegend.tsx`
- Modify: `src/modes/density/DensityControls.tsx`
- Modify: `src/modes/density/DensityLegend.tsx`
- Modify: `src/modes/density/DensityFeaturePopup.tsx`
- Modify: `src/modes/dots/DotDensityControls.tsx`
- Modify: `src/modes/timeline/TimelineBar.tsx`

- [ ] **Step 1: Global replacements across all 7 files**

Same pattern as Task 6:
- `text-cyan-400` → `text-accent`
- `bg-cyan-500/10` → `bg-accent/10`
- `bg-cyan-500` → `bg-accent`
- `border-cyan-500/40` → `border-dark-600`
- `accent-cyan-500` (on range inputs) → `accent-[#0080BC]`
- `[&::-webkit-slider-thumb]:bg-cyan-500` → `[&::-webkit-slider-thumb]:bg-accent`
- `ring-cyan-500/20` → `ring-accent/20`
- `backdrop-blur-md` → remove
- `text-dark-500` → `text-dark-400` (contrast fix)
- `text-[10px]` → `text-xs`
- `text-[11px]` → `text-xs`

- [ ] **Step 2: Add aria-labels to all controls**

- Range sliders: `aria-label="Heatmap intensity"`, `aria-label="Heatmap radius"`, `aria-label="Density opacity"`, etc.
- Color scheme buttons: `aria-label="Color scheme: Viridis"` etc.
- Play/pause button: `aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}`
- Speed slider: `aria-label="Playback speed"`
- Toggle buttons: add `role="switch"` and `aria-checked`

- [ ] **Step 3: Update HeatmapLegend and DensityLegend**

- Remove `backdrop-blur-md`
- Replace `bg-dark-900/95` with `bg-dark-800/90`
- Add `border border-dark-600 rounded-md`
- Replace `text-dark-500` with `text-dark-400`

- [ ] **Step 4: Update DensityFeaturePopup**

- Remove gradient backgrounds
- Use solid `bg-dark-700 border border-dark-600 rounded-md`
- Replace accent colors with `accent`

- [ ] **Step 5: Verify visually**

Run: `npm run dev`, switch to Timeline, Density, and Heatmap modes.
Check: Controls use accent color, legends are flat, no blur or gradients.

- [ ] **Step 6: Commit**

```bash
git add src/modes/
git commit -m "feat(design): editorial mode controls

- Unify all mode controls to accent color
- Remove backdrop-blur from legends
- Fix contrast: text-dark-500 → text-dark-400
- Fix minimum text size: 10px/11px → 12px
- Add aria-labels to all sliders, toggles, play/pause"
```

---

### Task 10: Mobile Components

Update BottomSheet, MobileTabDrawer, and MobileRoutePreview.

**Files:**
- Modify: `src/components/common/BottomSheet.tsx`
- Modify: `src/components/panels/MobileTabDrawer.tsx`
- Modify: `src/components/panels/MobileRoutePreview.tsx`

- [ ] **Step 1: Update BottomSheet.tsx**

- Replace spring animation config `{ type: 'spring', stiffness: 500, damping: 50, mass: 0.8 }` with `{ type: 'tween', duration: 0.3, ease: [0.25, 1, 0.5, 1] }` (ease-out-quart)
- Replace `backdrop-blur-xl` → remove
- Replace `bg-dark-900/98` → `bg-dark-800`
- Replace `rounded-t-2xl` → `rounded-t-xl`
- Replace `shadow-2xl` → remove
- Drag handle: replace current styling with `w-8 h-[3px] rounded-full bg-dark-500`
- Add `role="dialog"` and `aria-label="Panel"` to the sheet container

- [ ] **Step 2: Update MobileTabDrawer.tsx**

Apply the standard replacements:
- All `text-cyan-*` → `text-accent`
- All `bg-cyan-*` → `bg-accent/10` or `bg-accent`
- `backdrop-blur-*` → remove
- `rounded-2xl` → `rounded-md`
- `text-dark-400` descriptions: keep (passes contrast at 5.8:1)
- `text-[10px]` → `text-xs`
- Toggle switches: increase size, add `role="switch"`, `aria-checked`
- Add `aria-label` to all tab navigation buttons

- [ ] **Step 3: Update MobileRoutePreview.tsx**

- Replace gradient backgrounds with solid `bg-dark-800`
- Replace accent colors
- Add `aria-label` to interactive elements

- [ ] **Step 4: Verify visually**

Run: `npm run dev` at a narrow viewport (<1024px).
Check: BottomSheet slides smoothly (no bounce), editorial styling, flat backgrounds.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/BottomSheet.tsx src/components/panels/MobileTabDrawer.tsx src/components/panels/MobileRoutePreview.tsx
git commit -m "feat(design): editorial mobile components

- Replace spring animation with ease-out-quart tween
- Remove backdrop-blur from BottomSheet
- Unify MobileTabDrawer colors to accent
- Add role=dialog, aria-labels to BottomSheet
- Increase toggle sizes for touch targets"
```

---

### Task 11: Accessibility Pass — AddressSearch & Form Associations

The most critical accessibility component — the address input used across Route modes.

**Files:**
- Modify: `src/components/inputs/AddressSearch.tsx`

- [ ] **Step 1: Fix label association**

Find the `<label>` element (around line 309) and add `htmlFor`:

```tsx
{label && (
  <label htmlFor={`address-input-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-xs uppercase tracking-widest text-dark-400 mb-1.5 block">
    {label}
  </label>
)}
```

Add matching `id` to the input:

```tsx
<input
  id={`address-input-${label?.toLowerCase().replace(/\s+/g, '-') ?? 'search'}`}
  // ... rest of props
/>
```

- [ ] **Step 2: Fix error message association**

Add `id` to error display and `aria-describedby` to input:

```tsx
{error && (
  <div id={`address-error-${label?.toLowerCase().replace(/\s+/g, '-') ?? 'search'}`} className="text-danger text-xs mt-1" role="alert">
    {error}
  </div>
)}
```

Add to input: `aria-describedby={error ? `address-error-${...}` : undefined}`

- [ ] **Step 3: Add aria-labels to all buttons**

- Clear button: `aria-label="Clear address"`
- Search button: `aria-label="Search address"`
- Use my location button: `aria-label="Use my location"`
- Pick on map button: `aria-label="Pick location on map"`

- [ ] **Step 4: Add dropdown aria attributes**

- Results container: `role="listbox"`, `aria-label="Search results"`
- Each result: `role="option"`
- Input: `aria-expanded={showResults}`, `aria-controls="address-results-list"`, `aria-autocomplete="list"`

- [ ] **Step 5: Update styling**

- Replace `accent-primary` → `accent`
- Replace `accent-danger` → `danger`
- Replace `accent-success` → `success`
- Replace `purple-*` → `accent`
- Replace `text-[10px]` → `text-xs`

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/inputs/AddressSearch.tsx
git commit -m "feat(a11y): fix AddressSearch accessibility

- Associate labels with inputs via htmlFor/id
- Link error messages via aria-describedby
- Add aria-labels to all icon buttons
- Add role=listbox to results dropdown
- Add aria-expanded, aria-autocomplete to input"
```

---

### Task 12: Final Cleanup — Loading Screen & Main Entry

Update the remaining files and do a final verification sweep.

**Files:**
- Modify: `src/components/map/MapLoadingScreen.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Update MapLoadingScreen.tsx**

- Replace `backdrop-blur-md` → remove
- Replace `border-blue-400` → `border-accent`
- Replace `border-t-blue-400` → `border-t-accent`
- Replace `bg-gradient-to-r from-blue-600 to-blue-500` → `bg-accent`
- Replace `bg-dark-900/95` → `bg-dark-900`
- Replace `font-display` metric numbers → keep (Space Grotesk is display)
- Replace `text-dark-500` → `text-dark-400`
- Add `aria-label="Retry loading"` to retry button
- Add `aria-live="polite"` to progress text container
- Add `role="progressbar"` and `aria-valuenow` to progress bar if applicable

- [ ] **Step 2: Update src/main.tsx**

- Replace `backdrop-blur-md` → remove
- Replace `border-t-blue-400` → `border-t-accent`
- Replace any hard-coded colors with tokens

- [ ] **Step 3: Full build verification**

Run: `npm run build`
Expected: Build succeeds with zero errors.

Run: `npm run lint`
Expected: No new lint errors introduced.

- [ ] **Step 4: Visual smoke test**

Run: `npm run dev` and verify each mode:
1. Map mode — camera markers, overlays, panel
2. Route mode — both Route Check and Route Planner tabs, run a test route
3. Timeline mode — play/pause, date scrubbing
4. Density mode — toggle views, check legend
5. Network mode — check legend, agency count
6. Mobile viewport — BottomSheet behavior, tab navigation
7. Keyboard navigation — tab through header, panels, inputs

- [ ] **Step 5: Commit**

```bash
git add src/components/map/MapLoadingScreen.tsx src/main.tsx
git commit -m "feat(design): update loading screen and main entry

- Remove backdrop-blur from loading screen
- Replace gradient progress bar with solid accent
- Add aria-live, aria-label to loading states
- Final file of editorial redesign"
```

---

## Verification Checklist

After all 12 tasks, confirm:

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No `cyan-` classes remain in any component (grep for `cyan`)
- [ ] No `indigo-` classes remain (grep for `indigo`)
- [ ] No `purple-` classes remain in map components (grep for `purple`)
- [ ] No `bg-gradient-to-` on buttons (grep for `bg-gradient`)
- [ ] No `backdrop-blur` on panels/overlays (grep for `backdrop-blur`)
- [ ] No `text-[10px]` or `text-[11px]` (grep for `text-\[1[01]px\]`)
- [ ] No `rounded-2xl` on components (grep for `rounded-2xl`)
- [ ] No hard-coded `#12121a`, `#2a2a38`, `#818cf8`, `#22d3ee` in components (grep each)
- [ ] All icon buttons have `aria-label`
- [ ] All inputs have associated labels
- [ ] All dropdowns have `aria-expanded`
- [ ] All toggles have `role="switch"` and `aria-checked`
