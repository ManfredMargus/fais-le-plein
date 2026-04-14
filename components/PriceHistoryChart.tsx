'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Clock, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { FUEL_COLORS, FUELS as FUEL_DEFS } from '@/lib/types';

const FUEL_LABEL: Record<string, string> = Object.fromEntries(FUEL_DEFS.map((f) => [f.key, f.label]));
// E10 maps to SP95 label
FUEL_LABEL['E10'] = 'SP95 / E10';

const AVAILABLE_FUELS = ['SP95', 'Gazole', 'E10', 'SP98'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2007 + 1 }, (_, i) => CURRENT_YEAR - i);

// Historical events to annotate the chart
const EVENTS: Record<number, { label: string; color: string }> = {
  2008: { label: 'Crise financière', color: '#ef4444' },
  2020: { label: 'COVID-19', color: '#8b5cf6' },
  2022: { label: 'Guerre Ukraine', color: '#f97316' },
};

interface DataPoint {
  month: string;
  [fuel: string]: number | string;
}

export default function PriceHistoryChart() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeFuels, setActiveFuels] = useState<string[]>(['SP95', 'Gazole']);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/history?year=${year}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        // Filter to months with data
        const filtered = (json.data as DataPoint[]).filter((d) =>
          AVAILABLE_FUELS.some((f) => d[f]),
        );
        setData(filtered);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  const toggleFuel = (fuel: string) => {
    setActiveFuels((prev) =>
      prev.includes(fuel) ? prev.filter((f) => f !== fuel) : [...prev, fuel],
    );
  };

  const formatMonth = (month: string) => {
    const [y, m] = month.split('-');
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months[parseInt(m) - 1] ?? m;
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass rounded-xl p-3 border border-white/10 shadow-2xl">
        <p className="text-slate-400 text-xs mb-2">{label} {year}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-400">{FUEL_LABEL[p.name] ?? p.name}</span>
            <span className="font-bold text-white ml-auto pl-4">
              {p.value?.toFixed(3)} €/L
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section id="history" className="bg-gradient-to-b from-transparent to-dark-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-white mb-1">
              Historique des <span className="gradient-text">prix</span>
            </h2>
            <p className="text-slate-400 text-sm">
              Évolution depuis 2007 · Données officielles gouvernementales
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <div className="flex gap-1 glass rounded-lg p-1 flex-wrap">
              {YEARS.slice(0, 10).map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    year === y
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fuel toggles */}
        <div className="flex gap-2 flex-wrap mb-6">
          {AVAILABLE_FUELS.map((fuel) => (
            <button
              key={fuel}
              onClick={() => toggleFuel(fuel)}
              style={
                activeFuels.includes(fuel)
                  ? {
                      background: FUEL_COLORS[fuel] + '22',
                      border: `1px solid ${FUEL_COLORS[fuel]}44`,
                      color: FUEL_COLORS[fuel],
                    }
                  : {}
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !activeFuels.includes(fuel) ? 'glass text-slate-500 hover:text-slate-300' : ''
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: activeFuels.includes(fuel) ? FUEL_COLORS[fuel] : '#4b5563' }}
              />
              {FUEL_LABEL[fuel] ?? fuel}
            </button>
          ))}
        </div>

        {/* Event info for selected year */}
        {EVENTS[year] && (
          <div
            className="flex items-center gap-3 glass rounded-xl p-3 mb-6 border"
            style={{ borderColor: EVENTS[year].color + '44' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: EVENTS[year].color }} />
            <p className="text-sm text-slate-300">
              <span style={{ color: EVENTS[year].color }} className="font-semibold">{year}</span>
              {' — '}
              {EVENTS[year].label} · Cet événement a eu un impact significatif sur les prix des carburants.
            </p>
          </div>
        )}

        {/* Chart */}
        <div className="glass rounded-2xl p-6 border border-white/5">
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="text-sm">
                  Chargement de l&apos;historique {year}...
                  {year < 2023 && <span className="text-slate-600"> (peut prendre quelques secondes)</span>}
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <AlertCircle className="w-8 h-8 text-red-500/50 mx-auto mb-2" />
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => setYear(year)}
                  className="mt-3 text-xs text-orange-400 hover:text-orange-300"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-slate-500 text-sm">
              Aucune donnée pour {year}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {activeFuels.map((fuel) => (
                    <linearGradient key={fuel} id={`grad-${fuel}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={FUEL_COLORS[fuel]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={FUEL_COLORS[fuel]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v.toFixed(2)}€`}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                {activeFuels.map((fuel) => (
                  <Area
                    key={fuel}
                    type="monotone"
                    dataKey={fuel}
                    stroke={FUEL_COLORS[fuel]}
                    strokeWidth={2}
                    fill={`url(#grad-${fuel})`}
                    dot={false}
                    activeDot={{ r: 4, fill: FUEL_COLORS[fuel] }}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Key events timeline */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { year: 2008, event: 'Crise financière 2008', desc: 'Chute brutale des prix au T4', color: '#ef4444', icon: '📉' },
            { year: 2020, event: 'COVID-19', desc: 'Baisse historique de la demande', color: '#8b5cf6', icon: '🦠' },
            { year: 2022, event: 'Guerre en Ukraine', desc: 'Prix record du Diesel en Europe', color: '#f97316', icon: '⚡' },
          ].map(({ year: y, event, desc, color, icon }) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`glass rounded-xl p-4 text-left border transition-all hover:border-white/15 ${
                year === y ? 'border-white/15 bg-white/5' : 'border-white/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{icon}</span>
                <span className="font-bold text-sm" style={{ color }}>
                  {y}
                </span>
              </div>
              <div className="text-sm text-slate-200 font-medium">{event}</div>
              <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
