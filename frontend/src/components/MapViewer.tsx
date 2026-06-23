import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import type { RouteScoringDetails } from '../types';
import { getWeatherColor } from '../utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewerProps {
  data: RouteScoringDetails;
  weatherCards: { time: string; forecast: any; lat: number; lng: number; bearing: number | null }[];
  selectedCardIndex: number;
}

// Dynamic icon for weather markers with wind direction
const createWeatherIcon = (windDirection: number) => new L.DivIcon({
  html: `
    <div style="position: relative; width: 84px; height: 84px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; background-color: #195c96ff; width: 6px; height: 6px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); z-index: 2;"></div>
      <div style="position: absolute; transform: rotate(${windDirection}deg); width: 100%; height: 100%; display: flex; justify-content: center; z-index: 1;">
    <svg width="24" height="84" viewBox="0 0 24 84" fill="none" stroke="#c0c0c0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 1px 2px rgba(255,255,255,0.8));">
      <line x1="12" y1="2" x2="12" y2="82"></line>
      <polyline points="7.256 21.208 11.944 2.09 16.633 21.208" style="" stroke-width="3"></polyline>
    </svg>
      </div>
    </div>
  `,
  className: 'marker-icon',
  iconSize: [84, 84],
  iconAnchor: [42, 42]
});

const createChevronIcon = (rotation: number) => new L.DivIcon({
  html: `
    <div style="transform: rotate(${rotation}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffa474ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.4));">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </div>
  `,
  className: 'chevron-icon',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

function BoundsFitter({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  return null;
}

export default function MapViewer({ data, weatherCards, selectedCardIndex }: MapViewerProps) {
  // Extract route positions from trackPoints
  const routePositions = useMemo(() => {
    const positions: [number, number][] = [];
    if (!data.trackPoints) return positions;

    for (const pt of data.trackPoints) {
      if (pt && typeof pt.lat === 'number' && typeof pt.lng === 'number') {
        positions.push([pt.lat, pt.lng]);
      }
    }
    return positions;
  }, [data]);

  // Extract chevrons for the route
  const routeChevrons = useMemo(() => {
    const chevrons: any[] = [];
    if (!routePositions || routePositions.length < 2) return chevrons;

    const step = Math.max(1, Math.floor(routePositions.length / 20)); // roughly 20 chevrons

    for (let i = 0; i < routePositions.length - 1; i += step) {
      const p1 = routePositions[i];
      const p2 = routePositions[Math.min(i + 5, routePositions.length - 1)];

      if (p1[0] === p2[0] && p1[1] === p2[1]) continue;

      const lat1 = p1[0] * Math.PI / 180;
      const lon1 = p1[1] * Math.PI / 180;
      const lat2 = p2[0] * Math.PI / 180;
      const lon2 = p2[1] * Math.PI / 180;

      const dLon = lon2 - lon1;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      let bearing = Math.atan2(y, x) * 180 / Math.PI;
      bearing = (bearing + 360) % 360;

      chevrons.push({
        lat: p1[0],
        lng: p1[1],
        rotation: bearing
      });
    }

    return chevrons;
  }, [routePositions]);


  if (!routePositions.length) {
    return null;
  }

  return (
    <MapContainer
      center={routePositions[0]}
      zoom={13}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <BoundsFitter positions={routePositions} />

      <Polyline positions={routePositions} pathOptions={{ color: '#1976d2', weight: 4, opacity: 0.8 }} />

      {routeChevrons.map((c, index) => (
        <Marker key={`chevron-${index}`} position={[c.lat, c.lng]} icon={createChevronIcon(c.rotation)} interactive={false} keyboard={false} />
      ))}

      {weatherCards.map((m, index) => (
        m.forecast && (
          <Marker key={index} position={[m.lat, m.lng]} icon={createWeatherIcon(m.forecast.windDirection10m)} zIndexOffset={index === selectedCardIndex ? 1000 : 0}>
            {index === selectedCardIndex && (
              <Tooltip direction="top" offset={[0, -10]} className="weather-tooltip" permanent={true}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  lineHeight: 1.1,
                  padding: '4px 6px',
                  alignItems: 'center',
                  backgroundColor: getWeatherColor(m.forecast, true, m.bearing),
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(23, 23, 23, 1)',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{m.forecast.temperature2m.toFixed(0)}°C</span>
                  <span style={{ fontWeight: 500, fontSize: '11px' }}>{m.forecast.windSpeed10m.toFixed(0)} km/h</span>
                  <span style={{ fontWeight: 500, fontSize: '11px' }}>{m.forecast.precipitationProbability.toFixed(0)}%</span>
                  <span style={{ fontWeight: 500, fontSize: '11px' }}>{m.forecast.precipitation.toFixed(0)} mm</span>
                </div>
              </Tooltip>
            )}
          </Marker>
        )
      ))}
    </MapContainer >
  );
}
