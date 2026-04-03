# Legacy Map Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "DeFlock Legacy Map" link across all error pages and the main map header, pointing to `https://deflock.org/map`.

**Architecture:** Single shared `LegacyMapLink` component with three variants (`header`, `button`, `menu-item`). Placed in 4 locations: MapPage header (desktop + mobile menu), NotFound, ErrorBoundary, and MapLoadingScreen.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React (ExternalLink icon)

**Spec:** `docs/superpowers/specs/2026-04-02-legacy-map-link-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/common/LegacyMapLink.tsx` | Create | Shared link component with 3 variants |
| `src/components/common/index.ts` | Modify | Add barrel export |
| `src/pages/MapPage.tsx` | Modify | Desktop header link + mobile menu item |
| `src/pages/NotFound.tsx` | Modify | Add button to 404 actions |
| `src/components/common/ErrorBoundary.tsx` | Modify | Add button to error actions |
| `src/components/map/MapLoadingScreen.tsx` | Modify | Add button to camera load error state |

---

### Task 1: Create LegacyMapLink Component

**Files:**
- Create: `src/components/common/LegacyMapLink.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Create LegacyMapLink.tsx**

```tsx
import { ExternalLink } from 'lucide-react';

const LEGACY_MAP_URL = 'https://deflock.org/map';
const LEGACY_MAP_LABEL = 'DeFlock Legacy Map';

interface LegacyMapLinkProps {
  variant: 'header' | 'button' | 'menu-item';
  className?: string;
}

export function LegacyMapLink({ variant, className = '' }: LegacyMapLinkProps) {
  if (variant === 'header') {
    return (
      <a
        href={LEGACY_MAP_URL}
        className={`text-sm text-dark-400 hover:text-dark-200 transition-colors ${className}`}
      >
        {LEGACY_MAP_LABEL}
      </a>
    );
  }

  if (variant === 'menu-item') {
    return (
      <a
        href={LEGACY_MAP_URL}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-dark-400 hover:text-dark-200 transition-colors ${className}`}
      >
        <ExternalLink className="w-4 h-4" aria-hidden="true" />
        <span>{LEGACY_MAP_LABEL}</span>
      </a>
    );
  }

  // variant === 'button'
  return (
    <a
      href={LEGACY_MAP_URL}
      className={`flex-1 inline-flex items-center justify-center gap-2 py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-md transition-colors ${className}`}
    >
      <ExternalLink className="w-4 h-4" aria-hidden="true" />
      {LEGACY_MAP_LABEL}
    </a>
  );
}
```

- [ ] **Step 2: Add barrel export to index.ts**

In `src/components/common/index.ts`, add this line after the existing exports:

```ts
export { LegacyMapLink } from './LegacyMapLink';
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds (component is created but not yet used — tree-shaking is fine)

- [ ] **Step 4: Commit**

```bash
git add src/components/common/LegacyMapLink.tsx src/components/common/index.ts
git commit -m "feat: add LegacyMapLink component with header, button, and menu-item variants"
```

---

### Task 2: Add to MapPage Header (Desktop + Mobile Menu)

**Files:**
- Modify: `src/pages/MapPage.tsx`

**Context:** The MapPage header has three sections in a `flex items-center justify-between` row:
1. Logo (left)
2. Desktop nav tabs (center)
3. Desktop: empty spacer div `<div className="hidden lg:flex items-center flex-shrink-0" />` (right) / Mobile: camera count + hamburger

The mobile slide-down menu (below header) contains mode buttons in a `space-y-0.5` div.

- [ ] **Step 1: Add import**

At the top of `src/pages/MapPage.tsx`, add to the imports:

```ts
import { LegacyMapLink } from '@/components/common';
```

- [ ] **Step 2: Replace desktop right spacer**

In `src/pages/MapPage.tsx`, find the empty desktop right spacer (line ~316):

```tsx
{/* Desktop: Right spacer */}
<div className="hidden lg:flex items-center flex-shrink-0" />
```

Replace with:

```tsx
{/* Desktop: Legacy map link */}
<div className="hidden lg:flex items-center flex-shrink-0">
  <LegacyMapLink variant="header" />
</div>
```

- [ ] **Step 3: Add to mobile slide-down menu**

In `src/pages/MapPage.tsx`, find the closing of the mobile menu's mode buttons div (the `</div>` after the `.map()` of MODE_LABELS, around line 346):

```tsx
              ))}
            </div>
          </nav>
```

Add the legacy link between `</div>` and `</nav>`, separated by a divider:

```tsx
              ))}
            </div>
            <div className="border-t border-dark-600 mt-1 pt-1 px-4 pb-2">
              <LegacyMapLink variant="menu-item" />
            </div>
          </nav>
```

- [ ] **Step 4: Verify dev server**

Run: `npm run dev`
Check:
- Desktop (>1024px): "DeFlock Legacy Map" text visible top-right of header, subtle gray text
- Mobile (<1024px): Open hamburger menu — "DeFlock Legacy Map" with ExternalLink icon appears below mode buttons, separated by a divider
- Clicking the link navigates to `https://deflock.org/map` in the same tab

- [ ] **Step 5: Commit**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat: add legacy map link to MapPage header and mobile menu"
```

---

### Task 3: Add to NotFound Page

**Files:**
- Modify: `src/pages/NotFound.tsx`

**Context:** The 404 page has a button container: `<div className="flex flex-col sm:flex-row gap-4 justify-center">` with a single "Go to Map" Link inside it.

- [ ] **Step 1: Add import**

At the top of `src/pages/NotFound.tsx`, update the imports:

```ts
import { Link } from 'react-router-dom';
import { Map, ArrowLeft } from 'lucide-react';
import { Seo, LegacyMapLink } from '@/components/common';
```

- [ ] **Step 2: Add legacy button after "Go to Map"**

In `src/pages/NotFound.tsx`, find the button container (line ~39):

```tsx
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold transition-colors"
            >
              <Map className="w-5 h-5" />
              Go to Map
            </Link>
          </div>
```

Replace with:

```tsx
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold transition-colors"
            >
              <Map className="w-5 h-5" />
              Go to Map
            </Link>
            <LegacyMapLink variant="button" />
          </div>
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, navigate to any invalid URL (e.g., `/asdf`)
Check:
- Two buttons side-by-side on desktop: "Go to Map" (blue accent) | "DeFlock Legacy Map" (dark gray with ExternalLink icon)
- Stacked on mobile: "Go to Map" on top, "DeFlock Legacy Map" below
- Clicking "DeFlock Legacy Map" navigates to `https://deflock.org/map` in same tab

- [ ] **Step 4: Commit**

```bash
git add src/pages/NotFound.tsx
git commit -m "feat: add legacy map link to 404 page"
```

---

### Task 4: Add to ErrorBoundary

**Files:**
- Modify: `src/components/common/ErrorBoundary.tsx`

**Context:** The ErrorBoundary is a class component. Its error fallback UI has a button row: `<div className="flex gap-3">` containing "Try Again" and "Go Home" buttons, both with `flex-1`.

- [ ] **Step 1: Add import**

At the top of `src/components/common/ErrorBoundary.tsx`, add:

```ts
import { LegacyMapLink } from './LegacyMapLink';
```

(Local import since they're in the same directory — avoids circular barrel imports.)

- [ ] **Step 2: Add legacy button to error actions**

In `src/components/common/ErrorBoundary.tsx`, find the button row (line ~70):

```tsx
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-md transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-md transition-colors"
              >
                Go Home
              </button>
            </div>
```

Replace with:

```tsx
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-md transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-md transition-colors"
              >
                Go Home
              </button>
              <LegacyMapLink variant="button" />
            </div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. (ErrorBoundary is hard to trigger manually — build verification is sufficient here.)

- [ ] **Step 4: Commit**

```bash
git add src/components/common/ErrorBoundary.tsx
git commit -m "feat: add legacy map link to error boundary"
```

---

### Task 5: Add to MapLoadingScreen Error State

**Files:**
- Modify: `src/components/map/MapLoadingScreen.tsx`

**Context:** The MapLoadingScreen error state (lines 125-152) shows a centered column with a logo, error headline, error text, and a single "Try Again" button.

- [ ] **Step 1: Add import**

At the top of `src/components/map/MapLoadingScreen.tsx`, add:

```ts
import { LegacyMapLink } from '@/components/common';
```

- [ ] **Step 2: Wrap buttons in flex column and add legacy link**

In `src/components/map/MapLoadingScreen.tsx`, find the error state's "Try Again" button (around line 146):

```tsx
            <button 
              onClick={onRetry}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
```

Replace with:

```tsx
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                onClick={onRetry}
                className="w-full px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-md transition-colors"
              >
                Try Again
              </button>
              <LegacyMapLink variant="button" className="flex-none" />
            </div>
          </div>
```

- [ ] **Step 3: Verify dev server**

Run: `npm run dev`
To trigger the error state, you can temporarily modify `cameraDataService.ts` to throw an error, or use browser DevTools to block the cameras-us.json.gz network request.
Check:
- Error state shows "Try Again" (blue accent) stacked above "DeFlock Legacy Map" (dark gray)
- Both buttons are the same width (constrained by `max-w-xs`)
- Clicking "DeFlock Legacy Map" navigates to `https://deflock.org/map` in same tab

- [ ] **Step 4: Commit**

```bash
git add src/components/map/MapLoadingScreen.tsx
git commit -m "feat: add legacy map link to camera load error screen"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 3: Manual smoke test all 4 locations**

1. **MapPage header (desktop):** Load `/` at >1024px width — "DeFlock Legacy Map" visible top-right
2. **MapPage mobile menu:** Load `/` at <1024px width — open hamburger — legacy link at bottom with divider
3. **NotFound:** Navigate to `/asdf` — two buttons: "Go to Map" + "DeFlock Legacy Map"
4. **MapLoadingScreen error:** Block `cameras-us.json.gz` in DevTools Network tab, reload — "Try Again" + "DeFlock Legacy Map" stacked
5. **ErrorBoundary:** Hard to trigger naturally — verified via build

All links navigate to `https://deflock.org/map` in the same tab.
