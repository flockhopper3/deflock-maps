# DeFlock Fork Cleanup — Design Spec

## Context

FlockHopper is being forked for DeFlock, the organization that maps ALPR cameras. DeFlock will host the map app on `maps.deflock.org`. The fork must be stripped to the bare minimum: just the functional map application. All non-map pages, documentation, games, and unused assets are removed. FlockHopper branding in GPX exports is retained. The active logo files are kept in place for a future swap to DeFlock branding.

## Decisions

| Decision | Resolution |
|----------|------------|
| Logo link destination | `deflock.org` (external) |
| "Support this project" button | Removed entirely |
| "Home" nav link | Removed entirely |
| Map modes (Route/Explore/Density/Network) | All stay as-is |
| Routing API (`api.dontgetflocked.com`) | Stays as-is |
| Worker directory | Stays |
| GPX export branding | Stays as "FlockHopper" |
| Domain for meta/SEO | `maps.deflock.org` |
| Active logo (`FlockHopper-3.png`, favicons) | Keep for later swap |

## Phase 1: Delete Dead Files & Directories

### Pages to delete
- `src/pages/LandingPage.tsx`
- `src/pages/PrivacyPolicy.tsx`
- `src/pages/TermsOfUse.tsx`
- `src/pages/SupportProject.tsx`
- `src/pages/DefendPage.tsx`

### Component directories to delete
- `src/components/landing/` (entire directory — 14+ files including barrel index)
- `src/components/game/` (DefendCanvas.tsx, GameHUD.tsx)

### Services to delete
- `src/services/gameEngine.ts`

### Stores to delete
- `src/store/gameStore.ts`
- `src/store/landingStore.ts`
- `src/store/audioStore.ts`

### Root directories to delete
- `graphhopper/` (old routing engine docs/config)
- `Routing grass/` (old routing code)
- `load-tests/` (k6 load testing)
- `DATA ANALYSIS/` (density GeoJSON analysis data + prompts)
- `docs/plans/` (old implementation plans/specs)
- `docs/FLOCKHOPPER-DATA-INTEGRATION-REFERENCE.md`
- `docs/OSM-DATA-AUTOMATION.md`
- `docs/Sharing Network Arc Visualization — Impl.ini`
- `scripts/` (entire directory — only contains generate-qr-codes.js)

Note: `docs/superpowers/` is kept (contains this spec).

### Root documentation to delete
- `CODEBASE_ANALYSIS.md`
- `CODEBASE_GUIDE.md`
- `CONTRIBUTING.md`
- `DEPLOYMENT.md`
- `README.md`
- `ROUTING_ALGORITHM_ANALYSIS.md`

### Public assets to delete
- `public/audio/` (panopticon-drift.mp3)
- `public/usa-animation/` (landing page animation GeoJSON + assets)
- `public/btc-qr.png`
- `public/xmr-qr.png`
- `public/FlockHopper-2.png`
- `public/FlockHopper-4.png`
- `public/FlockHopper-5.png`
- `public/FlockHopper.png`
- `public/sitemap.xml` (references dontgetflocked.com)

### Root images to delete
- `FlockHopper (1).png`
- `FlockHopper-4.png`
- `FlockHopper.png`

### Public assets to KEEP
- `public/FlockHopper-3.png` (active logo — swap with DeFlock logo later)
- `public/favicon.png` (active favicon — swap later)
- `public/favicon.svg` (active favicon — swap later)
- `public/cameras-us.json.gz` (camera data)
- `public/zipcodes-us.json` (zip code lookup)
- `public/counties-metrics.geojson`, `public/states-metrics.geojson`, `public/tracts-metrics.geojson` (density data)
- `public/sharing-network-adjacency.json`, `public/sharing-network-nodes.geojson` (network data)
- `public/geo/` (density GeoJSON)
- `public/robots.txt` (will be modified)
- `public/_headers`, `public/_redirects` (will be modified)

## Phase 2: Fix Imports & Routes

### `src/main.tsx`
- Remove lazy imports for: `LandingPage`, `PrivacyPolicy`, `TermsOfUse`, `DefendPage`
- Remove routes: `/home`, `/privacy`, `/terms`, `/defend`
- Keep routes: `/` (MapPage), `/map`, `/explore`, `/timeline`, `/analysis`, `/network`, `*` (NotFound)
- Remove `PreloadManager` comment about "landing page" (cameras still preload, just no landing page context)

### `src/pages/index.ts`
- Remove exports: `LandingPage`, `PrivacyPolicy`, `TermsOfUse`

### `src/store/index.ts`
- Remove exports: `useLandingStore`, `useAudioStore`

### `src/services/index.ts`
- No changes needed (no deleted services are exported here; zipCodeService stays — used by geocodingService)

### `src/components/index.ts`
- No changes needed (no landing or game references)

## Phase 3: Update MapPage Header

### `src/pages/MapPage.tsx`
- Logo `<Link to="/home">` becomes `<a href="https://deflock.org">` (external link)
- Remove the desktop "Home" link (right section)
- Remove the desktop "Support this project" button
- Remove the mobile "Home" menu item
- Remove the mobile "Support this project" menu item
- Remove unused imports: `Home`, `HeartHandshake` from lucide-react (if no longer used)
- Update SEO title/description to reference DeFlock instead of FlockHopper
- Update `<h1 className="sr-only">` from "FlockHopper ALPR Camera Map" to "DeFlock ALPR Camera Map"

### `src/components/map/MapLoadingScreen.tsx`
- Remove buymeacoffee link
- Logo image refs stay (same file, will be swapped later)

## Phase 4: Rebrand Domain & Meta

### `index.html`
- Update `<title>` to DeFlock branding
- Update `<meta name="description">` for DeFlock
- Update `<link rel="canonical">` to `https://maps.deflock.org/`
- Update all Open Graph meta tags (og:site_name, og:title, og:description, og:url, og:image)
- Update all Twitter Card meta tags
- Update JSON-LD structured data (name, url, description, creator)
- Remove Leaflet CSS links (legacy — app uses MapLibre)

### `src/components/common/Seo.tsx`
- Update default image path if needed (stays `FlockHopper-3.png` until logo swap)

### `public/robots.txt`
- Update sitemap reference to `maps.deflock.org` or remove sitemap line

### `public/_redirects`
- No changes needed (file only contains a comment about SPA routing)

### `package.json`
- Remove `"generate-qr"` script
- Update `name` to `deflock-maps` and `description` to reflect DeFlock fork
- Remove `qrcode` from devDependencies (only used by deleted QR script)

## Phase 5: Update CLAUDE.md

Rewrite `CLAUDE.md` to reflect the DeFlock fork:
- Update project overview (DeFlock fork, hosted at maps.deflock.org)
- Remove references to landing page, privacy policy, support page
- Update directory structure to reflect deleted files
- Keep all map-related documentation

## Phase 6: Verify

- Run `npm run build` — must pass with zero errors
- Run `npm run lint` — must pass
- Spot-check that no dead imports or references remain
- Verify `npm run dev` loads the map correctly at `/`

## Out of Scope

- Logo swap (DeFlock logo replaces FlockHopper-3.png) — separate step
- Color scheme changes — separate step
- New sitemap generation for maps.deflock.org
- Any API or worker URL changes
