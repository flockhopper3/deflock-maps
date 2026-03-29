import type { OverpassResponse, OverpassElement, GeoJSON } from '../types';
import { queryOverpass } from '../lib/overpass';
import { pointFeature, buildFeatureCollection } from '../lib/geojson';

export const CAMERAS_OVERPASS_QUERY = `[out:json][timeout:300];
area["ISO3166-1"="US"]->.us;
(
  node["man_made"="surveillance"]["surveillance:type"="ALPR"](area.us);
  way["man_made"="surveillance"]["surveillance:type"="ALPR"](area.us);
);
out meta;
>;
out skel qt;`;

const MIN_CAMERA_COUNT = 50_000;

const CARDINALS: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

export function parseDirection(value: string | undefined): number | null {
  if (!value) return null;

  const upper = value.toUpperCase();
  if (upper in CARDINALS) return CARDINALS[upper];

  try {
    const str = value.includes(';') ? value.split(';')[0] : value;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

export function transformOverpassToGeoJSON(
  data: OverpassResponse
): GeoJSON.FeatureCollection {
  // Build node lookup for way centroid calculation
  const nodesById = new Map<number, { lat: number; lon: number }>();
  for (const el of data.elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodesById.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  const features: GeoJSON.Feature[] = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};

    // Only process surveillance ALPR elements
    if (tags['man_made'] !== 'surveillance') continue;
    if (tags['surveillance:type'] !== 'ALPR') continue;

    let lat = el.lat;
    let lon = el.lon;

    // For ways, compute centroid from child nodes
    if (el.type === 'way' && el.nodes) {
      const wayNodes = el.nodes
        .map((id) => nodesById.get(id))
        .filter((n): n is { lat: number; lon: number } => n !== undefined);

      if (wayNodes.length > 0) {
        lat = wayNodes.reduce((sum, n) => sum + n.lat, 0) / wayNodes.length;
        lon = wayNodes.reduce((sum, n) => sum + n.lon, 0) / wayNodes.length;
      }
    }

    if (lat === undefined || lon === undefined) continue;

    const directionTag = tags['direction'] || tags['camera:direction'];
    const direction = parseDirection(directionTag);
    // directionCardinal stores the raw tag only when it's a cardinal string (N, SW, etc.)
    const isCardinal = directionTag ? directionTag.toUpperCase() in CARDINALS : false;

    const properties: Record<string, unknown> = {
      osmId: el.id,
      osmType: el.type,
    };

    if (tags['operator']) properties.operator = tags['operator'];
    if (tags['brand'] || tags['manufacturer']) {
      properties.brand = tags['brand'] || tags['manufacturer'];
    }
    if (direction !== null) properties.direction = direction;
    if (isCardinal) properties.directionCardinal = directionTag;
    if (tags['surveillance:zone']) properties.surveillanceZone = tags['surveillance:zone'];
    if (tags['camera:mount']) properties.mountType = tags['camera:mount'];
    if (tags['ref']) properties.ref = tags['ref'];
    if (tags['start_date']) properties.startDate = tags['start_date'];
    if (el.timestamp) properties.osmTimestamp = el.timestamp;
    if (el.version) properties.osmVersion = el.version;

    features.push(pointFeature(lon, lat, properties));
  }

  // Sort by osmId for deterministic output
  features.sort((a, b) => (a.properties.osmId as number) - (b.properties.osmId as number));

  return buildFeatureCollection(features);
}

export async function fetchCameras(): Promise<{
  featureCollection: GeoJSON.FeatureCollection;
  featureCount: number;
}> {
  console.log('Fetching camera data from Overpass API...');
  const data = await queryOverpass(CAMERAS_OVERPASS_QUERY);

  console.log(`Received ${data.elements.length} elements, transforming to GeoJSON...`);
  const featureCollection = transformOverpassToGeoJSON(data);
  const featureCount = featureCollection.features.length;

  console.log(`Transformed to ${featureCount} camera features`);

  if (featureCount < MIN_CAMERA_COUNT) {
    throw new Error(
      `Validation failed: only ${featureCount} cameras (minimum ${MIN_CAMERA_COUNT}). Skipping update.`
    );
  }

  return { featureCollection, featureCount };
}
