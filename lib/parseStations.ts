import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { Station } from './types';
import { detectBrand } from './utils';

const REALTIME_URL = 'https://donnees.roulez-eco.fr/opendata/instantane';

export async function fetchAndParseStations(): Promise<Station[]> {
  const response = await fetch(REALTIME_URL, {
    headers: { 'User-Agent': 'FaisLePleinBetter/1.0' },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length === 0) throw new Error('Empty ZIP');

  const xmlEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.xml')) || entries[0];
  const xmlBuffer = xmlEntry.getData();
  // ISO-8859-1 / latin1 encoding used by the government API
  const xmlText = xmlBuffer.toString('latin1');

  return parseStationsXML(xmlText);
}

function parseStationsXML(xmlText: string): Station[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['pdv', 'prix', 'service', 'jour', 'horaire'].includes(name),
    allowBooleanAttributes: true,
    // parseAttributeValue MUST be false: "E10", "SP95", "SP98" etc. would be
    // coerced to NaN by the parser (Number("E10") === NaN → String(NaN) === "NaN")
    parseAttributeValue: false,
  });

  const doc = parser.parse(xmlText);
  const pdvList: unknown[] = doc?.pdv_liste?.pdv ?? [];

  const stations: Station[] = [];

  for (const raw of pdvList) {
    const pdv = raw as Record<string, unknown>;
    try {
      const latRaw = pdv['@_latitude'];
      const lonRaw = pdv['@_longitude'];
      const lat = Number(latRaw) / 100000;
      const lon = Number(lonRaw) / 100000;

      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;
      // Skip stations outside mainland France + DOM-TOM bounds
      if (lat < -21.5 || lat > 51.5 || lon < -178 || lon > 56) continue;

      const prices: Record<string, { value: number; updatedAt: string; name: string }> = {};
      const prixList = Array.isArray(pdv.prix) ? pdv.prix : [];
      for (const p of prixList as Record<string, unknown>[]) {
        const name = String(p['@_nom'] ?? '');
        const value = Number(p['@_valeur']);
        const updatedAt = String(p['@_maj'] ?? '');
        if (name && !isNaN(value) && value > 0.5 && value < 10) {
          prices[name] = { value, updatedAt, name };
        }
      }

      const rawServices = (pdv as Record<string, Record<string, unknown>>).services;
      const serviceArr = rawServices?.service;
      const services: string[] = Array.isArray(serviceArr)
        ? serviceArr.filter((s) => typeof s === 'string')
        : [];

      const horairesRaw = pdv.horaires as Record<string, unknown> | undefined;
      const is24h =
        horairesRaw?.['@_automate-24-24'] === 1 ||
        horairesRaw?.['@_automate-24-24'] === '1';

      const address = String(pdv.adresse ?? '');
      const city = String(pdv.ville ?? '');
      const zipCode = String(pdv['@_cp'] ?? '');

      stations.push({
        id: String(pdv['@_id'] ?? ''),
        address,
        city,
        zipCode,
        lat,
        lon,
        pop: String(pdv['@_pop'] ?? 'R'),
        prices,
        services,
        is24h,
        brand: detectBrand(address, city),
      });
    } catch {
      // Skip malformed entries
    }
  }

  return stations;
}

export async function fetchHistoricalData(year: number): Promise<
  Array<{ month: string; [fuel: string]: number | string }>
> {
  const url = `https://donnees.roulez-eco.fr/opendata/annee/${year}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'FaisLePleinBetter/1.0' },
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) throw new Error(`Historical fetch failed: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length === 0) throw new Error('Empty ZIP');

  const xmlEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.xml')) || entries[0];
  const xmlBuffer = xmlEntry.getData();
  const xmlText = xmlBuffer.toString('latin1');

  return aggregateHistoricalData(xmlText, year);
}

function aggregateHistoricalData(
  xmlText: string,
  year: number,
): Array<{ month: string; [fuel: string]: number | string }> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['pdv', 'prix'].includes(name),
    parseAttributeValue: true,
  });

  const doc = parser.parse(xmlText);
  const pdvList: unknown[] = doc?.pdv_liste?.pdv ?? [];

  // month -> fuel -> [prices]
  const buckets: Record<string, Record<string, number[]>> = {};

  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    buckets[key] = {};
  }

  for (const raw of pdvList) {
    const pdv = raw as Record<string, unknown>;
    const prixList = Array.isArray(pdv.prix) ? (pdv.prix as Record<string, unknown>[]) : [];
    for (const p of prixList) {
      const name = String(p['@_nom'] ?? '');
      const value = Number(p['@_valeur']);
      const maj = String(p['@_maj'] ?? '');
      if (!name || isNaN(value) || value <= 0 || !maj) continue;

      const monthKey = maj.substring(0, 7); // YYYY-MM
      if (!buckets[monthKey]) continue;
      if (!buckets[monthKey][name]) buckets[monthKey][name] = [];
      buckets[monthKey][name].push(value);
    }
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, fuels]) => {
      const row: { month: string; [key: string]: number | string } = { month };
      for (const [fuel, prices] of Object.entries(fuels)) {
        if (prices.length > 0) {
          row[fuel] = +(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(3);
        }
      }
      return row;
    });
}
