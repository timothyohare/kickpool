import type { TournamentStage, FriendScore, Match } from '@/types';
import { FRIENDS, normAbbr } from './friends';

export const PRIZE_POOL = 400;
export const ENTRIES = 8;
export const BUY_IN = 50;
export const PRIZE_1 = 250;
export const PRIZE_2 = 150;

const STAGE_ORDER: TournamentStage[] = [
  'GROUP_STAGE',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
];

export function calculateLeaderboard(matches: Match[]): FriendScore[] {
  // Teams with live or upcoming fixtures are still alive
  const alive = new Set<string>();
  for (const m of matches) {
    if (
      m.status === 'STATUS_SCHEDULED' ||
      m.status === 'STATUS_IN_PROGRESS' ||
      m.status === 'STATUS_HALFTIME'
    ) {
      alive.add(normAbbr(m.homeTeam.abbr));
      alive.add(normAbbr(m.awayTeam.abbr));
    }
  }

  // Track furthest stage each team appeared in (for display)
  const teamFurthest: Record<string, TournamentStage> = {};

  // FIFA points: 3 win / 1 draw / 0 loss (per the standard ranking system)
  // Extra-time wins = win; penalty shootout = draw (as per FIFA convention)
  // We can't distinguish ET/pens from the score alone, so we use score as-is:
  // equal final score → draw (1pt each), unequal → win/loss (3/0)
  const teamPts: Record<string, number> = {};
  const teamGD: Record<string, number> = {};
  const teamGF: Record<string, number> = {};

  for (const m of matches) {
    const h = normAbbr(m.homeTeam.abbr);
    const a = normAbbr(m.awayTeam.abbr);

    // Update furthest stage
    for (const abbr of [h, a]) {
      const curr = teamFurthest[abbr];
      if (!curr || STAGE_ORDER.indexOf(m.stage) > STAGE_ORDER.indexOf(curr)) {
        teamFurthest[abbr] = m.stage;
      }
    }

    if (m.status !== 'STATUS_FINAL') continue;

    const hs = m.score.home ?? 0;
    const as = m.score.away ?? 0;

    teamPts[h] = (teamPts[h] ?? 0);
    teamPts[a] = (teamPts[a] ?? 0);
    teamGD[h] = (teamGD[h] ?? 0) + (hs - as);
    teamGD[a] = (teamGD[a] ?? 0) + (as - hs);
    teamGF[h] = (teamGF[h] ?? 0) + hs;
    teamGF[a] = (teamGF[a] ?? 0) + as;

    if (hs > as) {
      teamPts[h] += 3;
    } else if (as > hs) {
      teamPts[a] += 3;
    } else {
      teamPts[h] += 1;
      teamPts[a] += 1;
    }
  }

  const scores: FriendScore[] = FRIENDS.map((friend) => {
    const countries = friend.countries.map((abbr) => ({
      abbr,
      name: abbr,
      logo: `https://a.espncdn.com/i/teamlogos/countries/500/${abbr.toLowerCase()}.png`,
      alive: alive.has(abbr),
      furthestStage: teamFurthest[abbr] ?? null,
      points: teamPts[abbr] ?? 0,
    }));

    return {
      friendId: friend.id,
      friendName: friend.name,
      friendColour: friend.colour,
      points: countries.reduce((sum, c) => sum + c.points, 0),
      countries,
    };
  });

  // Rank by total points, then total goal difference, then total goals scored
  return scores.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aGD = a.countries.reduce((sum, c) => sum + (teamGD[c.abbr] ?? 0), 0);
    const bGD = b.countries.reduce((sum, c) => sum + (teamGD[c.abbr] ?? 0), 0);
    if (bGD !== aGD) return bGD - aGD;
    const aGF = a.countries.reduce((sum, c) => sum + (teamGF[c.abbr] ?? 0), 0);
    const bGF = b.countries.reduce((sum, c) => sum + (teamGF[c.abbr] ?? 0), 0);
    return bGF - aGF;
  });
}
