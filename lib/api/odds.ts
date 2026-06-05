import type { MatchOdds } from '@/types';

const BASE = 'https://api.the-odds-api.com/v4';
const KEY = process.env.THE_ODDS_API_KEY;

interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: {
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number }[];
    }[];
  }[];
}

export async function fetchWCOdds(): Promise<MatchOdds[]> {
  if (!KEY) return [];
  const url = `${BASE}/sports/soccer_fifa_world_cup/odds/?apiKey=${KEY}&regions=au&markets=h2h&dateFormat=iso&oddsFormat=decimal`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) return [];
  const data: OddsEvent[] = await res.json();

  return data.map((event) => ({
    matchId: event.id,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    bookmakers: event.bookmakers.map((b) => {
      const h2h = b.markets.find((m) => m.key === 'h2h');
      const home = h2h?.outcomes.find((o) => o.name === event.home_team)?.price ?? 0;
      const away = h2h?.outcomes.find((o) => o.name === event.away_team)?.price ?? 0;
      const draw = h2h?.outcomes.find((o) => o.name === 'Draw')?.price ?? 0;
      return { title: b.title, homeOdds: home, drawOdds: draw, awayOdds: away };
    }),
  }));
}

export function bestOdds(odds: MatchOdds): { home: number; draw: number; away: number } {
  if (!odds.bookmakers.length) return { home: 0, draw: 0, away: 0 };
  return {
    home: Math.max(...odds.bookmakers.map((b) => b.homeOdds)),
    draw: Math.max(...odds.bookmakers.map((b) => b.drawOdds)),
    away: Math.max(...odds.bookmakers.map((b) => b.awayOdds)),
  };
}
