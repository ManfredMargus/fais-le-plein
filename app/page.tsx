'use client';

import { useState, useEffect, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import ResultsView from '@/components/ResultsView';
import BrandDashboard from '@/components/BrandDashboard';
import { Station, resolvePrice } from '@/lib/types';
import { ExternalLink, Heart } from 'lucide-react';

interface GlobalStats {
  total: number;
  fuelStats: Record<string, { min: number; max: number; avg: number; count: number }>;
}

export default function Home() {
  const [selectedFuel, setSelectedFuel] = useState('SP95');
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [radius, setRadius] = useState(10);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(5);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetch('/api/stations?mode=stats')
      .then((r) => r.json())
      .then((d: GlobalStats) => setGlobalStats(d))
      .catch(console.error);
  }, []);

  const fetchStations = useCallback(async (lat: number, lon: number, fuel: string, r?: number) => {
    const searchRadius = r ?? radius;
    setLoading(true);
    try {
      const res = await fetch(`/api/stations?lat=${lat}&lon=${lon}&radius=${searchRadius}&fuel=${fuel}&limit=100`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStations(data.stations ?? []);
      setMin(data.min ?? 0);
      setMax(data.max ?? 5);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [radius]);

  const handleSearch = useCallback((lat: number, lon: number) => {
    setCenter({ lat, lon });
    setHasSearched(true);
    fetchStations(lat, lon, selectedFuel);
  }, [selectedFuel, fetchStations]);

  const handleFuelChange = useCallback((fuel: string) => {
    setSelectedFuel(fuel);
    if (center) fetchStations(center.lat, center.lon, fuel);
  }, [center, fetchStations]);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
    if (center) fetchStations(center.lat, center.lon, selectedFuel, r);
  }, [center, selectedFuel, fetchStations]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navigation
        selectedFuel={selectedFuel}
        onFuelChange={handleFuelChange}
        onSearch={handleSearch}
        globalStats={globalStats?.fuelStats ?? null}
        compact={hasSearched}
      />

      {!hasSearched ? (
        <HeroSection
          globalStats={globalStats?.fuelStats ?? null}
          totalStations={globalStats?.total ?? 11000}
          selectedFuel={selectedFuel}
          onFuelChange={setSelectedFuel}
          onSearch={handleSearch}
        />
      ) : (
        <ResultsView
          stations={stations}
          center={center}
          radius={radius}
          onRadiusChange={handleRadiusChange}
          selectedFuel={selectedFuel}
          loading={loading}
          min={min}
          max={max}
        />
      )}

      <BrandDashboard />

      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">PleinOptimal</span>
            <span>·</span>
            <span>Données actualisées toutes les 10 min</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.prix-carburants.gouv.fr/rubrique/opendata/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source officielle
            </a>
            <span className="flex items-center gap-1.5">
              Fait avec <Heart className="w-3.5 h-3.5 text-orange-400 fill-orange-400" /> en France
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
