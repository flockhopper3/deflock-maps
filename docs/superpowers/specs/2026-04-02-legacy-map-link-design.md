# Legacy Map Link Design

**Date:** 2026-04-02
**Status:** Approved

## Summary

Add a persistent link to the DeFlock Legacy Map (`https://deflock.org/map`) across the FlockHopper application. The link serves as a fallback for users when the new map fails to load and as a way to keep the old version accessible.

## Component: `LegacyMapLink`

**File:** `src/components/common/LegacyMapLink.tsx`

A shared component with two visual variants. All instances point to `https://deflock.org/map` and navigate in the same tab (no `target="_blank"`).

### Props

```ts
interface LegacyMapLinkProps {
  variant: "header" | "button" | "menu-item";
  className?: string;
}
```

### Constants (internal to component)

```ts
const LEGACY_MAP_URL = "https://deflock.org/map";
const LEGACY_MAP_LABEL = "DeFlock Legacy Map";
```

### Variant: `"header"`

A subtle text link for the header bar.

- Styling: `text-sm text-dark-400 hover:text-dark-200 transition-colors`
- No icon, text only: "DeFlock Legacy Map"
- Renders as `<a href="https://deflock.org/map">`

### Variant: `"button"`

A secondary button for error pages, matching existing button patterns.

- Styling: `py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-md transition-colors`
- Includes a small `ExternalLink` icon (16px) from Lucide React to hint it leaves the app
- Full width within its flex container (`flex-1` where applicable)
- Text: "DeFlock Legacy Map"

### Variant: `"menu-item"`

A mobile menu item matching the slide-down menu pattern in MapPage.

- Styling: `w-full flex items-center gap-3 px-3 py-2.5 text-sm text-dark-400 hover:text-dark-200 transition-colors`
- Includes `ExternalLink` icon (16px) in the icon slot to match mode item pattern
- Text: "DeFlock Legacy Map"
- Renders as `<a href="https://deflock.org/map">`

## Placement

### 1. MapPage.tsx — Header (top-right)

**Desktop (lg+):**
- Replace the empty right spacer `<div className="hidden lg:flex items-center flex-shrink-0" />` (line ~316) with the `LegacyMapLink variant="header"`.
- Positioned far-right of the header, after the nav tabs.

**Mobile (<lg):**
- Hidden from the header (too tight with camera count + hamburger).
- `variant="menu-item"` added as the last item in the mobile slide-down menu (`nav` element, lines 322-348).
- Separated from mode buttons by a thin `border-t border-dark-600` divider with `mt-1 pt-1`.

### 2. NotFound.tsx — 404 Page

- `variant="button"` added inside the existing `flex flex-col sm:flex-row gap-4 justify-center` container (line 39).
- Placed after the "Go to Map" button.
- Button order: **"Go to Map"** (primary/accent) | **"DeFlock Legacy Map"** (secondary/dark-700).
- On mobile (stacked): legacy map button appears below "Go to Map".

### 3. ErrorBoundary.tsx — Global Error

- `variant="button"` added inside the existing `flex gap-3` container (line 70).
- The container currently has two `flex-1` buttons. Adding a third button to the row.
- Button order: **"Try Again"** (secondary) | **"Go Home"** (primary/accent) | **"DeFlock Legacy Map"** (secondary/dark-700).

### 4. MapLoadingScreen.tsx — Camera Load Failure

- `variant="button"` added in the error state block (lines 125-152), below the existing "Try Again" button.
- The error state uses a centered column layout. The legacy button goes directly after "Try Again".
- Wrapped in a `flex flex-col gap-3` container with the existing "Try Again" button.
- "Try Again" remains the primary action (accent). "DeFlock Legacy Map" is the secondary alternative below it.

## Component Export

- Add `LegacyMapLink` to `src/components/common/index.ts` barrel export.

## Files Modified

| File | Change |
|------|--------|
| `src/components/common/LegacyMapLink.tsx` | **New file** — shared component |
| `src/components/common/index.ts` | Add export |
| `src/pages/MapPage.tsx` | Header (desktop right spacer + mobile menu) |
| `src/pages/NotFound.tsx` | Add button to 404 actions |
| `src/components/common/ErrorBoundary.tsx` | Add button to error actions |
| `src/components/map/MapLoadingScreen.tsx` | Add button to error state |

## Design Decisions

- **Same tab navigation:** The legacy map is part of the DeFlock ecosystem, not an external third-party site. Same-tab navigation keeps the experience cohesive.
- **Shared component over inline links:** 5 placements with a single URL/label. A shared component ensures consistency and makes future changes trivial.
- **Hidden from mobile header, shown in mobile menu:** The mobile header is compact (camera count + hamburger). Adding more elements would crowd it. The slide-down menu is the right place for secondary navigation on mobile.
- **ExternalLink icon on button variant only:** The header variant stays minimal (text only). The button variant on error pages benefits from the icon to signal "this takes you to a different site."
- **No icon on header variant:** Keeps it visually quiet and consistent with the editorial header style.
