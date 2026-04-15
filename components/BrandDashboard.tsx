'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingDown, TrendingUp, MapPin } from 'lucide-react';
import { FUELS } from '@/lib/types';

interface Stat { brand?: string; name?: string; count: number; avg: number; code?: string; }
interface GlobalStats {
  total: number;
  fuelStats: Record<string, { min: number; max: number; avg: number; count: number }>;
}

interface Props {
  globalStats: GlobalStats | null;
}

export default function BrandDashboard({ globalStats }: Props) {
  const [fuel, setFuel] = useState('SP95');
  const [tab, setTab] = useState<'brands' | 'departments'>('brands');
  const [data, setData] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(false);
  const [cheapestStation, setCheapestStation] = useState<{
    address: string; city: string; brand: string | null; price: number;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stations?mode=${tab}&fuel=${fuel}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fuel, tab]);

  // Fetch global cheapest station (France entière, rayon 1000km depuis le centre)
  useEffect(() => {
    fetch(`/api/stations?lat=46.6&lon=2.3&radius=1000&fuel=${fuel}&limit=1`)
      .then((r) => r.json())
      .then((d) => {
        const s = d.stations?.[0];
        if (s) {
          const priceObj = Object.values(s.prices as Record<string, { value: number }>)
            .find((_, i) => i === 0);
          const fuelKeys = FUELS.find((f) => f.key === fuel)?.apiKeys ?? [fuel];
          let price = 0;
          for (const k of fuelKeys) {
            if ((s.prices as Record<string, { value: number }>)[k]) {
              price = (s.prices as Record<string, { value: number }>)[k].value;
              break;
            }
          }
          if (!price && priceObj) price = priceObj.value;
          setCheapestStation({
            address: s.address,
            city: s.city,
            brand: s.brand !== 'Indépendant' ? s.brand : null,
            price,
          });
        }
      })
      .catch(console.error);
  }, [fuel]);

  const min = data.length ? Math.min(...data.map((d) => d.avg)) : 0;
  const max = data.length ? Math.max(...data.map((d) => d.avg)) : 1;

  const color = (avg: number) => {
    const r = (avg - min) / (max - min || 1);
    if (r < 0.33) return '#22c55e';
    if (r < 0.66) return '#f59e0b';
    return '#ef4444';
  };

  const label = (d: Stat) => d.brand ?? d.name ?? '';

  const currentFuel = FUELS.find((f) => f.key === fuel);
  const globalMin = currentFuel
    ? Math.min(...currentFuel.apiKeys.map((k) => globalStats?.fuelStats[k]?.min ?? Infinity).filter(isFinite))
    : null;

  return (
    <section id="dashboard" className="bg-white border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Qui est le moins cher ?</h2>
            <p className="text-slate-500 text-sm mt-1">Prix moyen par enseigne · Données temps réel</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {(['brands', 'departments'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm font-semibold transition-colors ${tab === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {t === 'brands' ? 'Enseignes' : 'Départements'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 p-1 overflow-x-auto">
              {FUELS.slice(0, 3).map((f) => (
                <button key={f.key} onClick={() => setFuel(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${fuel === f.key ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Cheapest station in France ─────────────────────────────────── */}
        {(cheapestStation || globalMin) && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-green-600 uppercase tracking-wide mb-0.5">
                Station la moins chère en France 🇫🇷
              </div>
              {cheapestStation ? (
                <div className="font-bold text-slate-800">
                  {cheapestStation.brand ?? cheapestStation.address}
                  {cheapestStation.brand && (
                    <span className="font-normal text-slate-500"> · {cheapestStation.address}</span>
                  )}
                  <span className="text-slate-400 font-normal"> — {cheapestStation.city}</span>
                </div>
              ) : (
                <div className="font-bold text-slate-800">Calcul en cours…</div>
              )}
              <div className="text-xs text-slate-400 mt-0.5">{currentFuel?.label}</div>
            </div>
            <div className="text-3xl font-black text-green-600 flex-shrink-0">
              {cheapestStation?.price
                ? `${cheapestStation.price.toFixed(3)}€`
                : globalMin
                  ? `${globalMin.toFixed(3)}€`
                  : '—'
              }
            </div>
          </div>
        )}

        {/* Winner / Loser cards */}
        {!loading && data.length >= 2 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-1 text-green-600 text-xs font-semibold">
                <TrendingDown className="w-3.5 h-3.5" />
                {tab === 'brands' ? 'Enseigne la moins chère' : 'Département le moins cher'}
              </div>
              <div className="text-2xl font-black text-green-700">{data[0].avg.toFixed(3)}€/L</div>
              <div className="text-slate-600 font-semibold text-sm mt-0.5">{label(data[0])}</div>
              <div className="text-slate-400 text-xs mt-0.5">{data[0].count} stations</div>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-1 text-red-500 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                {tab === 'brands' ? 'Enseigne la plus chère' : 'Département le plus cher'}
              </div>
              <div className="text-2xl font-black text-red-600">{data[data.length - 1].avg.toFixed(3)}€/L</div>
              <div className="text-slate-600 font-semibold text-sm mt-0.5">{label(data[data.length - 1])}</div>
              <div className="text-orange-500 text-xs font-semibold mt-0.5">
                +{((data[data.length - 1].avg - data[0].avg) * 50).toFixed(2)}€ sur 50L
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.slice(0, 15)} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" domain={[min * 0.997, max * 1.003]} tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(2)}€`} />
                <YAxis type="category" dataKey={tab === 'brands' ? 'brand' : 'name'}
                  tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip
                  content={({ active, payload, label: l }) => active && payload?.length ? (
                    <div className="bg-white rounded-xl shadow-lg p-3 border border-slate-100">
                      <p className="font-bold text-slate-800 text-sm">{l}</p>
                      <p className="text-orange-500 font-black text-lg">{(payload[0].value as number).toFixed(3)} €/L</p>
                    </div>
                  ) : null}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {data.slice(0, 15).map((d, i) => <Cell key={i} fill={color(d.avg)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
