import { Source, Layer } from 'react-map-gl/maplibre';
import { useMapModeStore } from '../../../store';

export function BoundaryOverlayLayers() {
  const overlays = useMapModeStore(s => s.overlays);

  return (
    <>
      {/* State boundaries — outline only */}
      <Source id="state-boundaries" type="geojson" data="/states-metrics.geojson">
        <Layer
          id="state-boundaries-line"
          type="line"
          source="state-boundaries"
          layout={{ visibility: overlays.stateBoundaries ? 'visible' : 'none' }}
          paint={{
            'line-color': '#6b7280',
            'line-width': 1.5,
            'line-opacity': 0.6,
          }}
        />
      </Source>

      {/* County boundaries — outline only */}
      <Source id="county-boundaries" type="geojson" data="/counties-metrics.geojson">
        <Layer
          id="county-boundaries-line"
          type="line"
          source="county-boundaries"
          layout={{ visibility: overlays.countyBoundaries ? 'visible' : 'none' }}
          minzoom={6}
          paint={{
            'line-color': '#4b5563',
            'line-width': 0.8,
            'line-opacity': 0.5,
          }}
        />
      </Source>

      {/* Police stations — placeholder, hidden until data is available */}
      {overlays.policeStations && (
        <Source id="police-stations" type="geojson" data="/police-stations.geojson">
          <Layer
            id="police-stations-circle"
            type="circle"
            source="police-stations"
            minzoom={8}
            paint={{
              'circle-color': '#0080BC',
              'circle-radius': 5,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#93c5fd',
              'circle-opacity': 0.8,
            }}
          />
        </Source>
      )}
    </>
  );
}
