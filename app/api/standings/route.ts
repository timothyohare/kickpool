import { NextResponse } from 'next/server';
import { fetchStandings } from '@/lib/api/espn';

export async function GET() {
  try {
    const groups = await fetchStandings();
    return NextResponse.json({ groups, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error('Standings API error:', err);
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 503 });
  }
}
