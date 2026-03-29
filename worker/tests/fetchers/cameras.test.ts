import { describe, it, expect } from 'vitest';
import { transformOverpassToGeoJSON, parseDirection, CAMERAS_OVERPASS_QUERY } from '../../src/fetchers/cameras';
import type { OverpassResponse } from '../../src/types';

describe('parseDirection', () => {
  it('parses numeric direction', () => {
    expect(parseDirection('180')).toBe(180);
  });

  it('parses cardinal N', () => {
    expect(parseDirection('N')).toBe(0);
  });

  it('parses cardinal SW', () => {
    expect(parseDirection('SW')).toBe(225);
  });

  it('handles semicolon-separated values (takes first)', () => {
    expect(parseDirection('90;270')).toBe(90);
  });

  it('returns null for empty string', () => {
    expect(parseDirection('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseDirection(undefined)).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(parseDirection('not-a-direction')).toBeNull();
  });
});

describe('transformOverpassToGeoJSON', () => {
  const minimalNodeResponse: OverpassResponse = {
    version: 0.6,
    generator: 'Overpass API',
    elements: [
      {
        type: 'node',
        id: 12345,
        lat: 38.89,
        lon: -77.03,
        timestamp: '2025-11-15T00:00:00Z',
        version: 3,
        tags: {
          'man_made': 'surveillance',
          'surveillance:type': 'ALPR',
          'operator': 'Flock Safety',
          'brand': 'Flock',
          'direction': '180',
          'surveillance:zone': 'traffic',
          'camera:mount': 'pole',
          'ref': 'CAM-001',
          'start_date': '2024-06-01',
        },
      },
    ],
  };

  it('transforms a node element to a GeoJSON Feature', () => {
    const fc = transformOverpassToGeoJSON(minimalNodeResponse);

    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(1);

    const f = fc.features[0];
    expect(f.geometry.coordinates).toEqual([-77.03, 38.89]);
    expect(f.properties.osmId).toBe(12345);
    expect(f.properties.osmType).toBe('node');
    expect(f.properties.operator).toBe('Flock Safety');
    expect(f.properties.brand).toBe('Flock');
    expect(f.properties.direction).toBe(180);
    expect(f.properties.directionCardinal).toBeUndefined(); // numeric direction, not a cardinal string
    expect(f.properties.surveillanceZone).toBe('traffic');
    expect(f.properties.mountType).toBe('pole');
    expect(f.properties.ref).toBe('CAM-001');
    expect(f.properties.startDate).toBe('2024-06-01');
    expect(f.properties.osmTimestamp).toBe('2025-11-15T00:00:00Z');
    expect(f.properties.osmVersion).toBe(3);
  });

  it('computes centroid for way elements', () => {
    const wayResponse: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        {
          type: 'way',
          id: 99999,
          tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' },
          nodes: [1, 2],
          timestamp: '2025-01-01T00:00:00Z',
          version: 1,
        },
        { type: 'node', id: 1, lat: 40.0, lon: -74.0 },
        { type: 'node', id: 2, lat: 40.2, lon: -74.2 },
      ],
    };

    const fc = transformOverpassToGeoJSON(wayResponse);
    expect(fc.features).toHaveLength(1);

    const coords = fc.features[0].geometry.coordinates;
    expect(coords[0]).toBeCloseTo(-74.1, 5); // lon = avg(-74.0, -74.2)
    expect(coords[1]).toBeCloseTo(40.1, 5);  // lat = avg(40.0, 40.2)
  });

  it('skips elements without surveillance:type=ALPR', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        { type: 'node', id: 1, lat: 38.0, lon: -77.0, tags: { 'man_made': 'surveillance' } },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features).toHaveLength(0);
  });

  it('skips elements without coordinates', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        { type: 'way', id: 1, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' }, nodes: [999] },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features).toHaveLength(0);
  });

  it('sorts features by osmId', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        { type: 'node', id: 300, lat: 38.0, lon: -77.0, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' } },
        { type: 'node', id: 100, lat: 39.0, lon: -76.0, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' } },
        { type: 'node', id: 200, lat: 40.0, lon: -75.0, tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR' } },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features.map((f) => f.properties.osmId)).toEqual([100, 200, 300]);
  });

  it('maps manufacturer tag to brand when brand is missing', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        {
          type: 'node', id: 1, lat: 38.0, lon: -77.0,
          tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR', 'manufacturer': 'Vigilant' },
        },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    expect(fc.features[0].properties.brand).toBe('Vigilant');
  });

  it('sets directionCardinal only for cardinal strings', () => {
    const response: OverpassResponse = {
      version: 0.6,
      generator: 'Overpass API',
      elements: [
        {
          type: 'node', id: 1, lat: 38.0, lon: -77.0,
          tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR', 'direction': 'SW' },
        },
        {
          type: 'node', id: 2, lat: 39.0, lon: -76.0,
          tags: { 'man_made': 'surveillance', 'surveillance:type': 'ALPR', 'direction': '270' },
        },
      ],
    };

    const fc = transformOverpassToGeoJSON(response);
    // Cardinal "SW" → direction=225, directionCardinal="SW"
    expect(fc.features[0].properties.direction).toBe(225);
    expect(fc.features[0].properties.directionCardinal).toBe('SW');
    // Numeric "270" → direction=270, no directionCardinal
    expect(fc.features[1].properties.direction).toBe(270);
    expect(fc.features[1].properties.directionCardinal).toBeUndefined();
  });
});
