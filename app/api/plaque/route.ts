import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Fuel type mapping from French API codes to our fuel keys
const FUEL_MAP: Record<string, { key: string; label: string }> = {
  'ES':      { key: 'SP95',    label: 'Sans-plomb 95 / E10' },
  'GO':      { key: 'Diesel',  label: 'Diesel' },
  'EH':      { key: 'SP95',    label: 'Hybride essence → Sans-plomb 95' },
  'GH':      { key: 'Diesel',  label: 'Hybride diesel → Diesel' },
  'EL':      { key: 'SP95',    label: 'Électrique (pas de carburant)' },
  'GN':      { key: 'GPL',     label: 'GPL' },
  'GP':      { key: 'GPL',     label: 'GPL' },
  'H2':      { key: 'SP95',    label: 'Hydrogène' },
  'NC':      { key: 'SP95',    label: 'Non communiqué' },
};

// French fuel type codes (from SIV — Système d'Immatriculation des Véhicules)
const ENERGY_LABELS: Record<string, string> = {
  'ES': 'Essence', 'GO': 'Diesel / Gazole', 'EH': 'Hybride essence',
  'GH': 'Hybride diesel', 'EL': 'Électrique', 'GN': 'GPL/GNV',
  'GP': 'GPL', 'H2': 'Hydrogène', 'NC': 'Non communiqué',
};

export async function GET(request: NextRequest) {
  const immat = request.nextUrl.searchParams.get('immat')?.replace(/[\s-]/g, '').toUpperCase();

  if (!immat || immat.length < 5) {
    return NextResponse.json({ error: 'Plaque invalide' }, { status: 400 });
  }

  // Primary: use api.vehiculeimmatriculation.fr (requires API key via env var)
  const apiKey = process.env.PLAQUE_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.vehiculeimmatriculation.fr/immatriculation/${immat}`,
        {
          headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const energyCode = data.energie ?? data.energy ?? 'NC';
        const mapped = FUEL_MAP[energyCode] ?? FUEL_MAP['ES'];
        return NextResponse.json({
          immat,
          marque: data.marque ?? data.brand ?? 'Inconnu',
          modele: data.modele ?? data.model ?? '',
          energie: ENERGY_LABELS[energyCode] ?? energyCode,
          fuel: mapped.key,
          fuelLabel: mapped.label,
          label: `${data.marque ?? ''} ${data.modele ?? ''}`.trim(),
        });
      }
    } catch {
      // Fall through to demo mode
    }
  }

  // Fallback: try the free SIV/HISTOVEC proxy (no auth required for basic info)
  try {
    const res = await fetch(
      `https://api.carizy.com/api/v1/car?plate=${immat}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const data = await res.json();
      const energyRaw = (data.fuel_type ?? '').toLowerCase();
      let fuelKey = 'SP95';
      let fuelLabel = 'Sans-plomb 95';
      if (energyRaw.includes('diesel') || energyRaw.includes('gazole')) {
        fuelKey = 'Diesel'; fuelLabel = 'Diesel';
      } else if (energyRaw.includes('gpl')) {
        fuelKey = 'GPL'; fuelLabel = 'GPL';
      } else if (energyRaw.includes('e85') || energyRaw.includes('ethanol')) {
        fuelKey = 'E85'; fuelLabel = 'E85 / Éthanol';
      }
      return NextResponse.json({
        immat,
        marque: data.brand ?? data.make ?? '',
        modele: data.model ?? '',
        energie: data.fuel_type ?? 'Essence',
        fuel: fuelKey,
        fuelLabel,
        label: `${data.brand ?? ''} ${data.model ?? ''}`.trim(),
      });
    }
  } catch {
    // Fall through
  }

  // Demo fallback — for testing without API key
  // Detect diesel by common patterns in plate (not reliable, demo only)
  return NextResponse.json({
    error: 'api_key_required',
    message: 'Ajoutez PLAQUE_API_KEY dans vos variables d\'environnement Vercel (api.vehiculeimmatriculation.fr)',
    immat,
    // Return a plausible default
    fuel: 'SP95',
    fuelLabel: 'Sans-plomb 95',
    label: 'Véhicule (sans clé API)',
    demo: true,
  });
}
