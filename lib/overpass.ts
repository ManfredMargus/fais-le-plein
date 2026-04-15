export interface OsmStation {
  lat: number;
  lon: number;
  name: string;
  isFuel: boolean; // true = amenity=fuel, false = supermarket/hypermarket
}

export async function fetchOsmStationNames(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<OsmStation[]> {
  const delta = radiusKm / 111;
  const latCos = Math.cos((lat * Math.PI) / 180);
  const south = (lat - delta).toFixed(6);
  const north = (lat + delta).toFixed(6);
  const west = (lon - delta / latCos).toFixed(6);
  const east = (lon + delta / latCos).toFixed(6);

  const query = `[out:json][timeout:25];
(
  node["amenity"="fuel"](${south},${west},${north},${east});
  way["amenity"="fuel"](${south},${west},${north},${east});
  node["shop"~"supermarket|hypermarket"](${south},${west},${north},${east});
  way["shop"~"supermarket|hypermarket"](${south},${west},${north},${east});
);
out center tags;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' },
    signal: AbortSignal.timeout(28000),
  });

  if (!res.ok) return [];

  const data = await res.json();

  return (data.elements ?? [])
    .map((el: Record<string, unknown>) => {
      const elLat = el.type === 'node' ? (el.lat as number) : (el.center as Record<string, number>)?.lat;
      const elLon = el.type === 'node' ? (el.lon as number) : (el.center as Record<string, number>)?.lon;
      const tags = (el.tags ?? {}) as Record<string, string>;
      const name = tags.brand ?? tags.name ?? tags.operator ?? null;
      const isFuel = tags.amenity === 'fuel';
      return { lat: elLat, lon: elLon, name, isFuel };
    })
    .filter((s: { lat: unknown; lon: unknown; name: unknown }) => s.lat && s.lon && s.name) as OsmStation[];
}
