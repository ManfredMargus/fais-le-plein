interface OsmStation {
  lat: number;
  lon: number;
  name: string;
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

  const query = `[out:json][timeout:10];
(
  node["amenity"="fuel"](${south},${west},${north},${east});
  way["amenity"="fuel"](${south},${west},${north},${east});
);
out center tags;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) return [];

  const data = await res.json();

  return (data.elements ?? [])
    .map((el: Record<string, unknown>) => {
      const elLat = el.type === 'node' ? (el.lat as number) : (el.center as Record<string, number>)?.lat;
      const elLon = el.type === 'node' ? (el.lon as number) : (el.center as Record<string, number>)?.lon;
      const tags = (el.tags ?? {}) as Record<string, string>;
      const name = tags.brand ?? tags.name ?? tags.operator ?? null;
      return { lat: elLat, lon: elLon, name };
    })
    .filter((s: { lat: unknown; lon: unknown; name: unknown }) => s.lat && s.lon && s.name) as OsmStation[];
}
