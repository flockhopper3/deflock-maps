# DeFlock Fork Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip FlockHopper to the bare map application and rebrand for hosting at `maps.deflock.org`.

**Architecture:** Delete all non-map pages (landing, privacy, terms, support, defend/game), their associated components/stores/services, documentation, and unused assets. Update the router to serve MapPage at `/`. Rebrand domain references from `dontgetflocked.com` to `maps.deflock.org`. Keep the FlockHopper logo files in place for a future swap.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, MapLibre GL, Tailwind CSS

---

## File Map

**Delete (files):**
- `src/pages/LandingPage.tsx`
- `src/pages/PrivacyPolicy.tsx`
- `src/pages/TermsOfUse.tsx`
- `src/pages/SupportProject.tsx`
- `src/pages/DefendPage.tsx`
- `src/services/gameEngine.ts`
- `src/store/gameStore.ts`
- `src/store/landingStore.ts`
- `src/store/audioStore.ts`
- `CODEBASE_ANALYSIS.md`
- `CODEBASE_GUIDE.md`
- `CONTRIBUTING.md`
- `DEPLOYMENT.md`
- `README.md`
- `ROUTING_ALGORITHM_ANALYSIS.md`
- `FlockHopper (1).png`
- `FlockHopper-4.png`
- `FlockHopper.png`
- `public/btc-qr.png`
- `public/xmr-qr.png`
- `public/FlockHopper-2.png`
- `public/FlockHopper-4.png`
- `public/FlockHopper-5.png`
- `public/FlockHopper.png`
- `public/sitemap.xml`

**Delete (directories):**
- `src/components/landing/`
- `src/components/game/`
- `graphhopper/`
- `Routing grass/`
- `load-tests/`
- `DATA ANALYSIS/`
- `scripts/`
- `public/audio/`
- `public/usa-animation/`
- `docs/plans/`
- `docs/FLOCKHOPPER-DATA-INTEGRATION-REFERENCE.md`
- `docs/OSM-DATA-AUTOMATION.md`
- `docs/Sharing Network Arc Visualization — Impl.ini`

**Modify:**
- `src/main.tsx`
- `src/pages/index.ts`
- `src/pages/MapPage.tsx`
- `src/pages/NotFound.tsx`
- `src/store/index.ts`
- `src/components/map/MapLoadingScreen.tsx`
- `src/components/common/Seo.tsx`
- `index.html`
- `public/robots.txt`
- `public/_headers`
- `package.json`
- `CLAUDE.md`

---

### Task 1: Delete all dead files and directories

**Files:** All items in the "Delete" lists above.

This is the big sweep. Everything here is either a page, component, store, service, doc, or asset that the map app does not need.

- [ ] **Step 1: Delete source files (pages, stores, services, game/landing components)**

```bash
cd "/Users/jackcauthen/Documents/Developer/FLOCK/DEFLOCK Website/FlockHopper Fork/3:28/FlockHopper"

# Pages
rm src/pages/LandingPage.tsx
rm src/pages/PrivacyPolicy.tsx
rm src/pages/TermsOfUse.tsx
rm src/pages/SupportProject.tsx
rm src/pages/DefendPage.tsx

# Stores
rm src/store/gameStore.ts
rm src/store/landingStore.ts
rm src/store/audioStore.ts

# Services
rm src/services/gameEngine.ts

# Component directories
rm -rf src/components/landing
rm -rf src/components/game
```

- [ ] **Step 2: Delete root documentation and images**

```bash
rm "CODEBASE_ANALYSIS.md"
rm "CODEBASE_GUIDE.md"
rm "CONTRIBUTING.md"
rm "DEPLOYMENT.md"
rm "README.md"
rm "ROUTING_ALGORITHM_ANALYSIS.md"
rm "FlockHopper (1).png"
rm "FlockHopper-4.png"
rm "FlockHopper.png"
```

- [ ] **Step 3: Delete non-essential root directories**

```bash
rm -rf graphhopper
rm -rf "Routing grass"
rm -rf load-tests
rm -rf "DATA ANALYSIS"
rm -rf scripts
```

- [ ] **Step 4: Delete docs (keep docs/superpowers/)**

```bash
rm -rf docs/plans
rm "docs/FLOCKHOPPER-DATA-INTEGRATION-REFERENCE.md"
rm "docs/OSM-DATA-AUTOMATION.md"
rm "docs/Sharing Network Arc Visualization — Impl.ini"
```

- [ ] **Step 5: Delete public assets**

```bash
rm -rf public/audio
rm -rf public/usa-animation
rm public/btc-qr.png
rm public/xmr-qr.png
rm public/FlockHopper-2.png
rm public/FlockHopper-4.png
rm public/FlockHopper-5.png
rm public/FlockHopper.png
rm public/sitemap.xml
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: delete non-map pages, components, docs, and assets

Remove landing page, privacy policy, terms, support, defend game,
GraphHopper docs, load tests, data analysis, unused images, and
all associated stores/services/components."
```

---

### Task 2: Fix router and barrel exports in main.tsx

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/pages/index.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Rewrite `src/main.tsx`**

Replace the entire file with:

```tsx
import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/common';
import { useCameraStore } from './store/cameraStore';
import './index.css';

// Polyfill for Safari (doesn't support requestIdleCallback)
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = (callback: IdleRequestCallback): number => {
    const start = Date.now();
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1) as unknown as number;
  };
  window.cancelIdleCallback = (id: number) => clearTimeout(id);
}

// Lazy load pages for code splitting
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900 overflow-hidden">
      <header className="h-14 lg:h-16 bg-dark-900/95 backdrop-blur-md border-b border-dark-600 flex items-center z-50 shrink-0">
        <div className="w-full px-3 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="h-8 lg:h-10 w-32 bg-dark-700 rounded animate-pulse" />
            <div className="h-8 w-24 bg-dark-700 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img
            src="/FlockHopper-3.png"
            alt="Loading"
            className="h-16 lg:h-20 w-auto object-contain"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-dark-700 border-t-accent-danger rounded-full animate-spin" />
            <span className="text-dark-400 text-sm font-display">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PreloadManager - Starts camera data fetch in the background.
 * Uses requestIdleCallback to avoid blocking user interactions.
 */
function PreloadManager() {
  const preloadCameras = useCameraStore((state) => state.preloadCameras);
  const isInitialized = useCameraStore((state) => state.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      const idleId = requestIdleCallback(() => {
        preloadCameras();
      }, { timeout: 100 });
      return () => cancelIdleCallback(idleId);
    }
  }, [isInitialized, preloadCameras]);

  useEffect(() => {
    if (!document.querySelector('link[href="/cameras-us.json"]')) {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = '/cameras-us.json';
      prefetchLink.as = 'fetch';
      prefetchLink.crossOrigin = 'anonymous';
      document.head.appendChild(prefetchLink);
    }
  }, []);

  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <PreloadManager />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/explore" element={<MapPage />} />
              <Route path="/timeline" element={<MapPage />} />
              <Route path="/analysis" element={<MapPage />} />
              <Route path="/network" element={<MapPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
```

- [ ] **Step 2: Update `src/pages/index.ts`**

Replace contents with:

```ts
export { MapPage } from './MapPage'
export { NotFound } from './NotFound'
```

- [ ] **Step 3: Update `src/store/index.ts`**

Remove the `useLandingStore` and `useAudioStore` exports. Replace contents with:

```ts
export { useCameraStore } from './cameraStore';
export { useRouteStore } from './routeStore';
export { useMapStore } from './mapStore';
export { useCustomRouteStore } from './customRouteStore';
export { useAppModeStore } from './appModeStore';
export type { AppMode, ExploreFeature, HeatmapSettings, ColorSchemeId, MapVisualizationType, DensityLevel, DensityMetric, DensityViewMode, DensitySettings } from './appModeStore';
export { useDensityStore } from './densityStore';
export { useNetworkStore } from './networkStore';
export type { NetworkNode, NetworkLoadPhase } from './networkStore';
```

- [ ] **Step 4: Verify build compiles**

```bash
npm run build
```

Expected: Build succeeds with no import errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/pages/index.ts src/store/index.ts
git commit -m "fix: update router and barrel exports for deleted pages/stores"
```

---

### Task 3: Update MapPage header — remove Home/Support, link logo to deflock.org

**Files:**
- Modify: `src/pages/MapPage.tsx`

The MapPage header currently has:
- Logo linking to `/home` (landing page — deleted)
- Desktop "Home" link and "Support this project" button
- Mobile menu with Home and Support items

All of these need to go. Logo links to `deflock.org` instead.

- [ ] **Step 1: Update imports at top of `src/pages/MapPage.tsx`**

Change line 2 from:
```tsx
import { Link, useSearchParams, useLocation } from 'react-router-dom';
```
to:
```tsx
import { useSearchParams, useLocation } from 'react-router-dom';
```

Change line 17 from:
```tsx
import { Home, HeartHandshake, Route, Compass, BarChart3, Menu, X, Network } from 'lucide-react';
```
to:
```tsx
import { Route, Compass, BarChart3, Menu, X, Network } from 'lucide-react';
```

Remove line 19 (the `Button` import):
```tsx
import { Button } from '@/components/ui/button';
```

- [ ] **Step 2: Replace the logo `<Link>` with an `<a>` tag to deflock.org**

Find (around line 261):
```tsx
              <Link to="/home" className="flex items-center group flex-shrink-0">
                <img
                  src="/FlockHopper-3.png"
                  alt="FlockHopper Logo"
                  className="h-8 lg:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-110"
                />
              </Link>
```

Replace with:
```tsx
              <a href="https://deflock.org" className="flex items-center group flex-shrink-0">
                <img
                  src="/FlockHopper-3.png"
                  alt="DeFlock Logo"
                  className="h-8 lg:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-110"
                />
              </a>
```

- [ ] **Step 3: Replace the desktop right section (remove Home + Support)**

Find (around line 316-332):
```tsx
              {/* Desktop: Right section */}
              <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
                <Link
                  to="/home"
                  className="flex items-center gap-2 text-sm text-dark-300 hover:text-dark-100 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  <a href="https://buymeacoffee.com/dontgetflocked" target="_blank" rel="noopener noreferrer">Support this project</a>
                </Button>
              </div>
```

Replace with an empty placeholder to preserve layout balance:
```tsx
              {/* Desktop: Right section */}
              <div className="hidden lg:flex items-center gap-4 flex-shrink-0" />
```

- [ ] **Step 4: Replace the mobile slide-down menu (remove Home + Support items)**

Find the mobile menu section (around line 337-397). Replace the entire block from `{/* Mobile slide-down menu */}` through the mobile menu backdrop with:

```tsx
        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-14 left-0 right-0 z-[60] bg-dark-900/98 backdrop-blur-xl border-b border-dark-600 shadow-2xl shadow-black/40">
            <nav className="px-4 py-3 space-y-1">
              {/* Mode tabs */}
              {(Object.entries(MODE_LABELS) as [AppMode, typeof MODE_LABELS[AppMode]][]).map(([mode, { icon: Icon, label }]) => (
                <button
                  key={mode}
                  onClick={() => {
                    handleSetAppMode(mode);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    appMode === mode
                      ? 'bg-dark-700 text-white shadow-sm shadow-black/20'
                      : 'text-dark-300 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                  {appMode === mode && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-accent-danger shadow-[0_0_6px_rgba(239,68,68,0.6)]"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Mobile menu backdrop */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-[55] bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
```

- [ ] **Step 5: Update the SEO title and sr-only heading**

Find (around line 227-233):
```tsx
  const seo = (
    <Seo
      title="FlockHopper Map | Explore Flock & ALPR Cameras and Privacy Routes"
      description="Explore the national Flock and ALPR camera map and compare direct routes with privacy-optimized alternatives."
      path="/"
    />
  );
```

Replace with:
```tsx
  const seo = (
    <Seo
      title="DeFlock Maps | ALPR Camera Map & Privacy Routes"
      description="Explore the national ALPR camera map and compare direct routes with privacy-optimized alternatives."
      path="/"
    />
  );
```

Find (around line 412):
```tsx
            <h1 className="sr-only">FlockHopper ALPR Camera Map</h1>
```

Replace with:
```tsx
            <h1 className="sr-only">DeFlock ALPR Camera Map</h1>
```

- [ ] **Step 6: Verify build compiles**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat: update MapPage header for DeFlock — logo links to deflock.org, remove Home/Support"
```

---

### Task 4: Update MapLoadingScreen — remove Home/Support links

**Files:**
- Modify: `src/components/map/MapLoadingScreen.tsx`

- [ ] **Step 1: Update imports**

Replace line 2-3:
```tsx
import { Link } from 'react-router-dom';
import { Home, HeartHandshake } from 'lucide-react';
```

With (remove imports entirely — they are no longer needed):
```tsx
```

(Both `Link`, `Home`, and `HeartHandshake` are only used in the header nav items being removed.)

- [ ] **Step 2: Replace the loading screen header**

Find (lines 75-113):
```tsx
      <header className="h-14 lg:h-16 bg-dark-900/95 backdrop-blur-md border-b border-dark-600 flex items-center z-50 shrink-0">
        <div className="w-full px-3 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Logo */}
            <Link to="/home" className="flex items-center group">
              <img
                src="/FlockHopper-3.png"
                alt="FlockHopper Logo"
                className="h-8 lg:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-110"
              />
            </Link>

            {/* Loading indicator in header */}
            <div className="flex items-center gap-2 bg-dark-800 rounded-full px-3 py-1.5">
              <div className="w-3 h-3 border-2 border-dark-600 border-t-accent-danger rounded-full animate-spin"></div>
              <span className="text-sm text-dark-300">Loading{dots}</span>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <a
                href="https://buymeacoffee.com/dontgetflocked"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Support this project"
                className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <HeartHandshake className="w-4 h-4" />
              </a>
              <Link
                to="/home"
                className="hidden lg:flex items-center gap-2 text-sm text-dark-300 hover:text-dark-100 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </header>
```

Replace with:
```tsx
      <header className="h-14 lg:h-16 bg-dark-900/95 backdrop-blur-md border-b border-dark-600 flex items-center z-50 shrink-0">
        <div className="w-full px-3 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Logo */}
            <a href="https://deflock.org" className="flex items-center group">
              <img
                src="/FlockHopper-3.png"
                alt="DeFlock Logo"
                className="h-8 lg:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-110"
              />
            </a>

            {/* Loading indicator in header */}
            <div className="flex items-center gap-2 bg-dark-800 rounded-full px-3 py-1.5">
              <div className="w-3 h-3 border-2 border-dark-600 border-t-accent-danger rounded-full animate-spin"></div>
              <span className="text-sm text-dark-300">Loading{dots}</span>
            </div>

            <div className="hidden lg:flex items-center gap-4 flex-shrink-0" />
          </div>
        </div>
      </header>
```

- [ ] **Step 3: Update alt text on logo images in the loading/error states**

Find (line 141-142):
```tsx
              src="/FlockHopper-3.png"
              alt="FlockHopper"
```
Replace with:
```tsx
              src="/FlockHopper-3.png"
              alt="DeFlock"
```

Find (line 165-166):
```tsx
              src="/FlockHopper-3.png"
              alt="FlockHopper"
```
Replace with:
```tsx
              src="/FlockHopper-3.png"
              alt="DeFlock"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/map/MapLoadingScreen.tsx
git commit -m "feat: update MapLoadingScreen for DeFlock — remove Home/Support, rebrand alt text"
```

---

### Task 5: Update NotFound page — link to map instead of deleted /home

**Files:**
- Modify: `src/pages/NotFound.tsx`

- [ ] **Step 1: Update `src/pages/NotFound.tsx`**

Replace the entire file with:

```tsx
import { Link } from 'react-router-dom';
import { Map, ArrowLeft } from 'lucide-react';
import { Seo } from '@/components/common';

export function NotFound() {
  return (
    <>
      <Seo
        title="Page Not Found | DeFlock Maps"
        description="The page you requested could not be found."
        noIndex
      />
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          {/* 404 Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center">
              <svg className="w-16 h-16 text-accent-danger" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-2 border-dashed border-accent-danger/30 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          <h1 className="text-6xl font-display font-black text-white mb-4">
            404
          </h1>

          <p className="text-xl text-dark-200 mb-2">
            Page Not Found
          </p>

          <p className="text-dark-400 mb-8">
            Looks like this route doesn't exist.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-primary/80 text-white font-semibold transition-colors"
            >
              <Map className="w-5 h-5" />
              Go to Map
            </Link>
          </div>

          <button
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/NotFound.tsx
git commit -m "feat: update NotFound page for DeFlock — link to map root instead of /home"
```

---

### Task 6: Rebrand index.html and meta tags for maps.deflock.org

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Rewrite `index.html`**

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0a0a0f" />

    <!-- DNS Prefetch for external resources -->
    <link rel="dns-prefetch" href="https://tile.openstreetmap.org">

    <!-- Prefetch camera data for instant map loading -->
    <link rel="prefetch" href="/cameras-us.json" as="fetch" crossorigin="anonymous">

    <!-- Fonts - preload for fastest LCP -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" media="print" onload="this.media='all'">

    <!-- Static fallback meta (overridden per-page by React Helmet) -->
    <title>DeFlock Maps | ALPR Camera Map & Privacy Routes</title>
    <meta name="description" content="Explore ALPR camera locations and plan privacy-optimized routes across the United States." />
    <link rel="canonical" href="https://maps.deflock.org/" />
    <meta name="robots" content="index,follow" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="DeFlock Maps" />
    <meta property="og:title" content="DeFlock Maps | ALPR Camera Map & Privacy Routes" />
    <meta property="og:description" content="Explore ALPR camera locations and plan privacy-optimized routes across the United States." />
    <meta property="og:url" content="https://maps.deflock.org/" />
    <meta property="og:image" content="https://maps.deflock.org/FlockHopper-3.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="DeFlock Maps | ALPR Camera Map & Privacy Routes" />
    <meta name="twitter:description" content="Explore ALPR camera locations and plan privacy-optimized routes across the United States." />
    <meta name="twitter:image" content="https://maps.deflock.org/FlockHopper-3.png" />

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "DeFlock Maps",
      "url": "https://maps.deflock.org",
      "description": "ALPR camera map and privacy-focused route planning across the United States.",
      "applicationCategory": "NavigationApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "creator": {
        "@type": "Organization",
        "name": "DeFlock",
        "url": "https://deflock.org"
      }
    }
    </script>
  </head>
  <body class="bg-dark-900 text-dark-100">
    <style>
      .font-bold { font-weight: 700; }
      h1 { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
    </style>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Key changes: removed Leaflet CSS (legacy — app uses MapLibre), removed unpkg.com DNS prefetch, rebranded all titles/descriptions/URLs to DeFlock/maps.deflock.org, updated JSON-LD creator to DeFlock.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: rebrand index.html for DeFlock Maps at maps.deflock.org"
```

---

### Task 7: Update robots.txt and _headers

**Files:**
- Modify: `public/robots.txt`
- Modify: `public/_headers`

- [ ] **Step 1: Update `public/robots.txt`**

Replace contents with:

```
User-agent: *
Allow: /

Sitemap: https://maps.deflock.org/sitemap.xml
```

- [ ] **Step 2: Update `public/_headers` — remove audio and usa-animation sections**

Replace contents with:

```
# =============================================================================
# SECURITY HEADERS (Applied to all routes)
# =============================================================================
/*
  # Prevent clickjacking - site cannot be embedded in iframes
  X-Frame-Options: DENY

  # Prevent MIME type sniffing
  X-Content-Type-Options: nosniff

  # Control referrer information
  Referrer-Policy: strict-origin-when-cross-origin

  # Restrict browser features
  Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()

# =============================================================================
# RESOURCE-SPECIFIC HEADERS
# =============================================================================

# JSON data files
/*.json
  Content-Type: application/json
  Access-Control-Allow-Origin: *
```

Removed: `/audio/*` block (audio directory deleted), `/usa-animation/*.geojson` block (directory deleted).

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt public/_headers
git commit -m "chore: update robots.txt and _headers for DeFlock Maps"
```

---

### Task 8: Update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `package.json`**

Change `name` from `"flockhopper"` to `"deflock-maps"`.

Change `description` to `"ALPR camera map and privacy-focused route planning application, hosted at maps.deflock.org"`.

Remove the `"generate-qr"` script: `"generate-qr": "node scripts/generate-qr-codes.js"`.

Remove `"qrcode"` from `devDependencies` (it was only used by the deleted QR script).

Remove `"@types/qrcode"` from `devDependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: rebrand package.json for deflock-maps"
```

---

### Task 9: Update CLAUDE.md for DeFlock fork

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite `CLAUDE.md`**

Replace the entire file with:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeFlock Maps is a fork of FlockHopper, hosted at `maps.deflock.org`. It is a privacy-focused map application that visualizes ALPR camera locations across the United States and calculates alternative routes that minimize camera exposure. This fork is maintained by DeFlock, the organization that maps ALPR cameras.

## Commands

\`\`\`bash
npm run dev       # Start development server (port 3000)
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint
npm run preview   # Preview production build
\`\`\`

## Architecture

### Tech Stack
- React 18 + TypeScript + Vite
- Zustand for state management
- MapLibre GL for maps
- Tailwind CSS for styling
- FlockHopper Routing API (`api.dontgetflocked.com`) for routing

### Key Data Flow

1. **Camera Data Loading**: `PreloadManager` starts background fetch → `cameraStore` loads camera data → builds spatial grid (0.5° cells) for O(1) lookups

2. **Route Calculation** (`src/services/apiClient.ts`): Calls `api.dontgetflocked.com/api/v1/route` with origin, destination, and options. API handles all camera-aware routing. Returns both normal and avoidance routes with comparison metrics.

### App Modes

The map has 4 modes, selectable via the header tabs:
- **Route**: Camera-avoidance route planning
- **Explore**: Dot density visualization with timeline playback
- **Density (Analysis)**: Choropleth density analysis by state/county/tract
- **Network**: Sharing network visualization between agencies

### Critical Files

| File | Purpose |
|------|---------|
| `src/services/apiClient.ts` | API client — calls FlockHopper routing API |
| `src/services/routingConfig.ts` | Visualization constants for camera cones on map |
| `src/store/cameraStore.ts` | Camera data management + spatial grid indexing |
| `src/store/routeStore.ts` | Route calculation state and UI state |
| `src/pages/MapPage.tsx` | Main application page container |
| `src/components/map/MapLibreContainer.tsx` | Map rendering, camera markers, route layers |

### State Management Pattern

Zustand stores expose both state and actions. Key stores:
- `cameraStore`: Camera data, spatial grid, loading phases
- `routeStore`: Route calculation, active route display, UI state
- `customRouteStore`: Multi-leg waypoint routing
- `mapStore`: Map bounds/viewport
- `appModeStore`: Current app mode, visualization settings
- `densityStore`: Density visualization data
- `networkStore`: Sharing network data

### Directory Structure

\`\`\`
src/
├── components/
│   ├── common/     # ErrorBoundary, LoadingSpinner, BottomSheet, Seo
│   ├── inputs/     # AddressSearch autocomplete
│   ├── map/        # MapLibreContainer, MapSearch, CameraStats, MapLoadingScreen
│   ├── panels/     # RoutePanel, ExplorePanel, DensityPanel, NetworkPanel
│   └── ui/         # Shadcn components (button, slider, switch)
├── modes/          # Visualization modes (heatmap, timeline, dots, density)
├── pages/          # MapPage, NotFound
├── services/       # apiClient, geocodingService, gpxService, routingConfig
├── store/          # Zustand stores
├── types/          # TypeScript definitions
└── utils/          # geo, polyline, formatting
\`\`\`

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | FlockHopper API URL | `https://api.dontgetflocked.com` |
| `VITE_LOCATIONIQ_KEY` | LocationIQ geocoding API key | (optional) |
| `VITE_PERF_LOGGING` | Enable performance logging | `false` |

## Important Patterns

### Spatial Optimization
The spatial grid (0.5° cells) is critical for performance. Always use `getCamerasInBounds()` or `getCamerasInBoundsFromGrid()` rather than filtering the full camera array.

### Map Rendering
`MapLibreContainer.tsx` handles GeoJSON sources for clustered camera markers, direction cone visualization, route line rendering, and pulse animations.

### Code Splitting
Vite splits bundles by vendor: react-vendor, map-vendor, motion, geo-utils, state, deck-vendor. MapPage uses React lazy loading with Suspense.

## Data Sources

- **Camera Data**: Fetched via camera data service
- **ZIP Codes**: `/public/zipcodes-us.json` - Local lookup, no API needed
- **Map Tiles**: OpenStreetMap raster tiles
- **Geocoding**: Photon (OSM-based) with LocationIQ fallback
- **Density Data**: GeoJSON files in `/public/` (states, counties, tracts)
- **Network Data**: JSON files in `/public/` (adjacency, nodes)
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md for DeFlock Maps fork"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: Clean build, zero errors.

- [ ] **Step 2: Run the linter**

```bash
npm run lint
```

Expected: No new lint errors. (Pre-existing warnings are acceptable.)

- [ ] **Step 3: Grep for dead references to deleted pages/components**

```bash
grep -r "LandingPage\|PrivacyPolicy\|TermsOfUse\|SupportProject\|DefendPage\|gameStore\|landingStore\|audioStore\|gameEngine\|HeartHandshake\|buymeacoffee" src/ --include="*.ts" --include="*.tsx"
```

Expected: No matches.

- [ ] **Step 4: Grep for stale `/home` route references**

```bash
grep -r '"/home"' src/ --include="*.ts" --include="*.tsx"
```

Expected: No matches.

- [ ] **Step 5: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000` — should load the map directly. Verify:
- Logo in header links to deflock.org
- No Home or Support buttons visible
- Mode tabs (Route, Explore, Analysis, Network) all work
- 404 page at `/anything` shows "Go to Map" link

- [ ] **Step 6: Commit any fixes if needed, then final commit**

If all checks pass, no additional commit needed. If fixes were required, commit them:

```bash
git add -A
git commit -m "fix: resolve remaining issues from fork cleanup"
```
