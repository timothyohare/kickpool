import { NextResponse } from 'next/server';
import { fetchWCOdds } from '@/lib/api/odds';

export async function GET() {
  try {
    const odds = await fetchWCOdds();
    return NextResponse.json({ odds, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error('Odds API error:', err);
    return NextResponse.json({ odds: [], error: 'Odds unavailable' });
  }
}
