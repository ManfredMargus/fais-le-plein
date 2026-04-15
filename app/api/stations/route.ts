import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseStations } from '@/lib/parseStations';
import { getCached, setCache } from '@/lib/cache';
import { haversineDistance, detectBrand, DEPT_NAMES } from '@/lib/utils';
import { Station, FUELS, resolvePrice } from '@/lib/types';
import { fetchOsmStationNames, OsmStation } from '@/lib/overpass';

export const dynamic = 'force-dynamic';

/** Get the API keys to search for a given fuel selector key */
function getApiKeys(fuelKey: string): string[] {
  return [...(FUELS.find((f) => f.key === fuelKey)?.apiKeys ?? [fuelKey])];
}

/** Check if station has any of the given API fuel keys */
function stationHasFuel(station: Station, apiKeys: string[]): boolean {
  return apiKeys.some((k) => !!station.prices[k]);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get('lat') ?? '');
  const lon = parseFloat(params.get('lon') ?? '');
  const radius = Math.min(parseFloat(params.get('radius') ?? '10'), 100);
  const fuelKey = params.get('fuel') ?? 'SP95';
  const limit = Math.min(parseInt(params.get('limit') ?? '100'), 200);
  const mode = params.get('mode') ?? 'nearby';
  const skipOsm = params.get('skipOsm') === '1';

  try {
    let stations = getCached<Station[]>('all_stations');
    if (!stations) {
      stations = await fetchAndParseStations();
      setCache('all_stations', stations);
    }

    if (mode === 'stats') return NextResponse.json(computeGlobalStats(stations));
    if (mode === 'brands') return NextResponse.json(computeBrandStats(stations, fuelKey));
    if (mode === 'departments') return NextResponse.json(computeDepartmentStats(stations, fuelKey));

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
    }

    const apiKeys = getApiKeys(fuelKey);

    const nearby = stations
      .map((s) => ({ ...s, distance: haversineDistance(lat, lon, s.lat, s.lon) }))
      .filter((s) => s.distance <= radius && stationHasFuel(s, apiKeys))
      .sort((a, b) => {
        const pa = resolvePrice(a.prices, fuelKey)?.value ?? Infinity;
        const pb = resolvePrice(b.prices, fuelKey)?.value ?? Infinity;
        return pa - pb;
      })
      .slice(0, limit);

    const values = nearby
      .map((s) => resolvePrice(s.prices, fuelKey)?.value ?? 0)
      .filter(Boolean);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 5;

    // Enrich with OSM names (best-effort, skipped on phase-1 fast call)
    if (!skipOsm) try {
      const osmCacheKey = `osm_${lat.toFixed(2)}_${lon.toFixed(2)}_${radius}`;
      let osmStations = getCached<OsmStation[]>(osmCacheKey);
      if (!osmStations) {
        osmStations = await fetchOsmStationNames(lat, lon, radius);
        setCache(osmCacheKey, osmStations);
      }
      for (const station of nearby) {
        if (station.brand && station.brand !== 'Indépendant') continue;
        // Priority 1: amenity=fuel nodes (up to 500m)
        let bestName = '';
        let bestDist = Infinity;
        for (const osm of osmStations.filter((o) => o.isFuel)) {
          const d = haversineDistance(station.lat, station.lon, osm.lat, osm.lon);
          if (d < bestDist) { bestDist = d; bestName = osm.name; }
        }
        if (bestDist < 0.5 && bestName) { station.brand = bestName; continue; }
        // Priority 2: supermarket/hypermarket (up to 300m) — covers Super U, Leclerc, etc.
        bestDist = Infinity; bestName = '';
        for (const osm of osmStations.filter((o) => !o.isFuel)) {
          const d = haversineDistance(station.lat, station.lon, osm.lat, osm.lon);
          if (d < bestDist) { bestDist = d; bestName = osm.name; }
        }
        if (bestDist < 0.3 && bestName) station.brand = bestName;
      }
    } catch {} // OSM enrichment is best-effort

    return NextResponse.json({ stations: nearby, min, max, total: nearby.length });
  } catch (err) {
    console.error('[API/stations]', err);
    return NextResponse.json({ error: 'Erreur serveur — réessayez' }, { status: 500 });
  }
}

function computeGlobalStats(stations: Station[]) {
  const fuelStats: Record<string, { min: number; max: number; avg: number; count: number }> = {};
  for (const s of stations) {
    for (const [name, price] of Object.entries(s.prices)) {
      if (!fuelStats[name]) fuelStats[name] = { min: Infinity, max: -Infinity, avg: 0, count: 0 };
      fuelStats[name].min = Math.min(fuelStats[name].min, price.value);
      fuelStats[name].max = Math.max(fuelStats[name].max, price.value);
      fuelStats[name].avg += price.value;
      fuelStats[name].count++;
    }
  }
  for (const f of Object.values(fuelStats)) {
    f.avg = +(f.avg / f.count).toFixed(3);
    if (!isFinite(f.min)) f.min = 0;
  }
  return { total: stations.length, fuelStats };
}

function computeBrandStats(stations: Station[], fuelKey: string) {
  const apiKeys = getApiKeys(fuelKey);
  const brands: Record<string, { count: number; total: number }> = {};
  for (const s of stations) {
    const price = resolvePrice(s.prices, fuelKey);
    if (!price) continue;
    const brand = s.brand ?? detectBrand(s.address, s.city);
    if (!brands[brand]) brands[brand] = { count: 0, total: 0 };
    brands[brand].count++;
    brands[brand].total += price.value;
  }
  return Object.entries(brands)
    .map(([brand, { count, total }]) => ({ brand, count, avg: +(total / count).toFixed(3) }))
    .filter((b) => b.count >= 3)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 20);
}

function computeDepartmentStats(stations: Station[], fuelKey: string) {
  const depts: Record<string, { count: number; total: number }> = {};
  for (const s of stations) {
    const price = resolvePrice(s.prices, fuelKey);
    if (!price) continue;
    const cp = s.zipCode;
    let code = cp.startsWith('97') ? cp.substring(0, 3) : cp.substring(0, 2);
    if (cp.startsWith('20')) code = parseInt(cp) < 20200 ? '2A' : '2B';
    if (!depts[code]) depts[code] = { count: 0, total: 0 };
    depts[code].count++;
    depts[code].total += price.value;
  }
  return Object.entries(depts)
    .map(([code, { count, total }]) => ({
      code,
      name: DEPT_NAMES[code] ?? code,
      count,
      avg: +(total / count).toFixed(3),
    }))
    .filter((d) => d.count >= 3)
    .sort((a, b) => a.avg - b.avg);
}
