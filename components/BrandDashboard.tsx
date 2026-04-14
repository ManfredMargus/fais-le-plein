'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { FUELS } from '@/lib/types';

interface Stat { brand?: string; name?: string; count: number; avg: number; code?: string; }

export default function BrandDashboard() {
  const [fuel, setFuel] = useState('SP95');
  const [tab, setTab] = useState<'brands' | 'departments'>('brands');
  const [data, setData] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stations?mode=${tab}&fuel=${fuel}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fuel, tab]);

  const min = data.length ? Math.min(...data.map((d) => d.avg)) : 0;
  const max = data.length ? Math.max(...data.map((d) => d.avg)) : 1;

  const color = (avg: number) => {
    const r = (avg - min) / (max - min || 1);
    if (r < 0.33) return '#22c55e';
    if (r < 0.66) return '#f59e0b';
    return '#ef4444';
  };

  const label = (d: Stat) => d.brand ?? d.name ?? '';

  return (
    <section id="dashboard" className="bg-white border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
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
