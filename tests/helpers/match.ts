import type { Match, MatchStatus, TournamentStage, TeamRef } from '@/types';
import { getFriendForCountry } from '@/lib/data/friends';

// Build a TeamRef the way the app does, resolving the owning friend from the
// country abbreviation so tests stay consistent with real friend assignments.
export function team(abbr: string, name = abbr): TeamRef {
  const friend = getFriendForCountry(abbr);
  return {
    abbr,
    name,
    logo: `https://a.espncdn.com/i/teamlogos/countries/500/${abbr.toLowerCase()}.png`,
    friendId: friend?.id ?? 'unknown',
    friendName: friend?.name ?? '?',
    friendColour: friend?.colour ?? '#999',
  };
}

let autoId = 0;

interface MatchOverrides {
  id?: string;
  stage?: TournamentStage;
  status?: MatchStatus;
  home: string;
  away: string;
  homeScore?: number | null;
  awayScore?: number | null;
  utcDate?: string;
}

// Minimal Match factory for scoring/drama tests. Scores default to null
// (unplayed); pass numbers for a finished result.
export function match(o: MatchOverrides): Match {
  return {
    id: o.id ?? `m${autoId++}`,
    stage: o.stage ?? 'GROUP_STAGE',
    group: undefined,
    utcDate: o.utcDate ?? '2026-06-11T19:00Z',
    status: o.status ?? 'STATUS_SCHEDULED',
    homeTeam: team(o.home),
    awayTeam: team(o.away),
    score: {
      home: o.homeScore ?? null,
      away: o.awayScore ?? null,
    },
    venue: 'Test Stadium',
    city: 'Testville',
  };
}

// A finished match with the given scoreline.
export function final(home: string, homeScore: number, away: string, awayScore: number, stage?: TournamentStage): Match {
  return match({ home, away, homeScore, awayScore, status: 'STATUS_FINAL', stage });
}
