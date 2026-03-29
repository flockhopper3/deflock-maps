import { useMemo, useCallback } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../../../store';
import { DIRECTIONAL_ZONE, CAMERA_DETECTION, ZONE_SAFETY_MULTIPLIERS } from '../../../services/routingConfig';
import type { ALPRCamera } from '../../../types';

// Helper to create a direction cone polygon from a point and direction
// Uses the same parameters as the routing algorithm for consistency
function createDirectionCone(
  lon: number,
  lat: number,
  direction: number,
  // Use routing config values so visualization matches what routing avoids
  lengthMeters: number = CAMERA_DETECTION.routeBufferMeters * ZONE_SAFETY_MULTIPLIERS.block,
  spreadDegrees: number = DIRECTIONAL_ZONE.cameraFovDegrees
): GeoJSON.Feature<GeoJSON.Polygon> {
  const earthRadius = 6371000; // meters
  const latRad = (lat * Math.PI) / 180;

  // Convert meters to degrees (approximate)
  const lengthDeg = (lengthMeters / earthRadius) * (180 / Math.PI);

  // Calculate the three points of the cone
  const points: [number, number][] = [[lon, lat]]; // Start at camera

  // Left edge of cone
  const leftAngle = ((direction - spreadDegrees / 2) * Math.PI) / 180;
  const leftLon = lon + lengthDeg * Math.sin(leftAngle) / Math.cos(latRad);
  const leftLat = lat + lengthDeg * Math.cos(leftAngle);
  points.push([leftLon, leftLat]);

  // Create arc for the front of the cone
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const angle = ((direction - spreadDegrees / 2 + (spreadDegrees * i) / steps) * Math.PI) / 180;
    const arcLon = lon + lengthDeg * Math.sin(angle) / Math.cos(latRad);
    const arcLat = lat + lengthDeg * Math.cos(angle);
    points.push([arcLon, arcLat]);
  }

  // Right edge of cone
  const rightAngle = ((direction + spreadDegrees / 2) * Math.PI) / 180;
  const rightLon = lon + lengthDeg * Math.sin(rightAngle) / Math.cos(latRad);
  const rightLat = lat + lengthDeg * Math.cos(rightAngle);
  points.push([rightLon, rightLat]);

  // Close the polygon
  points.push([lon, lat]);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [points],
    },
  };
}

// Convert cameras to GeoJSON - optimized with pre-allocated array
function camerasToGeoJSON(cameras: ALPRCamera[]): GeoJSON.FeatureCollection {
  // Pre-allocate array for better performance with large camera sets
  const features = new Array(cameras.length);
  for (let i = 0; i < cameras.length; i++) {
    const camera = cameras[i];
    features[i] = {
      type: 'Feature' as const,
      id: camera.osmId,
      geometry: {
        type: 'Point' as const,
        coordinates: [camera.lon, camera.lat],
      },
      properties: {
        osmId: camera.osmId,
        osmType: camera.osmType,
        operator: camera.operator || '',
        brand: camera.brand || '',
        direction: camera.direction ?? null,
        directionCardinal: camera.directionCardinal || '',
        surveillanceZone: camera.surveillanceZone || '',
        mountType: camera.mountType || '',
        ref: camera.ref || '',
        startDate: camera.startDate || '',
        lat: camera.lat,
        lon: camera.lon,
        ts: camera.osmTimestamp ? new Date(camera.osmTimestamp).getTime() : 0,
      },
    };
  }
  return { type: 'FeatureCollection', features };
}

// Cluster layer style - smaller, tighter clusters
const clusterLayer: maplibregl.LayerSpecification = {
  id: 'clusters',
  type: 'circle',
  source: 'cameras',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#4DA6FF', // Blue for small clusters
      5,
      '#0080BC', // Darker blue for medium
      20,
      '#1565C0', // Even darker for large
      50,
      '#0D47A1', // Darkest for huge
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      14,  // Base size - smaller
      5,
      16,  // 5+ points
      20,
      20,  // 20+ points
      50,
      26,  // 50+ points
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#93CBFF',
    'circle-stroke-opacity': 0.5,
  },
};

// Cluster count label
const clusterCountLayer: maplibregl.LayerSpecification = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'cameras',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
    'text-size': 13,
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': '#ffffff',
  },
};

// Unclustered camera point - solid core
const unclusteredPointLayer: maplibregl.LayerSpecification = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'cameras',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#0080BC',
    'circle-radius': 6,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#93CBFF',
    'circle-opacity': 1,
  },
};

// Static glow for unclustered points - moderate ambient presence
const unclusteredGlowLayer: maplibregl.LayerSpecification = {
  id: 'unclustered-glow',
  type: 'circle',
  source: 'cameras',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#4DA6FF',
    'circle-radius': 16,
    'circle-opacity': 0.4,
    'circle-blur': 0.5,
  },
};

// Direction cone layer style - only show when zoomed past clusters
const directionConeLayer: maplibregl.LayerSpecification = {
  id: 'direction-cones',
  type: 'fill',
  source: 'direction-cones',
  minzoom: 12, // Only show when zoomed in past cluster level
  paint: {
    'fill-color': '#4DA6FF',
    'fill-opacity': 0.35,
  },
};

// Direction cone outline - only show when zoomed past clusters
const directionConeOutlineLayer: maplibregl.LayerSpecification = {
  id: 'direction-cones-outline',
  type: 'line',
  source: 'direction-cones',
  minzoom: 12, // Only show when zoomed in past cluster level
  paint: {
    'line-color': '#0080BC',
    'line-width': 2,
    'line-opacity': 0.7,
  },
};

interface CameraMarkerLayersProps {
  cameras: ALPRCamera[];
  visible: boolean;
  clustered: boolean;
  mapLoaded: boolean;
  mapRef: React.RefObject<{ getMap: () => maplibregl.Map } | null>;
  /** When set, all marker layers fade from 0 to full opacity between this zoom and +2. */
  crossfadeZoom?: number;
}

export function CameraMarkerLayers({ cameras, visible, clustered, crossfadeZoom }: CameraMarkerLayersProps) {
  const showCameraLayer = useMapStore(s => s.showCameraLayer);

  const cameraLayerVisibility: 'visible' | 'none' = visible ? 'visible' : 'none';

  // Zoom-interpolated opacity: fades from 0 → full over [crossfadeZoom, crossfadeZoom+2]
  const fadeIn = useCallback((fullOpacity: number) => {
    if (crossfadeZoom == null) return fullOpacity;
    return [
      'interpolate', ['linear'], ['zoom'],
      crossfadeZoom, 0,
      crossfadeZoom + 2, fullOpacity,
    ];
  }, [crossfadeZoom]);

  // Pre-compute paint overrides so Layer components get stable references
  const crossfadePaints = useMemo(() => {
    if (crossfadeZoom == null) return null;
    return {
      point: {
        ...unclusteredPointLayer.paint,
        'circle-opacity': fadeIn(1),
        'circle-stroke-opacity': fadeIn(1),
      },
      glow: {
        ...unclusteredGlowLayer.paint,
        'circle-opacity': fadeIn(0.4),
      },
      cluster: {
        ...clusterLayer.paint,
        'circle-opacity': fadeIn(1),
        'circle-stroke-opacity': fadeIn(0.5),
      },
      clusterCount: {
        ...clusterCountLayer.paint,
        'text-opacity': fadeIn(1),
      },
      cone: {
        ...directionConeLayer.paint,
        'fill-opacity': fadeIn(0.35),
      },
      coneOutline: {
        ...directionConeOutlineLayer.paint,
        'line-opacity': fadeIn(0.7),
      },
    };
  }, [crossfadeZoom, fadeIn]);

  // Convert cameras to GeoJSON
  const geojsonData = useMemo(
    () => {
      if (!showCameraLayer) return camerasToGeoJSON([]);
      return camerasToGeoJSON(cameras);
    },
    [showCameraLayer, cameras]
  );

  // Generate direction cones for cameras with direction data
  const directionConesData = useMemo((): GeoJSON.FeatureCollection => {
    if (!showCameraLayer) {
      return { type: 'FeatureCollection', features: [] };
    }
    const camerasWithDirection = cameras.filter(
      (c) => c.direction !== undefined && c.direction !== null
    );

    if (import.meta.env.DEV) {
      console.log(`[CameraMarkerLayers] Cameras with direction: ${camerasWithDirection.length} / ${cameras.length}`);
    }

    return {
      type: 'FeatureCollection',
      features: camerasWithDirection.map((camera) => {
        const cone = createDirectionCone(camera.lon, camera.lat, camera.direction!);
        cone.properties = {
          ...cone.properties,
          ts: camera.osmTimestamp ? new Date(camera.osmTimestamp).getTime() : 0,
        };
        return cone;
      }),
    };
  }, [cameras, showCameraLayer]);

  return (
    <>
      {/* Direction cones — minzoom already 12 in layer spec, no change needed */}
      <Source id="direction-cones" type="geojson" data={directionConesData}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...directionConeLayer} layout={{ visibility: cameraLayerVisibility }} paint={(crossfadePaints?.cone ?? directionConeLayer.paint) as any} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...directionConeOutlineLayer} layout={{ visibility: cameraLayerVisibility }} paint={(crossfadePaints?.coneOutline ?? directionConeOutlineLayer.paint) as any} />
      </Source>

      {/* Camera markers — when crossfading, minzoom prevents rendering invisible
          points below the fade-in threshold (avoids processing 62K hidden features) */}
      <Source
        key={clustered ? 'cameras-clustered' : 'cameras-unclustered'}
        id="cameras"
        type="geojson"
        data={geojsonData}
        cluster={clustered}
        clusterMaxZoom={11}
        clusterRadius={35}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...unclusteredGlowLayer} layout={{ visibility: cameraLayerVisibility }} paint={(crossfadePaints?.glow ?? unclusteredGlowLayer.paint) as any} minzoom={crossfadeZoom ?? unclusteredGlowLayer.minzoom} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...clusterLayer} layout={{ visibility: cameraLayerVisibility }} paint={(crossfadePaints?.cluster ?? clusterLayer.paint) as any} minzoom={crossfadeZoom ?? clusterLayer.minzoom} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...clusterCountLayer} layout={{ ...clusterCountLayer.layout, visibility: cameraLayerVisibility }} paint={(crossfadePaints?.clusterCount ?? clusterCountLayer.paint) as any} minzoom={crossfadeZoom ?? clusterCountLayer.minzoom} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...unclusteredPointLayer} layout={{ visibility: cameraLayerVisibility }} paint={(crossfadePaints?.point ?? unclusteredPointLayer.paint) as any} minzoom={crossfadeZoom ?? unclusteredPointLayer.minzoom} />
      </Source>
    </>
  );
}
