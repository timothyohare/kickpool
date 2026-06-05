import type { Match, GroupStanding, StandingRow, MatchStatus, TournamentStage } from '@/types';
import { getFriendForCountry, normAbbr } from '@/lib/data/friends';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const ESPN_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world';

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

  const group = notesText.match(/Group ([A-L])/i)?.[1]?.toUpperCase();

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
  const url = `${ESPN_BASE}/scoreboard?dates=20260611-20260719&limit=200`;
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) throw new Error(`ESPN scoreboard error: ${res.status}`);
  const data = await res.json();
  return (data.events ?? []).map(parseEvent);
}

export async function fetchTodaysMatches(): Promise<Match[]> {
  const res = await fetch(`${ESPN_BASE}/scoreboard`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events ?? []).map(parseEvent);
}

export async function fetchStandings(): Promise<GroupStanding[]> {
  const res = await fetch(`${ESPN_V2}/standings`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`ESPN standings error: ${res.status}`);
  const data = await res.json();

  return (data.children ?? []).map((group: Record<string, unknown>) => {
    const entries = ((group.standings as Record<string,unknown>)?.entries ?? []) as Record<string, unknown>[];

    const table: StandingRow[] = entries.map((entry, idx) => {
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
        position: idx + 1,
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

    return {
      group: (group.name as string ?? '').replace('Group ', ''),
      table,
    };
  });
}

export async function fetchMatchById(matchId: string): Promise<Match | null> {
  const res = await fetch(`${ESPN_BASE}/scoreboard`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = await res.json();
  const event = (data.events ?? []).find((e: Record<string,string>) => String(e.id) === matchId);
  return event ? parseEvent(event) : null;
}
