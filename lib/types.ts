export interface FuelPrice {
  value: number;
  updatedAt: string;
  name: string;
}

export interface Station {
  id: string;
  address: string;
  city: string;
  zipCode: string;
  lat: number;
  lon: number;
  pop: string;
  prices: Record<string, FuelPrice>;
  services: string[];
  is24h: boolean;
  brand?: string;
  distance?: number;
}

// SP95 and E10 are the same pump in practice — most stations only report one
// "SP95" in this app = "whichever of E10 / SP95 is available, E10 preferred"
export const FUELS = [
  { key: 'SP95', label: 'SP95 / E10', emoji: '🔵', apiKeys: ['E10', 'SP95'] },
  { key: 'Gazole', label: 'Diesel', emoji: '⛽', apiKeys: ['Gazole'] },
  { key: 'SP98', label: 'SP98', emoji: '🟣', apiKeys: ['SP98'] },
  { key: 'E85', label: 'E85', emoji: '🌿', apiKeys: ['E85'] },
  { key: 'GPLc', label: 'GPL', emoji: '🟢', apiKeys: ['GPLc'] },
] as const;

export type FuelKey = (typeof FUELS)[number]['key'];

export const FUEL_COLORS: Record<string, string> = {
  SP95: '#3b82f6',
  Gazole: '#f97316',
  SP98: '#8b5cf6',
  E85: '#22c55e',
  GPLc: '#10b981',
};

/** Resolve the display price for a station given a selected fuel key */
export function resolvePrice(
  prices: Record<string, FuelPrice>,
  fuelKey: string,
): FuelPrice | undefined {
  const fuel = FUELS.find((f) => f.key === fuelKey);
  if (!fuel) return prices[fuelKey];
  for (const apiKey of fuel.apiKeys) {
    if (prices[apiKey]) return prices[apiKey];
  }
  return undefined;
}
