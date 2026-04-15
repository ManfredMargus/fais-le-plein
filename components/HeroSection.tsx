'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, TrendingDown, Zap, Shield, ChevronRight, Flame } from 'lucide-react';
import { FUELS } from '@/lib/types';

interface Props {
  globalStats: Record<string, { min: number; max: number; avg: number; count: number }> | null;
  totalStations: number;
  selectedFuel: string;
  onFuelChange: (f: string) => void;
  onSearch: (lat: number, lon: number) => void;
}

/** Animated counter that counts up from 0 to target */
function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = value / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplayed(value); clearInterval(timer); }
      else setDisplayed(start);
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <>{decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed).toLocaleString('fr-FR')}</>;
}

const QUICK_CITIES = [
  { label: 'Paris', lat: 48.8566, lon: 2.3522 },
  { label: 'Lyon', lat: 45.7640, lon: 4.8357 },
  { label: 'Marseille', lat: 43.2965, lon: 5.3698 },
  { label: 'Bordeaux', lat: 44.8378, lon: -0.5792 },
  { label: 'Lille', lat: 50.6292, lon: 3.0573 },
  { label: 'Toulouse', lat: 43.6047, lon: 1.4442 },
];

export default function HeroSection({ globalStats, totalStations, selectedFuel, onFuelChange, onSearch }: Props) {
  const [address, setAddress] = useState('');
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [liters, setLiters] = useState(50);

  const currentFuel = FUELS.find((f) => f.key === selectedFuel);

  const getStatFor = (field: 'avg' | 'min' | 'max' | 'count'): number | null => {
    if (!globalStats || !currentFuel) return null;
    for (const k of currentFuel.apiKeys) {
      const v = globalStats[k]?.[field];
      if (v) return v;
    }
    return null;
  };

  const avg = getStatFor('avg');
  const minPrice = getStatFor('min');
  const maxPrice = getStatFor('max');
  const count = getStatFor('count');

  const savings = avg && minPrice ? ((avg - minPrice) * liters).toFixed(2) : null;

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

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16 bg-gradient-to-b from-white via-[#f8fafc] to-[#f1f5f9]">

      {/* Live badge */}
      <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold px-4 py-2 rounded-full mb-8 shadow-sm">
        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        Mis à jour en temps réel · données officielles
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.05] mb-4 text-center tracking-tight">
        Payez moins cher
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          à chaque plein
        </span>
      </h1>
      <p className="text-slate-500 text-base sm:text-lg mb-10 text-center max-w-md">
        Comparez les prix de {totalStations.toLocaleString('fr-FR')} stations en France en temps réel
      </p>

      {/* ── Main search card ─────────────────────────────────────────────── */}
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
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  selectedFuel === fuel.key
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105'
                    : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-orange-300 hover:shadow-sm'
                }`}
              >
                <span>{fuel.emoji}</span>
                {fuel.label}
                {fuelAvg && (
                  <span className={`text-xs font-semibold ${selectedFuel === fuel.key ? 'text-orange-100' : 'text-slate-400'}`}>
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
          className="bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-100 p-2 flex gap-2"
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
            className="h-14 px-6 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-md shadow-orange-200 flex items-center gap-2 flex-shrink-0 text-base"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span className="hidden sm:inline">Chercher</span>
          </button>
        </form>

        {/* Geolocation + quick cities */}
        <div className="flex flex-col items-center gap-3 mt-4">
          <button
            onClick={handleGeo}
            disabled={geoLoading}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-500 transition-colors group disabled:opacity-40"
          >
            {geoLoading
              ? <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              : <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform text-orange-400" />
            }
            Me géolocaliser automatiquement
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs text-slate-300 font-medium">Accès rapide :</span>
            {QUICK_CITIES.map((city) => (
              <button
                key={city.label}
                onClick={() => onSearch(city.lat, city.lon)}
                className="text-xs font-semibold text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-0.5"
              >
                {city.label}
                <ChevronRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      {avg && (
        <div className="mt-14 w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100 col-span-2 sm:col-span-1">
            <div className="text-2xl font-black text-slate-900">
              <Counter value={avg} decimals={3} />€
            </div>
            <div className="text-xs text-slate-400 mt-1">Prix moyen France</div>
            <div className="text-[10px] text-slate-300 mt-0.5">{currentFuel?.label}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-green-100">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-black text-green-600">
                <Counter value={minPrice ?? 0} decimals={3} />€
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Meilleur prix</div>
            <div className="text-[10px] text-slate-300 mt-0.5">n'importe où en France</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <div className="flex items-center justify-center gap-1">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-2xl font-black text-blue-600">
                <Counter value={count ?? 0} />
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Stations actives</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <div className="flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-2xl font-black text-orange-500">
                {maxPrice && minPrice ? ((maxPrice - minPrice) * 50).toFixed(0) : '—'}€
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Écart max (50L)</div>
            <div className="text-[10px] text-slate-300 mt-0.5">économisable en France</div>
          </div>
        </div>
      )}

      {/* ── Savings calculator ───────────────────────────────────────────── */}
      {savings && avg && minPrice && (
        <div className="mt-6 w-full max-w-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-slate-700">Calculateur d&apos;économies</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-slate-500 whitespace-nowrap">Litres par plein :</span>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={liters}
                onChange={(e) => setLiters(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-sm font-bold text-slate-700 w-10 text-right">{liters}L</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-orange-500">{savings}€</div>
              <div className="text-xs text-slate-400">d&apos;économie possible vs prix moyen</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Feature bullets ─────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-slate-400">
        {[
          { icon: '⚡', text: 'Données en temps réel' },
          { icon: '🗺️', text: 'Carte interactive' },
          { icon: '🧭', text: 'Itinéraire direct' },
          { icon: '🏷️', text: 'Toutes les enseignes' },
          { icon: '📱', text: '100% mobile' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 font-medium">
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
