import type { FriendScore, GroupStanding, StandingRow, Prediction, TournamentStage } from '@/types';
import { FRIENDS } from '@/lib/data/friends';
import { team } from './match';

// A single country entry inside a FriendScore.
export function countryEntry(
  abbr: string,
  over: Partial<FriendScore['countries'][number]> = {},
): FriendScore['countries'][number] {
  return {
    abbr,
    name: abbr,
    logo: `https://a.espncdn.com/i/teamlogos/countries/500/${abbr.toLowerCase()}.png`,
    alive: true,
    furthestStage: null,
    points: 0,
    ...over,
  };
}

// One friend's leaderboard aggregate. Resolves name/colour from the real roster
// when not overridden, so tests stay consistent with the app.
export function friendScore(over: Partial<FriendScore> & { friendId: string }): FriendScore {
  const f = FRIENDS.find((x) => x.id === over.friendId);
  return {
    friendId: over.friendId,
    friendName: over.friendName ?? f?.name ?? over.friendId,
    friendColour: over.friendColour ?? f?.colour ?? '#999',
    points: over.points ?? 0,
    countries: over.countries ?? [],
  };
}

// One standings-table row.
export function standingRow(
  abbr: string,
  over: Partial<Omit<StandingRow, 'team'>> = {},
): StandingRow {
  const gf = over.goalsFor ?? 0;
  const ga = over.goalsAgainst ?? 0;
  return {
    position: over.position ?? 1,
    team: team(abbr),
    played: over.played ?? 0,
    won: over.won ?? 0,
    drawn: over.drawn ?? 0,
    lost: over.lost ?? 0,
    goalsFor: gf,
    goalsAgainst: ga,
    goalDifference: over.goalDifference ?? gf - ga,
    points: over.points ?? 0,
  };
}

export function groupStanding(group: string, table: StandingRow[]): GroupStanding {
  return { group, table };
}

// A complete AI prediction.
export function prediction(over: Partial<Prediction> = {}): Prediction {
  return {
    matchId: '760415',
    generatedAt: new Date().toISOString(),
    homeWinProbability: 60,
    drawProbability: 15,
    awayWinProbability: 25,
    predictedScore: { home: 2, away: 1 },
    narrative: 'A deterministic test narrative.',
    keyFactors: ['form', 'squad depth'],
    confidence: 'medium',
    ...over,
  };
}

export type { TournamentStage };
