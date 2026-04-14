'use client';

import { useState } from 'react';
import { Search, MapPin, Loader2, Fuel } from 'lucide-react';
import { FUELS } from '@/lib/types';

interface Props {
  selectedFuel: string;
  onFuelChange: (f: string) => void;
  onSearch: (lat: number, lon: number) => void;
  globalStats: Record<string, { avg: number }> | null;
  /** Compact mode: shown only after first search */
  compact?: boolean;
}

export default function Navigation({ selectedFuel, onFuelChange, onSearch, globalStats, compact }: Props) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      const f = data.features?.[0];
      if (f) {
        const [lon, lat] = f.geometry.coordinates;
        onSearch(lat, lon);
      } else {
        alert('Adresse introuvable.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeo = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { onSearch(pos.coords.latitude, pos.coords.longitude); setGeoLoading(false); },
      () => { alert('Géolocalisation refusée.'); setGeoLoading(false); },
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className={`flex items-center gap-3 transition-all duration-200 ${compact ? 'h-14' : 'h-16'}`}>

          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <Fuel className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-900 text-base hidden sm:block">
              Plein<span className="text-orange-500">Optimal</span>
            </span>
          </button>

          {/* Fuel tabs */}
          <div className="flex gap-1 overflow-x-auto flex-shrink-0 scrollbar-none">
            {FUELS.map((fuel) => {
              const avg = (() => {
                if (!globalStats) return null;
                for (const k of fuel.apiKeys) {
                  if ((globalStats as Record<string, { avg: number }>)[k]?.avg)
                    return (globalStats as Record<string, { avg: number }>)[k].avg;
                }
                return null;
              })();
              return (
                <button
                  key={fuel.key}
                  onClick={() => onFuelChange(fuel.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedFuel === fuel.key
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{fuel.emoji}</span>
                  <span className="hidden md:inline">{fuel.label}</span>
                  {avg && (
                    <span className={`${selectedFuel === fuel.key ? 'text-orange-100' : 'text-slate-300'}`}>
                      {avg.toFixed(2)}€
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search — only visible after first search */}
          {compact && (
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-sm ml-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nouvelle recherche..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-100 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !address.trim()}
                className="h-8 w-8 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-colors"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleGeo}
                disabled={geoLoading}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
              >
                {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /> : <MapPin className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}
