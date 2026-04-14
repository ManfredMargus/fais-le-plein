'use client';

import { useState } from 'react';
import { MapPin, Clock, Star, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Station, FUEL_LABELS, FUEL_ICONS } from '@/lib/types';
import { formatPrice, formatDistance, formatDate, getPriceLevel } from '@/lib/utils';

interface Props {
  stations: Station[];
  selectedFuel: string;
  min: number;
  max: number;
}

type SortKey = 'price' | 'distance';

const PRICE_CLASSES = {
  cheap: 'price-badge-cheap text-green-300',
  medium: 'price-badge-medium text-amber-300',
  expensive: 'price-badge-expensive text-red-300',
};

export default function StationsList({ stations, selectedFuel, min, max }: Props) {
  const [sort, setSort] = useState<SortKey>('price');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (stations.length === 0) return null;

  const sorted = [...stations].sort((a, b) => {
    if (sort === 'price') {
      return (a.prices[selectedFuel]?.value ?? Infinity) - (b.prices[selectedFuel]?.value ?? Infinity);
    }
    return (a.distance ?? Infinity) - (b.distance ?? Infinity);
  });

  const displayed = showAll ? sorted : sorted.slice(0, 12);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">
            Stations <span className="gradient-text">proches</span>
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {stations.length} stations · {FUEL_LABELS[selectedFuel] ?? selectedFuel}
          </p>
        </div>
        <div className="flex gap-2">
          {(['price', 'distance'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sort === key
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'glass text-slate-400 hover:text-white'
              }`}
            >
              {key === 'price' ? 'Prix' : 'Distance'}
            </button>
          ))}
        </div>
      </div>

      {/* Podium — top 3 */}
      {sorted.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {sorted.slice(0, 3).map((station, i) => {
            const price = station.prices[selectedFuel]?.value;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div
                key={station.id}
                className={`glass rounded-2xl p-4 text-center border transition-all cursor-pointer hover:border-orange-500/30 ${
                  i === 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5'
                }`}
                onClick={() =>
                  setExpanded(expanded === station.id ? null : station.id)
                }
              >
                <div className="text-2xl mb-1">{medals[i]}</div>
                <div className="text-xl font-black text-green-400">{price?.toFixed(3)}€</div>
                <div className="text-xs text-slate-400 truncate mt-1">{station.city}</div>
                {station.brand && station.brand !== 'Indépendant' && (
                  <div className="text-xs text-slate-500 truncate">{station.brand}</div>
                )}
                {station.distance !== undefined && (
                  <div className="text-xs text-sky-400 mt-1">{formatDistance(station.distance)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cards list */}
      <div className="space-y-2">
        {displayed.map((station, index) => {
          const price = station.prices[selectedFuel]?.value;
          const level = price ? getPriceLevel(price, min, max) : 'medium';
          const isExpanded = expanded === station.id;

          return (
            <div
              key={station.id}
              className="glass rounded-xl border border-white/5 hover:border-white/10 transition-all overflow-hidden"
            >
              <button
                className="w-full text-left p-4"
                onClick={() => setExpanded(isExpanded ? null : station.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg glass flex items-center justify-center text-sm font-bold text-slate-500">
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-sm truncate">
                        {station.address}
                      </span>
                      {station.is24h && (
                        <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                          <Zap className="w-2.5 h-2.5" />
                          24h
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {station.city} {station.zipCode}
                      </span>
                      {station.distance !== undefined && (
                        <span className="text-xs text-sky-400">{formatDistance(station.distance)}</span>
                      )}
                      {station.brand && station.brand !== 'Indépendant' && (
                        <span className="text-xs text-slate-500">{station.brand}</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {price ? (
                      <div
                        className={`px-3 py-1.5 rounded-lg text-sm font-black ${PRICE_CLASSES[level]}`}
                      >
                        {formatPrice(price)}
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg text-sm text-slate-600 glass">N/A</div>
                    )}
                    {station.prices[selectedFuel]?.updatedAt && (
                      <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDate(station.prices[selectedFuel].updatedAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {Object.entries(station.prices).map(([fuel, p]) => (
                      <div
                        key={fuel}
                        className={`rounded-lg p-2 text-center ${
                          fuel === selectedFuel
                            ? 'bg-orange-500/10 border border-orange-500/20'
                            : 'glass border border-white/5'
                        }`}
                      >
                        <div className="text-xs text-slate-500 mb-0.5">
                          {FUEL_ICONS[fuel]} {FUEL_LABELS[fuel] ?? fuel}
                        </div>
                        <div
                          className={`font-bold text-sm ${fuel === selectedFuel ? 'text-orange-400' : 'text-slate-300'}`}
                        >
                          {formatPrice(p.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {station.services.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {station.services.map((s) => (
                        <span key={s} className="text-[10px] text-slate-500 glass px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {sorted.length > 12 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full py-3 glass rounded-xl border border-white/5 text-slate-400 hover:text-white text-sm font-medium transition-all hover:border-white/10"
        >
          {showAll ? 'Voir moins' : `Voir les ${sorted.length - 12} autres stations`}
        </button>
      )}
    </section>
  );
}
