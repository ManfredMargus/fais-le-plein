'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Loader2, Settings2, MapPin, Route } from 'lucide-react';
import { Station, FUEL_LABELS } from '@/lib/types';

// Leaflet cannot be server-side rendered
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-dark-800">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm">Chargement de la carte...</span>
      </div>
    </div>
  ),
});

interface Props {
  stations: Station[];
  center: { lat: number; lon: number } | null;
  radius: number;
  onRadiusChange: (r: number) => void;
  selectedFuel: string;
  onFuelChange: (f: string) => void;
  loading: boolean;
  min: number;
  max: number;
}

const RADIUS_OPTIONS = [2, 5, 10, 20, 50];
const FUELS = ['SP95', 'E10', 'Gazole', 'SP98', 'E85', 'GPLc'];

export default function MapSection({
  stations,
  center,
  radius,
  onRadiusChange,
  selectedFuel,
  onFuelChange,
  loading,
  min,
  max,
}: Props) {
  const [showControls, setShowControls] = useState(true);

  return (
    <section id="map" className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-white mb-1">
              Carte <span className="gradient-text">interactive</span>
            </h2>
            <p className="text-slate-400 text-sm">
              {loading
                ? 'Chargement des stations...'
                : stations.length > 0
                  ? `${stations.length} stations trouvées dans un rayon de ${radius} km`
                  : 'Recherchez une ville ou géolocalisez-vous pour voir les stations proches'}
            </p>
          </div>
          <button
            onClick={() => setShowControls(!showControls)}
            className="p-2 rounded-lg glass border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Controls */}
          {showControls && (
            <div className="lg:col-span-1 space-y-4">
              {/* Fuel selector */}
              <div className="glass rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Carburant
                </h3>
                <div className="space-y-1">
                  {FUELS.map((fuel) => (
                    <button
                      key={fuel}
                      onClick={() => onFuelChange(fuel)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedFuel === fuel
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {FUEL_LABELS[fuel] ?? fuel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius */}
              <div className="glass rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Rayon de recherche
                </h3>
                <div className="space-y-1">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => onRadiusChange(r)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        radius === r
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="glass rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Légende
                </h3>
                <div className="space-y-2">
                  {[
                    { color: '#22c55e', label: 'Prix bas' },
                    { color: '#f59e0b', label: 'Prix moyen' },
                    { color: '#ef4444', label: 'Prix élevé' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ background: color }}
                      />
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-700 border border-blue-400 flex items-center justify-center">
                      <span className="text-[7px] text-blue-300 font-bold">24</span>
                    </div>
                    <span className="text-xs text-slate-400">Ouvert 24h/24</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {stations.length > 0 && (
                <div className="glass rounded-2xl p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Dans cette zone
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Moins cher</span>
                      <span className="text-green-400 font-bold">{min.toFixed(3)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Plus cher</span>
                      <span className="text-red-400 font-bold">{max.toFixed(3)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Stations</span>
                      <span className="text-slate-200 font-bold">{stations.length}</span>
                    </div>
                    {min > 0 && max > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Économie max</span>
                        <span className="text-orange-400 font-bold">
                          {((max - min) * 50).toFixed(2)} € (50L)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Map */}
          <div
            className={`${showControls ? 'lg:col-span-3' : 'lg:col-span-4'} relative rounded-2xl overflow-hidden border border-white/5`}
            style={{ height: '600px' }}
          >
            {loading && (
              <div className="absolute inset-0 bg-dark-900/80 flex items-center justify-center z-[1000] rounded-2xl backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <span className="text-slate-400 text-sm">Recherche des stations...</span>
                </div>
              </div>
            )}
            <MapView
              stations={stations}
              center={center}
              radius={radius}
              selectedFuel={selectedFuel}
              min={min}
              max={max}
            />
            {!center && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="glass rounded-2xl p-6 text-center max-w-xs mx-4 border border-white/10">
                  <MapPin className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">Recherchez une adresse</p>
                  <p className="text-slate-500 text-sm mt-1">
                    ou géolocalisez-vous pour voir les stations
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
