export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatPrice(price: number): string {
  return price.toFixed(3).replace('.', ',') + ' €';
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function getPriceLevel(
  price: number,
  min: number,
  max: number,
): 'cheap' | 'medium' | 'expensive' {
  const ratio = (price - min) / (max - min || 1);
  if (ratio < 0.33) return 'cheap';
  if (ratio < 0.66) return 'medium';
  return 'expensive';
}

export function getPriceColor(price: number, min: number, max: number): string {
  const level = getPriceLevel(price, min, max);
  if (level === 'cheap') return '#22c55e';
  if (level === 'medium') return '#f59e0b';
  return '#ef4444';
}

const BRAND_PATTERNS: [RegExp, string][] = [
  [/leclerc/i, 'E.Leclerc'],
  [/intermarch[eé]/i, 'Intermarché'],
  [/carrefour/i, 'Carrefour'],
  [/casino/i, 'Casino'],
  [/totalenergies|total\b/i, 'TotalEnergies'],
  [/bp\b/i, 'BP'],
  [/esso/i, 'Esso'],
  [/shell/i, 'Shell'],
  [/avia/i, 'Avia'],
  [/système\s*u|systeme\s*u|\bsystemu\b/i, 'Système U'],
  [/\bspar\b/i, 'Spar'],
  [/\blidl\b/i, 'Lidl'],
  [/\baldi\b/i, 'Aldi'],
  [/\bneoness\b/i, 'Neoness'],
  [/\bvito\b/i, 'Vito'],
  [/\bQ8\b/i, 'Q8'],
  [/\bgulp\b/i, 'Gulp'],
  [/\bprimoil\b/i, 'Primoil'],
  [/\bor[eé]a\b/i, 'Oréa'],
  [/autoroute|aire\s+de/i, 'Autoroute'],
];

export function detectBrand(address: string, city: string): string {
  const text = `${address} ${city}`.toLowerCase();
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(text)) return brand;
  }
  return 'Indépendant';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffH < 24) return `il y a ${diffH}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export const DEPT_NAMES: Record<string, string> = {
  '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes',
  '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
  '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
  '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse', '21': 'Côte-d\'Or', '22': 'Côtes-d\'Armor', '23': 'Creuse',
  '24': 'Dordogne', '25': 'Doubs', '26': 'Drôme', '27': 'Eure',
  '28': 'Eure-et-Loir', '29': 'Finistère', '30': 'Gard', '31': 'Haute-Garonne',
  '32': 'Gers', '33': 'Gironde', '34': 'Hérault', '35': 'Ille-et-Vilaine',
  '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura',
  '40': 'Landes', '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire',
  '44': 'Loire-Atlantique', '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne',
  '48': 'Lozère', '49': 'Maine-et-Loire', '50': 'Manche', '51': 'Marne',
  '52': 'Haute-Marne', '53': 'Mayenne', '54': 'Meurthe-et-Moselle', '55': 'Meuse',
  '56': 'Morbihan', '57': 'Moselle', '58': 'Nièvre', '59': 'Nord',
  '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme',
  '64': 'Pyrénées-Atlantiques', '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales',
  '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhône', '70': 'Haute-Saône',
  '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie',
  '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines',
  '79': 'Deux-Sèvres', '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne',
  '83': 'Var', '84': 'Vaucluse', '85': 'Vendée', '86': 'Vienne',
  '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne', '90': 'Territoire de Belfort',
  '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne',
  '95': 'Val-d\'Oise', '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane',
  '974': 'La Réunion', '976': 'Mayotte',
};
