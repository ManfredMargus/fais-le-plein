'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Loader2, MapPin, Zap, Navigation, ExternalLink, Heart, Share2 } from 'lucide-react';
import { Station, FUELS, resolvePrice } from '@/lib/types';
import { formatDistance, formatDate, getPriceLevel } from '@/lib/utils';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  ),
});

// ── Service icon mapping ──────────────────────────────────────────────────────
const SERVICE_ICONS: Record<string, { icon: string; label: string }> = {
  // Gonflage
  'Gonflage pneus':           { icon: '🔵', label: 'Gonfleur' },
  'Station de gonflage':      { icon: '🔵', label: 'Gonfleur' },
  // Lavage
  'Lavage automatique':       { icon: '🚗', label: 'Lavage auto' },
  'Lavage manuel':            { icon: '🪣', label: 'Lavage manuel' },
  'Station de lavage':        { icon: '🚗', label: 'Lavage' },
  'Lavage':                   { icon: '🚗', label: 'Lavage' },
  'Laverie':                  { icon: '👕', label: 'Laverie' },
  // Recharge
  'Bornes électriques':       { icon: '⚡', label: 'Recharge EV' },
  'Station de recharge':      { icon: '⚡', label: 'Recharge EV' },
  // DAB
  'DAB (Distributeur automatique de billets)': { icon: '🏧', label: 'DAB' },
  'Distributeur automatique de billets':       { icon: '🏧', label: 'DAB' },
  'DAB':                      { icon: '🏧', label: 'DAB' },
  // Boutique / restauration
  'Boutique alimentaire':     { icon: '🛒', label: 'Boutique' },
  'Boutique non alimentaire': { icon: '🛍️', label: 'Boutique' },
  'Restauration sur place':   { icon: '☕', label: 'Restauration' },
  'Restauration':             { icon: '☕', label: 'Restauration' },
  'Restauration à emporter':  { icon: '🥤', label: 'À emporter' },
  'Bar':                      { icon: '☕', label: 'Bar' },
  'Relais colis':             { icon: '📦', label: 'Relais colis' },
  // Services
  'Wifi':                     { icon: '📶', label: 'Wi-Fi' },
  'Wi-Fi':                    { icon: '📶', label: 'Wi-Fi' },
  'WC publics':               { icon: '🚻', label: 'Toilettes' },
  'Toilettes publiques':      { icon: '🚻', label: 'Toilettes' },
  'Douches':                  { icon: '🚿', label: 'Douches' },
  'Espace bébé':              { icon: '👶', label: 'Espace bébé' },
  'Location de véhicule':     { icon: '🚗', label: 'Location véhicule' },
  'Services réparation / entretien': { icon: '🔧', label: 'Réparation' },
  // Carburant
  'Carburant additivé':       { icon: '✨', label: 'Carb. additivé' },
  'Vente d\'additifs carburants': { icon: '✨', label: 'Additifs' },
  'Vente de fioul domestique': { icon: '🏠', label: 'Fioul' },
  'Vente de gaz domestique':  { icon: '🔵', label: 'Gaz' },
  'Vente de gaz domestique (Butane, Propane)': { icon: '🔵', label: 'Gaz' },
  'Vente de pétrole lampant': { icon: '🕯️', label: 'Pétrole lampant' },
  // Paiement
  'Cartes bancaires':         { icon: '💳', label: 'CB acceptée' },
  'Automate CB 24h/24':       { icon: '💳', label: 'CB 24h/24' },
  'Automate CB 24/24':        { icon: '💳', label: 'CB 24h/24' },
  // Poids lourds
  'Piste poids lourds':       { icon: '🚛', label: 'Poids lourds' },
};

const PRICE_STYLES = {
  cheap:     'bg-green-50  text-green-700  border-green-100',
  medium:    'bg-amber-50  text-amber-700  border-amber-100',
  expensive: 'bg-red-50    text-red-600    border-red-100',
};

const RADIUS_OPTIONS = [2, 5, 10, 20, 50];

interface Props {
  stations: Station[];
  center: { lat: number; lon: number } | null;
  radius: number;
  onRadiusChange: (r: number) => void;
  selectedFuel: string;
  loading: boolean;
  min: number;
  max: number;
}

/** Open navigation in the best available maps app */
function openItinerary(station: Station, mode: 'gmaps' | 'waze' | 'apple' = 'gmaps') {
  const { lat, lon } = station;
  const label = encodeURIComponent(
    station.brand && station.brand !== 'Indépendant' ? station.brand : station.address
  );
  let url = '';
  if (mode === 'waze') {
    url = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
  } else if (mode === 'apple') {
    url = `maps://maps.apple.com/?daddr=${lat},${lon}&q=${label}`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${label}`;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Score for "meilleur compromis": low price + reasonable proximity */
function computeCompromisId(
  stations: { id: string; distance?: number; prices: Station['prices'] }[],
  fuel: string,
  min: number,
  max: number,
): string | null {
  if (stations.length < 2) return null;
  const maxDist = Math.max(...stations.map((s) => s.distance ?? 0));
  let bestId: string | null = null;
  let bestScore = Infinity;
  for (const s of stations) {
    const price = resolvePrice(s.prices, fuel)?.value;
    if (!price) continue;
    const priceRatio = (price - min) / (max - min + 0.001);
    const distRatio = (s.distance ?? 0) / (maxDist + 0.001);
    const score = priceRatio * 0.65 + distRatio * 0.35;
    if (score < bestScore) { bestScore = score; bestId = s.id; }
  }
  return bestId;
}

export default function ResultsView({
  stations, center, radius, onRadiusChange, selectedFuel, loading, min, max,
}: Props) {
  const [sortBy, setSortBy] = useState<'price' | 'distance' | 'favorites'>('price');
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [showItinMenu, setShowItinMenu] = useState<string | null>(null);
  const [mapClickId, setMapClickId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flp_favorites');
      if (saved) setFavorites(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('flp_favorites', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const shareStation = useCallback((station: Station, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = station.brand && station.brand !== 'Indépendant' ? station.brand : station.address;
    const text = `${name} — ${station.city} : vérifier le prix sur Fais le plein`;
    const url = `https://faisleplein.vercel.app/?lat=${station.lat}&lon=${station.lon}`;
    if (navigator.share) {
      navigator.share({ title: name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`).then(() => alert('Lien copié !'));
    }
  }, []);

  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // ── When map marker is clicked → scroll list to that card ────────────────
  const handleMapClick = useCallback((id: string) => {
    setActiveStation(id);
    setMapClickId(id);
  }, []);

  useEffect(() => {
    if (!mapClickId) return;
    const el = cardRefs.current.get(mapClickId);
    if (el && listRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setMapClickId(null);
  }, [mapClickId]);

  // Close itinerary menu when clicking outside
  useEffect(() => {
    if (!showItinMenu) return;
    const handler = () => setShowItinMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showItinMenu]);

  // ── Collect all services present in current results ───────────────────────
  const availableServices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stations) {
      for (const svc of s.services) {
        counts.set(svc, (counts.get(svc) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, c]) => c >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, ...SERVICE_ICONS[name] ?? { icon: '🔧', label: name } }));
  }, [stations]);

  const toggleService = (name: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = stations.filter((s) => {
      if (selectedServices.size === 0) return true;
      return [...selectedServices].every((svc) => s.services.includes(svc));
    });
    if (sortBy === 'favorites') {
      list = list.filter((s) => favorites.has(s.id));
    }
    return list.sort((a, b) => {
      if (sortBy === 'price' || sortBy === 'favorites')
        return (resolvePrice(a.prices, selectedFuel)?.value ?? Infinity) -
               (resolvePrice(b.prices, selectedFuel)?.value ?? Infinity);
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });
  }, [stations, selectedServices, sortBy, selectedFuel, favorites]);

  const compromisId = useMemo(
    () => computeCompromisId(displayed, selectedFuel, min, max),
    [displayed, selectedFuel, min, max],
  );

  const currentFuel = FUELS.find((f) => f.key === selectedFuel);
  const savings = max > 0 && min > 0 ? ((max - min) * 50).toFixed(2) : null;

  return (
    <section id="map" className="flex flex-col lg:flex-row h-[calc(100vh-56px)] mt-14 bg-white">

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 h-[45vh] lg:h-full order-2 lg:order-1">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-2xl shadow-lg px-5 py-3.5 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-sm font-medium text-slate-600">Recherche des stations…</span>
            </div>
          </div>
        )}

        {!center && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-lg px-6 py-5 text-center max-w-xs mx-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-orange-500" />
              </div>
              <p className="font-semibold text-slate-800">Cherchez un lieu</p>
              <p className="text-slate-400 text-sm mt-1">Les stations proches s'afficheront ici</p>
            </div>
          </div>
        )}

        <MapView
          stations={displayed}
          center={center}
          radius={radius}
          selectedFuel={selectedFuel}
          min={min}
          max={max}
          activeStation={activeStation}
          onStationClick={handleMapClick}
        />

        {/* Radius pills */}
        {center && (
          <div className="absolute top-3 left-3 z-[999] flex gap-1.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => onRadiusChange(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all ${
                  radius === r
                    ? 'bg-orange-500 text-white shadow-orange-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        )}

        {/* Bottom info pill */}
        {stations.length > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[999]">
            <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-xs border border-slate-100 whitespace-nowrap">
              <span className="text-slate-400">{stations.length} stations</span>
              <span className="w-px h-3 bg-slate-200" />
              <span className="font-bold text-green-600">{min.toFixed(3)}€</span>
              <span className="text-slate-300">–</span>
              <span className="font-bold text-red-500">{max.toFixed(3)}€</span>
              {savings && (
                <>
                  <span className="w-px h-3 bg-slate-200" />
                  <span className="text-orange-500 font-semibold">{savings}€ d&apos;écart (50L)</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 flex flex-col border-l border-slate-100 order-1 lg:order-2 overflow-hidden">

        {/* Panel header: count + sort */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">
              {loading ? 'Recherche…' : `${displayed.length} station${displayed.length > 1 ? 's' : ''}`}
              {selectedServices.size > 0 && (
                <span className="ml-1.5 text-xs font-normal text-orange-500">
                  ({selectedServices.size} filtre{selectedServices.size > 1 ? 's' : ''} actif{selectedServices.size > 1 ? 's' : ''})
                </span>
              )}
            </h2>
            {center && !loading && (
              <p className="text-xs text-slate-400 mt-0.5">{currentFuel?.label} · {radius} km</p>
            )}
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            {([['price', 'Prix ↑'], ['distance', 'Distance'], ['favorites', '❤️']] as const).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  sortBy === s ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
                title={s === 'favorites' ? 'Mes favoris' : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Service filter chips ─────────────────────────────────────── */}
        {availableServices.length > 0 && (
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Filtrer par service
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {availableServices.map(({ name, icon, label, count }) => {
                const active = selectedServices.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleService(name)}
                    title={`${name} (${count} station${count > 1 ? 's' : ''})`}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                    <span className={`text-[10px] ${active ? 'text-orange-100' : 'text-slate-300'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {selectedServices.size > 0 && (
                <button
                  onClick={() => setSelectedServices(new Set())}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
                >
                  ✕ Tout effacer
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Station list ─────────────────────────────────────────────── */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {!center && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6 text-center">
              <MapPin className="w-8 h-8 mb-3 text-slate-200" />
              <p className="text-sm font-medium">Aucune recherche</p>
              <p className="text-xs mt-1">Saisissez une adresse ou géolocalisez-vous</p>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              <p className="text-sm">Chargement…</p>
            </div>
          )}
          {!loading && stations.length === 0 && center && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-6">
              <p className="text-sm font-medium">Aucune station trouvée</p>
              <p className="text-xs mt-1">Augmentez le rayon de recherche</p>
            </div>
          )}
          {!loading && stations.length > 0 && displayed.length === 0 && sortBy !== 'favorites' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-6">
              <p className="text-sm font-medium">Aucune station avec ces services</p>
              <button
                onClick={() => setSelectedServices(new Set())}
                className="mt-3 text-xs text-orange-500 hover:underline"
              >
                Effacer les filtres
              </button>
            </div>
          )}
          {sortBy === 'favorites' && displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-6">
              <Heart className="w-8 h-8 mb-3 text-slate-200" />
              <p className="text-sm font-medium">Aucun favori dans cette zone</p>
              <p className="text-xs mt-1">Cliquez sur ❤️ pour ajouter des stations</p>
            </div>
          )}

          {displayed.map((station, i) => {
            const priceObj = resolvePrice(station.prices, selectedFuel);
            if (!priceObj) return null;
            const level = getPriceLevel(priceObj.value, min, max);
            const isActive = activeStation === station.id;
            const isCompromis = station.id === compromisId && i > 0;
            const isFav = favorites.has(station.id);
            const brandName = station.brand && station.brand !== 'Indépendant' ? station.brand : null;
            // Title = brand (if known) else address. Sub = address only when brand is the title.
            const displayTitle = brandName ?? station.address;
            const displayAddress = brandName ? station.address : null;

            return (
              <div
                key={station.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(station.id, el);
                  else cardRefs.current.delete(station.id);
                }}
                className={`border-b border-slate-50 transition-colors ${
                  isActive ? 'bg-orange-50' : 'hover:bg-slate-50/70'
                }`}
              >
                        {/* Badges row */}
                {(i === 0 || isCompromis || isFav) && (
                  <div className="px-4 pt-2.5 flex gap-1.5">
                    {i === 0 && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        Moins cher
                      </span>
                    )}
                    {isCompromis && (
                      <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                        Meilleur compromis
                      </span>
                    )}
                    {isFav && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        ❤️ Favori
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setActiveStation(isActive ? null : station.id)}
                  className="w-full text-left px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Rank badge */}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-slate-100 text-slate-500' :
                      i === 2 ? 'bg-orange-50 text-orange-500' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-800 truncate max-w-[160px]">
                          {displayTitle}
                        </span>
                        {station.is24h && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex-shrink-0">
                            <Zap className="w-2.5 h-2.5" />24h
                          </span>
                        )}
                      </div>
                      {displayAddress && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">{displayAddress}</div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                        <span className="text-slate-500 font-medium">{station.city}</span>
                        {station.distance !== undefined && (
                          <span className="text-orange-400 font-semibold">{formatDistance(station.distance)}</span>
                        )}
                      </div>

                      {/* Active service pills */}
                      {selectedServices.size > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {[...selectedServices].map((svc) => {
                            const info = SERVICE_ICONS[svc] ?? { icon: '🔧', label: svc };
                            return (
                              <span key={svc} className="text-[9px] bg-orange-50 text-orange-500 border border-orange-100 px-1.5 py-0.5 rounded-full font-medium">
                                {info.icon} {info.label}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-300 mt-0.5">{formatDate(priceObj.updatedAt)}</div>
                    </div>

                    {/* Price + fav */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className={`px-3 py-2 rounded-xl border text-center min-w-[68px] ${PRICE_STYLES[level]}`}>
                        <div className="text-lg font-black leading-tight">{priceObj.value.toFixed(3)}</div>
                        <div className="text-[10px] font-medium opacity-60">€/L</div>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(station.id, e)}
                        className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-400'}`} />
                      </button>
                    </div>
                  </div>
                </button>

                {/* Expanded: all prices + services + itinerary */}
                {isActive && (
                  <div className="px-4 pb-4 ml-10">
                    {/* All fuel prices */}
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {Object.entries(station.prices).map(([fuel, p]) => (
                        <div key={fuel} className="bg-white rounded-lg p-2 border border-slate-100 text-center">
                          <div className="text-[10px] text-slate-400">{fuel}</div>
                          <div className="text-sm font-bold text-slate-700">{p.value.toFixed(3)}€</div>
                        </div>
                      ))}
                    </div>

                    {/* Services */}
                    {station.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {station.services.map((svc) => {
                          const info = SERVICE_ICONS[svc] ?? { icon: '🔧', label: svc };
                          return (
                            <span key={svc} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                              {info.icon} {info.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Itinerary + actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); openItinerary(station, 'gmaps'); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Google Maps
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openItinerary(station, 'waze'); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 text-white rounded-xl text-xs font-bold hover:bg-sky-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Waze
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openItinerary(station, 'apple'); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        Plans (iOS)
                      </button>
                      <button
                        onClick={(e) => toggleFavorite(station.id, e)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                          isFav ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                        {isFav ? 'Retiré des favoris' : 'Ajouter aux favoris'}
                      </button>
                      <button
                        onClick={(e) => shareStation(station, e)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Partager
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
