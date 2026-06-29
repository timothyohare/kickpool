import type { Match, GroupStanding, StandingRow, MatchStatus, TournamentStage } from '@/types';
import { getFriendForCountry, normAbbr, getGroupForCountry } from '@/lib/data/friends';
import { loadFixture } from '@/lib/api/espn-fixtures';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const ESPN_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world';

// When USE_FIXTURES=1, serve committed golden JSON instead of the network so local
// runs and CI are deterministic and offline. Otherwise a normal fetch.
async function espnFetch(url: string, init?: RequestInit): Promise<Response> {
  if (process.env.USE_FIXTURES === '1') {
    return new Response(JSON.stringify(loadFixture(url)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return fetch(url, init);
}

function teamRef(team: Record<string, unknown>, abbr: string) {
  const friend = getFriendForCountry(abbr);
  return {
    abbr,
    name: (team.displayName ?? team.shortDisplayName ?? abbr) as string,
    logo: (Array.isArray(team.logos) && team.logos[0]
      ? (team.logos[0] as Record<string, unknown>).href as string
      : `https://a.espncdn.com/i/teamlogos/countries/500/${abbr.toLowerCase()}.png`),
    friendId: friend?.id ?? 'unknown',
    friendName: friend?.name ?? '?',
    friendColour: friend?.colour ?? '#999',
  };
}

function mapStatus(espnStatus: string): MatchStatus {
  const map: Record<string, MatchStatus> = {
    'STATUS_SCHEDULED': 'STATUS_SCHEDULED',
    'STATUS_IN_PROGRESS': 'STATUS_IN_PROGRESS',
    'STATUS_HALFTIME': 'STATUS_HALFTIME',
    'STATUS_FULL_TIME': 'STATUS_FINAL',
    'STATUS_FINAL': 'STATUS_FINAL',
    'STATUS_POSTPONED': 'STATUS_POSTPONED',
  };
  return map[espnStatus] ?? 'STATUS_SCHEDULED';
}

function inferStage(notes: string, round?: string): TournamentStage {
  const text = (notes + ' ' + (round ?? '')).toLowerCase();
  if (text.includes('round of 16')) return 'ROUND_OF_16';
  if (text.includes('round of 32')) return 'ROUND_OF_32';
  if (text.includes('quarter')) return 'QUARTER_FINAL';
  if (text.includes('semi')) return 'SEMI_FINAL';
  if (text.includes('third') || text.includes('3rd')) return 'THIRD_PLACE';
  if (text.includes('final')) return 'FINAL';
  return 'GROUP_STAGE';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEvent(event: Record<string, any>): Match {
  const comp = (event.competitions ?? [{}])[0] ?? {};
  const competitors: Record<string, unknown>[] = comp.competitors ?? [];
  const home = competitors.find((c) => (c as Record<string,string>).homeAway === 'home') ?? {};
  const away = competitors.find((c) => (c as Record<string,string>).homeAway === 'away') ?? {};

  const homeTeamRaw = (home.team ?? {}) as Record<string, unknown>;
  const awayTeamRaw = (away.team ?? {}) as Record<string, unknown>;
  const homeAbbr = normAbbr(((homeTeamRaw.abbreviation ?? '') as string).toUpperCase());
  const awayAbbr = normAbbr(((awayTeamRaw.abbreviation ?? '') as string).toUpperCase());

  const statusObj = (comp.status ?? {}) as Record<string, unknown>;
  const statusType = (statusObj.type ?? {}) as Record<string, unknown>;
  const statusName = (statusType.name ?? 'STATUS_SCHEDULED') as string;

  const notesText = Array.isArray(event.notes)
    ? event.notes.map((n: Record<string,string>) => n.text ?? '').join(' ')
    : '';
  const stage = inferStage(notesText, comp.type?.text ?? '');

  // Derive group from static country→group map (ESPN doesn't embed group in scoreboard notes)
  const group = getGroupForCountry(homeAbbr) ?? getGroupForCountry(awayAbbr)
    ?? notesText.match(/Group ([A-L])/i)?.[1]?.toUpperCase();

  const venue = (comp.venue ?? {}) as Record<string, unknown>;

  return {
    id: String(event.id),
    stage,
    group,
    utcDate: (comp.date ?? event.date ?? '') as string,
    status: mapStatus(statusName),
    minute: statusType.shortDetail as string | undefined,
    homeTeam: teamRef(homeTeamRaw, homeAbbr),
    awayTeam: teamRef(awayTeamRaw, awayAbbr),
    score: {
      home: home.score != null ? Number(home.score) : null,
      away: away.score != null ? Number(away.score) : null,
    },
    venue: ((venue.fullName ?? venue.address) ?? 'TBD') as string,
    city: ((venue as Record<string, Record<string,string>>).address?.city ?? '') as string,
  };
}

export async function fetchFixtures(): Promise<Match[]> {
  // The full tournament schedule changes rarely, so it can be cached. But live
  // status/scores must be fresh: the dated-range board is slow to reflect
  // in-progress matches, and a cached fetch can never update faster than its
  // revalidate window (so router.refresh() alone never showed live scores).
  // Fix: overlay a fresh, small "current matchday" board on top of the cached
  // schedule. The no-arg board is NOT usable here — ESPN rolls it over on its
  // own timezone and it lags ~a day behind AEST, so during a live first half it
  // returns yesterday's finished matches and the live match never appears.
  // Instead, request an explicit ±1-day UTC window so today's kickoffs are
  // always present regardless of the UTC/AEST date boundary.
  const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const now = Date.now();
  const liveFrom = yyyymmdd(new Date(now - 24 * 60 * 60 * 1000));
  const liveTo = yyyymmdd(new Date(now + 24 * 60 * 60 * 1000));
  const scheduleUrl = `${ESPN_BASE}/scoreboard?dates=20260611-20260719&limit=200`;
  const liveUrl = `${ESPN_BASE}/scoreboard?dates=${liveFrom}-${liveTo}&limit=50`;
  const [schedRes, liveRes] = await Promise.all([
    espnFetch(scheduleUrl, { next: { revalidate: 300 } } as RequestInit),
    espnFetch(liveUrl, { cache: 'no-store' } as RequestInit),
  ]);
  if (!schedRes.ok) throw new Error(`ESPN scoreboard error: ${schedRes.status}`);
  const schedule: Match[] = ((await schedRes.json()).events ?? []).map(parseEvent);

  if (!liveRes.ok) return schedule;
  const live: Match[] = ((await liveRes.json()).events ?? []).map(parseEvent);
  const liveById = new Map(live.map((m) => [m.id, m]));
  // Replace scheduled entries with their fresh live/finished counterpart.
  return schedule.map((m) => liveById.get(m.id) ?? m);
}

export async function fetchTodaysMatches(): Promise<Match[]> {
  const res = await espnFetch(`${ESPN_BASE}/scoreboard`, { next: { revalidate: 60 } } as RequestInit);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events ?? []).map(parseEvent);
}

export async function fetchStandings(revalidateSeconds = 300): Promise<GroupStanding[]> {
  const res = await espnFetch(`${ESPN_V2}/standings`, { next: { revalidate: revalidateSeconds } } as RequestInit);
  if (!res.ok) throw new Error(`ESPN standings error: ${res.status}`);
  const data = await res.json();

  return (data.children ?? []).map((group: Record<string, unknown>) => {
    const entries = ((group.standings as Record<string,unknown>)?.entries ?? []) as Record<string, unknown>[];

    const table: StandingRow[] = entries.map((entry) => {
      const teamRaw = (entry.team ?? {}) as Record<string, unknown>;
      const abbr = normAbbr(((teamRaw.abbreviation ?? '') as string).toUpperCase());
      const friend = getFriendForCountry(abbr);
      const stats = (entry.stats ?? []) as Record<string, unknown>[];

      const stat = (name: string): number => {
        const s = stats.find((x) => x.name === name);
        return s ? Number(s.value) : 0;
      };

      const gp = stat('gamesPlayed');
      const w = stat('wins');
      const l = stat('losses');
      const d = Math.max(0, gp - w - l);
      const gf = stat('pointsFor') || stat('goalsScored') || 0;
      const ga = stat('pointsAgainst') || stat('goalsConceded') || 0;

      return {
        position: 0, // assigned after sorting below
        team: {
          abbr,
          name: (teamRaw.displayName ?? abbr) as string,
          logo: (Array.isArray(teamRaw.logos) && teamRaw.logos[0]
            ? (teamRaw.logos[0] as Record<string,string>).href
            : `https://a.espncdn.com/i/teamlogos/countries/500/${abbr.toLowerCase()}.png`),
          friendId: friend?.id ?? 'unknown',
          friendName: friend?.name ?? '?',
          friendColour: friend?.colour ?? '#999',
        },
        played: gp,
        won: w,
        drawn: d,
        lost: l,
        goalsFor: gf,
        goalsAgainst: ga,
        goalDifference: gf - ga,
        points: stat('points'),
      };
    });

    // ESPN's entries order isn't reliably sorted by our tiebreakers during/just
    // after live matches (it can list a 0-pt team above a 3-pt one), so order it
    // ourselves and number positions from the sorted result: points, then goal
    // difference, then goals for, then name as a stable fallback.
    table.sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name)
    );
    table.forEach((row, idx) => { row.position = idx + 1; });

    return {
      group: (group.name as string ?? '').replace('Group ', ''),
      table,
    };
  });
}

export async function fetchMatchById(matchId: string): Promise<Match | null> {
  // Resolve against the full tournament board (with live overlay), not ESPN's
  // no-arg "today" slate — that board lags ~a day behind AEST, so it omits both
  // in-progress and upcoming matches, making them fail with "Match not found".
  const matches = await fetchFixtures();
  return matches.find((m) => m.id === matchId) ?? null;
}
