'use client';

import { useState } from 'react';
import { Search, MapPin, Loader2, TrendingDown, Zap, Shield } from 'lucide-react';
import { FUELS } from '@/lib/types';

interface Props {
  globalStats: Record<string, { min: number; max: number; avg: number; count: number }> | null;
  totalStations: number;
  selectedFuel: string;
  onFuelChange: (f: string) => void;
  onSearch: (lat: number, lon: number) => void;
}

export default function HeroSection({ globalStats, totalStations, selectedFuel, onFuelChange, onSearch }: Props) {
  const [address, setAddress] = useState('');
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const currentFuel = FUELS.find((f) => f.key === selectedFuel);

  const getStatFor = (key: string | undefined, field: 'avg' | 'min' | 'count') => {
    if (!globalStats || !currentFuel) return null;
    for (const k of currentFuel.apiKeys) {
      const v = globalStats[k]?.[field];
      if (v) return v;
    }
    return null;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      const f = data.features?.[0];
      if (f) {
        const [lon, lat] = f.geometry.coordinates;
        onSearch(lat, lon);
      } else {
        alert('Adresse introuvable. Essayez avec une ville ou un code postal.');
      }
    } catch {
      alert('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSearching(false);
    }
  };

  const handleGeo = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { onSearch(pos.coords.latitude, pos.coords.longitude); setGeoLoading(false); },
      () => { alert("Géolocalisation refusée. Activez-la dans votre navigateur."); setGeoLoading(false); },
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  const avg = getStatFor(selectedFuel, 'avg') as number | null;
  const min = getStatFor(selectedFuel, 'min') as number | null;
  const count = getStatFor(selectedFuel, 'count') as number | null;

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12 bg-[#f8fafc]">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
        <Zap className="w-3 h-3" />
        Prix mis à jour toutes les 10 minutes
      </div>

      {/* Title */}
      <h1 className="text-4xl sm:text-6xl font-black text-slate-900 leading-tight mb-3 text-center tracking-tight">
        Le carburant le moins cher
        <br />
        <span className="text-orange-500">près de chez vous</span>
      </h1>
      <p className="text-slate-400 text-base sm:text-lg mb-10 text-center">
        {totalStations.toLocaleString('fr-FR')} stations · données officielles du gouvernement
      </p>

      {/* ─── BIG SEARCH BOX ─────────────────────────────── */}
      <div className="w-full max-w-2xl">
        {/* Fuel selector */}
        <div className="flex gap-2 flex-wrap justify-center mb-4">
          {FUELS.map((fuel) => {
            const fuelAvg = (() => {
              if (!globalStats) return null;
              for (const k of fuel.apiKeys) {
                if (globalStats[k]?.avg) return globalStats[k].avg;
              }
              return null;
            })();
            return (
              <button
                key={fuel.key}
                onClick={() => onFuelChange(fuel.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedFuel === fuel.key
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{fuel.emoji}</span>
                {fuel.label}
                {fuelAvg && (
                  <span className={`text-xs ${selectedFuel === fuel.key ? 'text-orange-100' : 'text-slate-400'}`}>
                    {fuelAvg.toFixed(3)}€
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 p-2 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ville, code postal ou adresse..."
              className="w-full h-14 pl-12 pr-4 text-base text-slate-800 placeholder-slate-300 bg-transparent focus:outline-none"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={searching || !address.trim()}
            className="h-14 px-6 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold rounded-xl transition-colors flex items-center gap-2 flex-shrink-0 text-base"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span className="hidden sm:inline">Chercher</span>
          </button>
        </form>

        {/* Geolocation CTA */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleGeo}
            disabled={geoLoading}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors group disabled:opacity-40"
          >
            {geoLoading
              ? <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              : <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
            }
            Me géolocaliser automatiquement
          </button>
        </div>
      </div>

      {/* Live stats — subtle, below search */}
      {avg && (
        <div className="mt-14 grid grid-cols-3 gap-4 w-full max-w-lg">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <div className="text-2xl font-black text-slate-900">{avg.toFixed(3)}€</div>
            <div className="text-xs text-slate-400 mt-1">Moy. France · {currentFuel?.label}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-black text-green-600">{min?.toFixed(3)}€</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Meilleur prix France</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <div className="flex items-center justify-center gap-1">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-2xl font-black text-blue-600">{count?.toLocaleString('fr-FR')}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Stations actives</div>
          </div>
        </div>
      )}
    </section>
  );
}
