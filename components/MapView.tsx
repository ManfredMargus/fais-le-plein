'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, FUELS, resolvePrice } from '@/lib/types';
import { formatDistance, formatDate, getPriceColor } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createPriceIcon(
  price: number,
  min: number,
  max: number,
  rank: number,
  isActive: boolean,
): L.DivIcon {
  const color = getPriceColor(price, min, max);
  const isTop = rank === 0;
  const scale = isActive ? 'scale(1.25)' : isTop ? 'scale(1.1)' : 'scale(1)';
  const ring = isActive
    ? `box-shadow: 0 0 0 3px white, 0 0 0 5px ${color}, 0 4px 16px ${color}88;`
    : `box-shadow: 0 3px 12px ${color}55;`;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        background: ${color};
        color: white;
        padding: ${isTop ? '5px 10px' : '4px 8px'};
        border-radius: 10px;
        font-weight: 800;
        font-size: ${isTop ? '13px' : '12px'};
        white-space: nowrap;
        ${ring}
        border: 2px solid rgba(255,255,255,0.9);
        position: relative;
        font-family: -apple-system, sans-serif;
        cursor: pointer;
        transform: ${scale};
        transform-origin: bottom center;
        transition: transform 0.15s ease;
      ">
        ${isTop ? '⭐ ' : ''}${price.toFixed(3)}€
        <div style="
          position: absolute; bottom: -7px; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid ${color};
        "></div>
      </div>
    `,
    iconSize: [isTop ? 90 : 75, 30],
    iconAnchor: [isTop ? 45 : 37, 36],
    popupAnchor: [0, -38],
  });
}

function FlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    const prev = prevRef.current;
    if (!prev || prev.lat !== lat || prev.lon !== lon) {
      map.flyTo([lat, lon], 13, { duration: 1.2 });
      prevRef.current = { lat, lon };
    }
  }, [lat, lon, map]);
  return null;
}

/** Pan to a station without zooming in/out aggressively */
function PanToActive({ station }: { station: Station | null }) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    if (!station || station.id === prevRef.current) return;
    prevRef.current = station.id;
    const currentZoom = map.getZoom();
    map.flyTo([station.lat, station.lon], Math.max(currentZoom, 14), { duration: 0.8 });
  }, [station, map]);
  return null;
}

interface Props {
  stations: Station[];
  center: { lat: number; lon: number } | null;
  radius: number;
  selectedFuel: string;
  min: number;
  max: number;
  activeStation?: string | null;
  onStationClick?: (id: string) => void;
}

export default function MapView({
  stations, center, radius, selectedFuel, min, max, activeStation, onStationClick,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const activeStationObj = activeStation
    ? stations.find((s) => s.id === activeStation) ?? null
    : null;

  return (
    <MapContainer
      center={[46.6, 2.3]}
      zoom={6}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      {center && (
        <>
          <FlyTo lat={center.lat} lon={center.lon} />
          <Circle
            center={[center.lat, center.lon]}
            radius={radius * 1000}
            pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.04, weight: 1.5, dashArray: '6 4' }}
          />
          <Marker
            position={[center.lat, center.lon]}
            icon={L.divIcon({
              className: '',
              html: `<div style="
                width: 14px; height: 14px;
                background: #f97316; border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 3px rgba(249,115,22,0.25), 0 2px 8px rgba(0,0,0,0.2);
              "></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          />
        </>
      )}

      {/* Pan map when a station is selected from the list */}
      {activeStationObj && <PanToActive station={activeStationObj} />}

      {stations.map((station, i) => {
        const priceObj = resolvePrice(station.prices, selectedFuel);
        if (!priceObj) return null;
        const isActive = station.id === activeStation;
        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lon]}
            icon={createPriceIcon(priceObj.value, min, max, i, isActive)}
            zIndexOffset={isActive ? 1000 : 0}
            eventHandlers={{ click: () => onStationClick?.(station.id) }}
          >
            <Popup minWidth={220} maxWidth={280}>
              <PopupCard station={station} selectedFuel={selectedFuel} min={min} max={max} rank={i} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

function PopupCard({ station, selectedFuel, min, max, rank }: {
  station: Station; selectedFuel: string; min: number; max: number; rank: number;
}) {
  const priceObj = resolvePrice(station.prices, selectedFuel);
  const color = priceObj ? getPriceColor(priceObj.value, min, max) : '#94a3b8';
  const brandName = station.brand && station.brand !== 'Indépendant' ? station.brand : null;

  function openNav(mode: 'gmaps' | 'waze') {
    const url = mode === 'waze'
      ? `https://waze.com/ul?ll=${station.lat},${station.lon}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{ padding: '14px', minWidth: '200px' }}>
      {rank === 0 && (
        <div style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', display: 'inline-block', marginBottom: '8px', border: '1px solid #fde68a' }}>
          ⭐ Moins cher de la zone
        </div>
      )}
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', lineHeight: '1.3', marginBottom: '2px' }}>
        {brandName ?? station.address}
      </div>
      {brandName && (
        <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '2px' }}>
          {station.address}
        </div>
      )}
      <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '10px' }}>
        {station.city} {station.zipCode}
        {station.distance !== undefined && (
          <span style={{ color: '#f97316', marginLeft: '6px' }}>{formatDistance(station.distance)}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '28px', fontWeight: 900, color }}>
          {priceObj?.value.toFixed(3)}€
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
          {station.is24h && (
            <span style={{ background: '#eff6ff', color: '#3b82f6', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              24h/24
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
        {Object.entries(station.prices).slice(0, 4).map(([fuel, p]) => (
          <div key={fuel} style={{ background: '#f8fafc', borderRadius: '8px', padding: '6px 8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{fuel}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{p.value.toFixed(3)}€</div>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => openNav('gmaps')}
          style={{ flex: 1, background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', padding: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
        >
          Google Maps
        </button>
        <button
          onClick={() => openNav('waze')}
          style={{ flex: 1, background: '#00cce5', color: 'white', border: 'none', borderRadius: '10px', padding: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
        >
          Waze
        </button>
      </div>

      {priceObj?.updatedAt && (
        <div style={{ fontSize: '10px', color: '#cbd5e1', textAlign: 'center', marginTop: '8px' }}>
          Mis à jour {formatDate(priceObj.updatedAt)}
        </div>
      )}
    </div>
  );
}
