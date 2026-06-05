import { NextResponse } from 'next/server';
import { fetchFixtures, fetchTodaysMatches } from '@/lib/api/espn';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const today = searchParams.get('today') === 'true';
  const group = searchParams.get('group');
  const friend = searchParams.get('friend');

  try {
    const matches = today ? await fetchTodaysMatches() : await fetchFixtures();

    const filtered = matches.filter((m) => {
      if (group && m.group !== group.toUpperCase()) return false;
      if (friend) {
        const hasFriend =
          m.homeTeam.friendId === friend || m.awayTeam.friendId === friend;
        if (!hasFriend) return false;
      }
      return true;
    });

    return NextResponse.json({ matches: filtered, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error('Fixtures API error:', err);
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 503 });
  }
}
