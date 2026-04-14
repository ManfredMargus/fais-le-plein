import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData } from '@/lib/parseStations';
import { getCached, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const year = parseInt(request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()));

  if (isNaN(year) || year < 2007 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: 'Année invalide' }, { status: 400 });
  }

  const cacheKey = `history_${year}`;
  const cached = getCached<unknown[]>(cacheKey);
  if (cached) return NextResponse.json({ data: cached, year });

  try {
    const data = await fetchHistoricalData(year);
    setCache(cacheKey, data);
    return NextResponse.json({ data, year });
  } catch (err) {
    console.error('[API/history]', err);
    return NextResponse.json({ error: 'Impossible de charger l\'historique' }, { status: 500 });
  }
}
