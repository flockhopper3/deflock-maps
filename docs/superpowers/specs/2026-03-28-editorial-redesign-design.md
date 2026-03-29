# DeFlock Maps — Editorial Cartography Redesign

**Date**: 2026-03-28
**Scope**: Full visual overhaul of DeFlock Maps (maps.deflock.org)
**Direction**: Editorial Cartography — investigative data journalism aesthetic
**Theme**: Dark only

## Context

DeFlock Maps is a privacy-focused map application that visualizes ALPR camera locations and calculates camera-avoidance routes. The current UI suffers from common AI-generated aesthetics: glassmorphism on every surface, gradient buttons, cyan-on-dark monotony, nested cards, and uniform drop shadows. An audit scored it 8/20, with critical accessibility gaps (15+ unlabeled buttons, no form associations, color-only indicators).

This redesign replaces the current visual language with an editorial cartography style — inspired by investigative data journalism. Restrained, structured, intentional. The map tells the story; the UI is the margin notes.

### Design Principles

1. **Single accent discipline** — `#0080BC` is the only accent color. No cyan, indigo, purple.
2. **Hairlines over cards** — 1px borders create structure. No glassmorphism, no uniform shadows.
3. **Uppercase section labels** — The editorial signature. Small, tracked, authoritative.
4. **Accessibility is structural** — Every interactive element is labeled, every control meets touch targets, every state has a non-color indicator.
5. **Motion serves state changes** — Nothing pulses, glows, or bounces. Things move when the user causes them to move.

### Target Audience

Activist and investigative community — people mapping surveillance infrastructure, journalists investigating ALPR deployments, civic organizations tracking camera proliferation. The app should feel serious, authoritative, and journalistic.

---

## 1. Color System

Replace all scattered cyan/indigo/purple usage with a disciplined single-accent palette.

### Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `dark-900` | `#0a0a0f` | Page background |
| `dark-800` | `#101018` | Panel backgrounds |
| `dark-700` | `#1a1a24` | Input backgrounds, card backgrounds |
| `dark-600` | `#252530` | Borders, dividers |
| `dark-500` | `#6b7280` | Disabled states, non-readable decorative elements only |
| `dark-400` | `#9ca3af` | Tertiary text (labels, captions) — minimum for readable text |
| `dark-300` | `#d1d5db` | Secondary text (descriptions, body) |
| `dark-200` | `#e5e7eb` | Primary body text |
| `dark-100` | `#f3f4f6` | Headlines, emphasis (not pure white) |
| `accent` | `#0080BC` | Interactive elements: buttons, active tabs, links, indicators |
| `accent-hover` | `#0095d9` | Hover state for accent elements |
| `accent-muted` | `rgba(0,128,188,0.12)` | Subtle backgrounds (active tab bg, badges) |
| `route-direct` | `#e5a04d` | Standard route line (warm amber) |
| `route-avoid` | `#0080BC` | Privacy route line (brand blue) |
| `danger` | `#ef4444` | Error states only |
| `success` | `#22c55e` | Confirmation states only |

### What's Removed

- All `cyan-*` usage (currently the default hover/accent for everything)
- All `indigo-*` usage (mixed with cyan inconsistently)
- All `purple-*` usage (custom route mode)
- All `bg-gradient-to-r` button backgrounds
- All hard-coded hex values that duplicate tokens (especially in MapStyleControl.tsx)

### Contrast Requirements

- Minimum readable text: `dark-400` on `dark-800` = 5.8:1 (passes WCAG AA)
- Body text: `dark-300` on `dark-800` = 9.5:1 (passes WCAG AAA)
- `dark-500` is NOT used for readable text — decorative/disabled only

---

## 2. Typography

### Font Stack

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Display | Space Grotesk | 700 | Logo, section titles, metric numbers |
| Body/UI | DM Sans | 400, 500, 600 | All UI text, inputs, labels, descriptions |
| Mono | JetBrains Mono | 400, 500 | Code references if needed (keep existing) |

### Editorial Label System

The signature pattern: uppercase DM Sans 500 with wide letter-spacing for section labels.

```css
.section-label {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--dark-400);
}
/* Exception to 12px minimum: uppercase + wide tracking makes 11px
   visually equivalent to ~13px lowercase. This is the only exception. */
```

Used for: ROUTE PLANNER, OPTIONS, ORIGIN, DESTINATION, DENSITY ANALYSIS, etc.

### Type Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 1.25rem | Labels, captions, metadata |
| `text-sm` | 14px | 1.375rem | Secondary UI text, descriptions |
| `text-base` | 15px | 1.5rem | Body text, input values |
| `text-lg` | 18px | 1.625rem | Section headings |
| `text-xl` | 20px | 1.75rem | Panel titles |
| `text-2xl` | 24px | 2rem | Page-level headings |

### Minimum Size Rule

12px minimum everywhere. All current `text-[10px]` and `text-[11px]` instances are raised to `text-xs` (12px).

### Font Loading

DM Sans loaded via Google Fonts alongside Space Grotesk. Critical weights (400, 500) preloaded. Weight 600 loaded async.

---

## 3. Layout Structure

### Desktop (1024px+)

```
┌─────────────────────────────────────────────────────────────┐
│  Header (48px) — Logo left │ Mode tabs right                │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ 1px hairline ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│  Side Panel  │  Map (flex-1)                                │
│  (340px)     │                                               │
│  bg: dark-800│  Overlays:                                   │
│              │  - Search (top-left, minimal input)           │
│  Sections:   │  - Camera count (top-right, flat text)       │
│  ─ hairline ─│  - Legend (bottom-left, flat text)           │
│  ─ hairline ─│  - Map style (bottom-right, icon button)     │
│              │                                               │
│  1px border ─┤                                               │
│  right       │                                               │
└──────────────┴──────────────────────────────────────────────┘
```

### Header

- Height: 48px
- Background: `dark-900` (page background, no distinct header color)
- Bottom border: 1px `dark-600`
- Left: DeFlock logo + "Maps" in `dark-400`
- Right: Mode tabs — uppercase text, `dark-400` inactive, `accent` active with 1.5px underline
- No gradients, no background fills on tabs

### Side Panel

- Width: 340px (down from current 400px)
- Background: `dark-800`
- Right border: 1px `dark-600`
- Flush to header (no gap, no floating)
- Content: Stacked sections with hairline dividers
- Sections collapse independently with 200ms transition

### Section Pattern

```
┌─────────────────────────────┐
│ SECTION LABEL          [▾]  │  ← uppercase, dark-400, 11px, letter-spacing: 2px
├─────────────────────────────┤  ← 1px dark-600
│                             │
│  Section content            │
│  (inputs, controls, etc.)   │
│                             │
├─────────────────────────────┤  ← 1px dark-600
│ NEXT SECTION               │
└─────────────────────────────┘
```

### Map Overlays

All overlays are flat — no card wrappers, no backdrop blur, no shadows unless absolutely necessary for contrast.

- **Camera count**: Inline text `"2,847 cameras in view"` — number in `dark-100` weight 600, label in `dark-400`. Small `dark-800/90` pill if map contrast requires it.
- **Search**: Minimal input, `dark-800` background, 1px border. Expands on focus.
- **Legends**: Flat horizontal text with small color dots inline. No card.
- **Map style control**: 36x36px button, `dark-800`, 1px border, 6px radius.

---

## 4. Component Patterns

### Buttons

| Variant | Background | Border | Text | Radius |
|---------|-----------|--------|------|--------|
| Primary | `accent` | none | white | 6px |
| Secondary | transparent | 1px `dark-600` | `dark-300` | 6px |
| Ghost | transparent | none | `dark-300` | 6px |

- Primary hover: `accent-hover`
- Secondary hover: `dark-700` fill
- Ghost hover: `dark-700` fill
- All buttons: `font-size: 12px`, `text-transform: uppercase`, `letter-spacing: 1.5px`, `DM Sans 500`
- No gradients anywhere

### Inputs

- Background: `dark-700`
- Border: 1px `dark-600`
- Border-radius: 6px
- Padding: 10px 12px
- Placeholder: `dark-400`
- Focus: border transitions to `accent`, subtle `0 0 0 3px accent-muted` ring
- No shadow

### Toggle Switches

- Size: 40px wide, 22px tall (up from 18px)
- Track inactive: `dark-600`
- Track active: `accent`
- Thumb: 18px white circle
- Semantics: `role="switch"`, `aria-checked`
- Minimum 44x44px touch target (padding extends hit area)

### Sliders

- Track: 2px `dark-600`
- Filled: 2px `accent`
- Thumb: 14px circle, `dark-800` fill, 2px `accent` border
- 44px touch target via padding
- Paired with visible value label (e.g., "0.25 mi" in `accent` text)

### Section Dividers

- 1px solid `dark-600`
- Full-width within panels
- No extra padding tricks — just `border-bottom` on containers

### Stats/Metrics

- Inline text, not hero cards
- Number: `dark-100`, weight 600, same line as label
- Label: `dark-400`, weight 400
- No card wrapper, no backdrop blur, no pulsing animation

### Tooltips/Popovers

- Background: `dark-700`
- Border: 1px `dark-600`
- Border-radius: 6px
- Shadow: `0 4px 12px rgba(0,0,0,0.3)` — the ONLY shadow in the design system
- Used for: camera popups, map style picker, dropdowns

---

## 5. Map Overlays & Legends

### Camera Markers

- Solid `#0080BC` circle, 6px diameter
- No glowing `box-shadow` halo
- No pulsing animations
- Clustered markers show count in `DM Sans 600`, white on `accent` background
- Markers fade in with opacity transition on load (200ms)

### Camera Popups

- Solid `dark-700` background, 6px radius, small shadow
- Clean left-aligned text: operator, type, direction
- No nested cards inside the popup

### Route Lines

- Direct route: `route-direct` (#e5a04d), 3px dashed
- Privacy route: `route-avoid` (#0080BC), 3px solid
- No glowing borders
- Route draw animation retained (line traces along path)

### Search Overlay (top-left)

- Input field with search icon, no card wrapper
- `dark-800` background, 1px border
- Expands on focus to show results dropdown
- Results: solid `dark-700` background, no blur

### Camera Count (top-right)

- Flat text on map
- Small `dark-800/90` background pill only if needed for contrast
- No card, no badge, no blur

### Legends (bottom-left)

- Flat horizontal text with color indicators
- Route mode: `● Direct route  ◦ Privacy route  ● ALPR camera`
- Density mode: Thin 120px gradient strip with "Low"/"High" labels at 12px
- No card wrapper

### Map Style Control (bottom-right)

- 36x36px button, `dark-800` background, 1px border, 6px radius
- Popover: solid `dark-700`, same flat style
- Uses Tailwind tokens, not hard-coded hex

---

## 6. Mobile Experience

### Header (mobile)

- Height: 44px
- Logo left, camera count inline right
- Mode tabs: Horizontal scroll strip below header — uppercase text, always visible
- No hamburger menu

### BottomSheet

- Keeps 3-snap-point architecture
- Drag handle: 32px x 3px `dark-500` bar, centered
- Background: solid `dark-800`, no blur
- Top corners: `border-radius: 12px 12px 0 0`
- Same editorial chrome as desktop (uppercase labels, hairline dividers)

### Snap Heights

| State | Height | Content |
|-------|--------|---------|
| Minimized | 72px | Mode name + one-line summary |
| Peek | 240px | Primary controls for active mode |
| Full | 85vh | Scrollable full panel content |

### Mobile Map

- Search moves inside BottomSheet header (peek state)
- Legends move inside BottomSheet content
- Map gets maximum real estate — only map style button floats
- Map controls repositioned above BottomSheet minimized height

### Touch Targets

- Minimum 44x44px hit area on all interactive elements
- Toggle switches, buttons, tab items all meet threshold
- Padding expands on mobile even if visual size stays compact

### BottomSheet Animation

- `ease-out-quart`: `cubic-bezier(0.25, 1, 0.5, 1)`
- Duration: 300ms
- No spring physics, no bounce

---

## 7. Accessibility

Addresses all P0 and P1 findings from the audit.

### Button Labels

Every icon-only button gets `aria-label`:
- Swap: "Swap origin and destination"
- Clear: "Clear search"
- Map style: "Change map style"
- Mobile toggle: "Open panel" / "Close panel"
- Search: "Search locations"
- Close: "Close"
- Location: "Use my location"
- Pick on map: "Pick location on map"

### Form Associations

- Every input gets `<label htmlFor>` with matching `id`
- Range sliders get `aria-label` (e.g., "Camera avoidance distance")
- Error messages linked via `aria-describedby`
- Required fields marked with `aria-required="true"`

### Dropdown/Popover State

- All trigger buttons: `aria-expanded={isOpen}`
- Popover content: `role="listbox"` or `role="menu"`
- Keyboard: Arrow keys navigate options, Escape closes, Enter selects

### Toggle Switches

- `role="switch"` with `aria-checked`
- Associated label describes what the toggle controls

### Decorative SVGs

- All icon SVGs: `aria-hidden="true"`
- Functional SVGs (where icon IS the label): `aria-label` instead

### Color Contrast

- Minimum readable text: `dark-400` on `dark-800` = 5.8:1 (WCAG AA)
- Body text: `dark-300` on `dark-800` = 9.5:1 (WCAG AAA)
- `dark-500` never used for readable text
- Minimum font size: 12px

### Non-Color Indicators

- Active route: color change + "Selected" text + `aria-selected="true"`
- Active tab: color change + underline indicator
- Toggle state: track color + thumb position + aria-checked

### Focus Indicators

- 2px `accent` outline, 2px offset
- Uses `:focus-visible` (visible for keyboard, hidden for mouse)

### Reduced Motion

- All animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- Reduced motion users get instant state changes

---

## 8. Motion & Interaction

### Easing

One curve for the whole app:
```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
```

### Transitions

| Element | Duration | Property |
|---------|----------|----------|
| Hover states | 150ms | color, background-color |
| Panel expand/collapse | 200ms | opacity, transform |
| Tab underline slide | 200ms | transform |
| BottomSheet snap | 300ms | transform |
| Input focus | 150ms | border-color, box-shadow |

### Entrances

- New content: fade in + 8px translateY over 200ms
- Staggered siblings: 30ms delay between items (e.g., search results)
- This is the only "delight" animation

### Removed Animations

- `rec-pulse` — blinking REC indicator
- `camera-pulse-expand` — expanding rings on markers
- `glow-blue` — glowing borders
- `pulse-blue` — pulsing stats badge
- `scan-line-move` — scan line effect
- Spring physics from BottomSheet
- Gradient hover animations

### Retained Animations

- Camera marker fade-in (simplified to opacity only, 200ms)
- Loading spinner (functional)
- Route line draw animation (line traces along path)

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Scope

### Files Requiring Changes

**Config/Global:**
- `tailwind.config.js` — color tokens, font family, font sizes
- `index.html` — font loading (add DM Sans)
- `src/index.css` — remove decorative keyframes, update CSS variables

**Components (full restyle):**
- All files in `src/components/panels/` — panel chrome, section structure, button styles
- All files in `src/components/map/` — overlay styles, camera stats, legends, search
- `src/components/common/BottomSheet.tsx` — remove spring physics, update chrome
- `src/components/inputs/AddressSearch.tsx` — input styling, a11y fixes
- `src/components/ui/button.tsx` — updated variant definitions

**Map layers (marker/overlay style):**
- `src/components/map/layers/CameraMarkerLayers.tsx` — remove glow, simplify markers
- `src/components/map/MapLibreContainer.tsx` — popup styles, overlay positioning

**Accessibility pass (all interactive components):**
- Add aria-labels, form associations, aria-expanded, role attributes
- Every file with a `<button>`, `<input>`, or toggle

### Files NOT Changing

- `src/store/` — no state management changes
- `src/services/` — no API changes
- `src/utils/` — no utility changes
- `src/modes/` — visualization logic stays the same (only styling changes)
- Route calculation, camera data loading, spatial indexing — all untouched

### Out of Scope

- Light mode (dark only, as decided)
- New features or functionality
- API changes
- Map tile styling (OSM tiles stay as-is)
- Data format changes
