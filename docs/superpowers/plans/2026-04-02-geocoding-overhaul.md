# Geocoding Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2-tier geocoding fallback (LocationIQ → Photon) with a 3-tier chain (LocationIQ → Nominatim → Photon), remove reverse geocoding entirely, and simplify the coordinate search path.

**Architecture:** Add Nominatim as a middle-tier geocoding provider with its own rate limiter. Refactor `smartSearch` to use a generic fallback chain instead of nested try/catch blocks. Remove `reverseGeocode` and all consumer call sites, replacing display names with raw coordinates. The existing coordinate and ZIP code detection (already implemented) remains unchanged.

**Tech Stack:** TypeScript, Fetch API, Nominatim REST API

---

## Scope & Pre-existing State

Item 4 from the spec (coordinate & ZIP detection) is **already implemented** — `parseCoordinates()` and `isZipCode()` work correctly in `smartSearch`. This plan covers the remaining 3 items plus the consumer-side cleanup needed when removing reverse geocoding.

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/services/geocodingService.ts` | Modify | Add Nominatim provider, 3-tier chain, remove reverse geocoding |
| `src/services/index.ts` | Modify | Remove `reverseGeocode` from barrel export |
| `src/components/inputs/AddressSearch.tsx` | Modify | Remove `reverseGeocode` import and call |
| `src/components/map/MapLibreContainer.tsx` | Modify | Remove `reverseGeocode` import and call |

---

### Task 1: Add Nominatim Geocoding Provider

**Files:**
- Modify: `deflock-maps/src/services/geocodingService.ts` (add after Photon section, ~line 376)

- [ ] **Step 1: Add NominatimResult interface to geocodingService.ts**

In `src/services/geocodingService.ts`, add after the `PhotonResponse` interface (after line 73):

```typescript
// Nominatim types
interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance?: number;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}
```

- [ ] **Step 2: Add Nominatim rate limiter**

In `src/services/geocodingService.ts`, add a new section after the Photon section (after line 376):

```typescript
// ============================================================================
// NOMINATIM GEOCODING (Fallback - OSM's own geocoder, strict 1 req/sec)
// ============================================================================

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

// Rate limiting for Nominatim (strict policy: max 1 request/second)
let lastNominatimRequest = 0;
const NOMINATIM_MIN_INTERVAL = 1100; // 1100ms = ~0.9 req/sec to stay safely under limit

let nominatimRateLimitPromise: Promise<void> = Promise.resolve();

async function waitForNominatimRateLimit(): Promise<void> {
  nominatimRateLimitPromise = nominatimRateLimitPromise.then(async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastNominatimRequest;

    if (timeSinceLastRequest < NOMINATIM_MIN_INTERVAL) {
      await new Promise(resolve =>
        setTimeout(resolve, NOMINATIM_MIN_INTERVAL - timeSinceLastRequest)
      );
    }

    lastNominatimRequest = Date.now();
  });

  return nominatimRateLimitPromise;
}
```

- [ ] **Step 3: Implement nominatimToResult converter**

Add after the rate limiter code:

```typescript
/**
 * Convert Nominatim result to our result format
 */
function nominatimToResult(result: NominatimResult): GeocodingResult {
  const addr = result.address;

  // Determine result type based on class and type (same logic as LocationIQ)
  let type: GeocodingResult['type'] = 'address';
  const resultClass = result.class?.toLowerCase() || '';
  const resultType = result.type?.toLowerCase() || '';

  if (resultClass === 'shop' || resultClass === 'amenity' || resultClass === 'tourism' || resultClass === 'leisure') {
    type = 'poi';
  } else if (resultClass === 'place' && ['city', 'town', 'village', 'hamlet'].includes(resultType)) {
    type = 'city';
  } else if (resultClass === 'boundary' && resultType === 'administrative') {
    if (addr?.state && !addr?.city && !addr?.town && !addr?.village && !addr?.road) {
      type = 'state';
    } else {
      type = 'city';
    }
  } else if (resultClass === 'highway') {
    type = 'street';
  } else if (resultType === 'postcode') {
    type = 'zip';
  }

  // Build name - prefer structured address parts
  let name = '';
  if (addr?.house_number && addr?.road) {
    name = `${addr.house_number} ${addr.road}`;
  } else if (addr?.road) {
    name = addr.road;
  } else {
    name = result.display_name.split(',')[0];
  }

  // Build description from address parts
  const descParts: string[] = [];
  const city = addr?.city || addr?.town || addr?.village;
  if (city) descParts.push(city);
  if (addr?.state) descParts.push(addr.state);
  if (addr?.postcode) descParts.push(addr.postcode);

  const description = descParts.join(', ') || 'United States';

  return {
    id: `nom-${result.place_id}`,
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
    name: name || description.split(',')[0],
    description,
    type,
  };
}
```

- [ ] **Step 4: Implement searchNominatim function**

Add after `nominatimToResult`:

```typescript
/**
 * Search using Nominatim geocoder (OSM's official geocoder, 1 req/sec limit)
 */
async function searchNominatim(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  await waitForNominatimRateLimit();

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '8',
    countrycodes: 'us',
    dedupe: '1',
  });

  const response = await fetch(`${NOMINATIM_API}?${params}`, {
    signal,
    headers: {
      'User-Agent': 'DeFlock Maps (maps.deflock.org)',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`);
  }

  const data: NominatimResult[] = await response.json();

  return data.map(nominatimToResult);
}
```

- [ ] **Step 5: Verify the app builds**

Run: `cd deflock-maps && npm run build`
Expected: Build succeeds (searchNominatim is not yet wired in, but no errors)

- [ ] **Step 6: Commit**

```bash
git add src/services/geocodingService.ts
git commit -m "feat: add Nominatim geocoding provider with 1 req/sec rate limiting"
```

---

### Task 2: Build 3-Tier Fallback Chain

**Files:**
- Modify: `deflock-maps/src/services/geocodingService.ts` (refactor `smartSearch`, lines 498-524)

- [ ] **Step 1: Add the searchWithFallback helper**

In `src/services/geocodingService.ts`, add before the `smartSearch` function:

```typescript
// ============================================================================
// FALLBACK CHAIN
// ============================================================================

type GeocodingProvider = (query: string, signal?: AbortSignal) => Promise<GeocodingResult[]>;

/**
 * Search through providers in order: LocationIQ (1.8 req/sec) → Nominatim (1 req/sec) → Photon (no limit).
 * Falls through to the next provider on failure or empty results.
 */
async function searchWithFallback(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const providers: { name: string; search: GeocodingProvider }[] = [
    { name: 'LocationIQ', search: searchLocationIQ },
    { name: 'Nominatim', search: searchNominatim },
    { name: 'Photon', search: searchPhoton },
  ];

  for (const provider of providers) {
    try {
      const results = await provider.search(query, signal);
      if (results.length > 0) {
        return results;
      }
      // Empty results — try next provider
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      // Log and fall through to next provider
      if (import.meta.env.DEV) {
        console.warn(`[Geocoding] ${provider.name} failed, trying next provider:`, error);
      }
    }
  }

  return [];
}
```

- [ ] **Step 2: Refactor smartSearch to use searchWithFallback**

Replace the text search section of `smartSearch` (the two try/catch blocks for LocationIQ then Photon, starting at the comment `// Search with LocationIQ first` around line 498) with:

```typescript
  // Search with 3-tier fallback: LocationIQ → Nominatim → Photon
  return searchWithFallback(trimmed, signal);
```

Also replace the ZIP code API fallback section (the two try/catch blocks after the local ZIP lookup, around lines 475-495) with:

```typescript
    // Fall back to API providers for ZIP lookup
    return searchWithFallback(`${trimmed}, USA`, signal);
```

The full `smartSearch` function should now look like:

```typescript
export async function smartSearch(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  // Check for GPS coordinates first
  const coords = parseCoordinates(trimmed);
  if (coords) {
    const reverseResult = await reverseGeocode(coords.lat, coords.lon);

    return [{
      id: `coords-${coords.lat}-${coords.lon}`,
      lat: coords.lat,
      lon: coords.lon,
      name: `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`,
      description: reverseResult?.description || 'GPS Coordinates',
      type: 'coordinates',
    }];
  }

  // Check for ZIP codes - use local bundled data for instant, reliable lookups
  if (isZipCode(trimmed)) {
    try {
      const zipData = await lookupZipCode(trimmed);
      if (zipData) {
        return [{
          id: `zip-${trimmed}`,
          lat: zipData.lat,
          lon: zipData.lon,
          name: trimmed,
          description: `${zipData.city}, ${zipData.state}`,
          type: 'zip',
        }];
      }
    } catch {
      console.warn('Local ZIP lookup failed, falling back to API');
    }

    // Fall back to API providers for ZIP lookup
    return searchWithFallback(`${trimmed}, USA`, signal);
  }

  // Search with 3-tier fallback: LocationIQ → Nominatim → Photon
  return searchWithFallback(trimmed, signal);
}
```

Note: The `reverseGeocode` call on the coordinate path still exists here — it gets removed in Task 3.

- [ ] **Step 3: Verify the app builds**

Run: `cd deflock-maps && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/services/geocodingService.ts
git commit -m "feat: build 3-tier geocoding fallback chain (LocationIQ → Nominatim → Photon)"
```

---

### Task 3: Remove Reverse Geocoding and Update Consumers

**Files:**
- Modify: `deflock-maps/src/services/geocodingService.ts` (delete ~70 lines)
- Modify: `deflock-maps/src/services/index.ts:14` (remove `reverseGeocode` export)
- Modify: `deflock-maps/src/components/inputs/AddressSearch.tsx:2,113-125`
- Modify: `deflock-maps/src/components/map/MapLibreContainer.tsx:26,645-657`

- [ ] **Step 1: Delete reverseGeocodeLocationIQ from geocodingService.ts**

Remove the entire `reverseGeocodeLocationIQ` function (lines 200-227):

```typescript
/**
 * Reverse geocode using LocationIQ
 */
async function reverseGeocodeLocationIQ(lat: number, lon: number): Promise<GeocodingResult | null> {
  try {
    // Apply rate limiting
    await waitForLocationIQRateLimit();
    
    const params = new URLSearchParams({
      key: LOCATIONIQ_KEY,
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
    });

    const response = await fetch(`${LOCATIONIQ_API}/reverse?${params}`);
    
    if (!response.ok) {
      return null;
    }

    const data: LocationIQResult = await response.json();
    return locationIQToResult(data);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Delete the exported reverseGeocode function**

Remove the entire reverse geocoding section (lines 378-419):

```typescript
// ============================================================================
// REVERSE GEOCODING
// ============================================================================

/**
 * Get address from coordinates (tries LocationIQ first, falls back to Photon)
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  // Try LocationIQ first for better accuracy
  try {
    const result = await reverseGeocodeLocationIQ(lat, lon);
    if (result) return result;
  } catch {
    // Fall through to Photon
  }
  
  // Fallback to Photon
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      limit: '1',
      lang: 'en',
    });

    const response = await fetch(`${PHOTON_API}/reverse?${params}`);
    
    if (!response.ok) {
      return null;
    }

    const data: PhotonResponse = await response.json();
    
    if (data.features.length === 0) {
      return null;
    }

    return photonToResult(data.features[0]);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Update the coordinate path in smartSearch**

Replace the coordinate detection block in `smartSearch`:

Old:
```typescript
  // Check for GPS coordinates first
  const coords = parseCoordinates(trimmed);
  if (coords) {
    const reverseResult = await reverseGeocode(coords.lat, coords.lon);
    
    return [{
      id: `coords-${coords.lat}-${coords.lon}`,
      lat: coords.lat,
      lon: coords.lon,
      name: `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`,
      description: reverseResult?.description || 'GPS Coordinates',
      type: 'coordinates',
    }];
  }
```

New:
```typescript
  // Check for GPS coordinates first — return directly, no reverse lookup needed
  const coords = parseCoordinates(trimmed);
  if (coords) {
    return [{
      id: `coords-${coords.lat}-${coords.lon}`,
      lat: coords.lat,
      lon: coords.lon,
      name: `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`,
      description: 'GPS Coordinates',
      type: 'coordinates',
    }];
  }
```

- [ ] **Step 4: Remove reverseGeocode from barrel export**

In `src/services/index.ts`, change line 14 from:

```typescript
export { smartSearch, reverseGeocode, toLocation, getResultTypeIcon } from './geocodingService';
```

to:

```typescript
export { smartSearch, toLocation, getResultTypeIcon } from './geocodingService';
```

- [ ] **Step 5: Update AddressSearch.tsx — remove reverseGeocode usage**

In `src/components/inputs/AddressSearch.tsx`, change line 2 from:

```typescript
import { smartSearch, reverseGeocode, toLocation, type GeocodingResult } from '../../services/geocodingService';
```

to:

```typescript
import { smartSearch, toLocation, type GeocodingResult } from '../../services/geocodingService';
```

Then replace the "Use My Location" reverse geocode block (around lines 113-125):

Old:
```typescript
      let locationName = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      let locationAddress = 'Current Location';

      try {
        const reverseResult = await reverseGeocode(lat, lon);
        if (reverseResult) {
          locationName = reverseResult.name || locationName;
          locationAddress = reverseResult.description || locationAddress;
        }
      } catch {
```

New:
```typescript
      const locationName = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      const locationAddress = 'Current Location';
```

Remove the corresponding closing brace and any code that was inside the catch/finally. Keep the code that uses `locationName` and `locationAddress` afterward (the `onChange` call).

- [ ] **Step 6: Update MapLibreContainer.tsx — remove reverseGeocode usage**

In `src/components/map/MapLibreContainer.tsx`, remove the import on line 26:

```typescript
import { reverseGeocode } from '../../services/geocodingService';
```

Then remove the entire try/catch block that calls `reverseGeocode` (around lines 645-656). Keep the `location` object as-is (it already has `lat`, `lon`, `name` set with coordinate values before the try/catch).

- [ ] **Step 7: Verify the app builds with no TypeScript errors**

Run: `cd deflock-maps && npm run build`
Expected: Build succeeds. No references to `reverseGeocode` remain.

- [ ] **Step 8: Verify no dangling references**

Run: `cd deflock-maps && grep -r "reverseGeocode" src/`
Expected: No matches

- [ ] **Step 9: Commit**

```bash
git add src/services/geocodingService.ts src/services/index.ts src/components/inputs/AddressSearch.tsx src/components/map/MapLibreContainer.tsx
git commit -m "feat: remove reverse geocoding — coordinates sufficient for routing"
```

---

## Summary of Changes

| Before | After |
|--------|-------|
| 2-tier fallback: LocationIQ → Photon | 3-tier fallback: LocationIQ → Nominatim → Photon |
| Reverse geocoding exported and used in 3 places | Removed entirely |
| Coordinate search triggers reverse geocode API call | Coordinate search returns instantly with raw coords |
| ~558 lines in geocodingService.ts | ~520 lines (net reduction despite adding Nominatim) |
