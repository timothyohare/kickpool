import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { fetchFixtures, fetchTodaysMatches, fetchStandings, fetchMatchById } from '@/lib/api/espn';

// Drive the real ESPN parsing logic against the committed golden fixtures
// (USE_FIXTURES=1) so these tests are deterministic and offline — no network.
const prev = process.env.USE_FIXTURES;
beforeAll(() => { process.env.USE_FIXTURES = '1'; });
afterAll(() => {
  // Restore precisely: assigning `undefined` would write the string "undefined".
  if (prev === undefined) delete process.env.USE_FIXTURES;
  else process.env.USE_FIXTURES = prev;
});

describe('fetchFixtures (golden scoreboard)', () => {
  it('parses every event in the fixture', async () => {
    const matches = await fetchFixtures();
    expect(matches.length).toBe(8);
  });

  it('maps the first event (MEX 2–0 RSA, full time) correctly', async () => {
    const matches = await fetchFixtures();
    const m = matches.find((x) => x.id === '760415')!;
    expect(m).toBeDefined();
    expect(m.homeTeam.abbr).toBe('MEX');
    expect(m.awayTeam.abbr).toBe('RSA');
    expect(m.score).toEqual({ home: 2, away: 0 });
    expect(m.status).toBe('STATUS_FINAL'); // STATUS_FULL_TIME normalises to FINAL
  });

  it('resolves friend ownership while parsing teams', async () => {
    const matches = await fetchFixtures();
    const m = matches.find((x) => x.id === '760415')!;
    expect(m.homeTeam.friendId).toBe('dan'); // MEX → Dan
    expect(m.awayTeam.friendId).toBe('boris'); // RSA → Boris
  });

  it('derives the group from the static draw map', async () => {
    const matches = await fetchFixtures();
    const m = matches.find((x) => x.id === '760415')!;
    expect(m.group).toBe('A'); // MEX is in Group A
  });

  it('always provides a non-null score object per team slot', async () => {
    const matches = await fetchFixtures();
    for (const m of matches) {
      expect(m.score).toHaveProperty('home');
      expect(m.score).toHaveProperty('away');
    }
  });
});

describe('fetchTodaysMatches', () => {
  it('returns parsed matches from the live scoreboard', async () => {
    const matches = await fetchTodaysMatches();
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBeTruthy();
  });
});

describe('fetchMatchById', () => {
  it('finds a match present in the fixture', async () => {
    const m = await fetchMatchById('760415');
    expect(m).not.toBeNull();
    expect(m!.homeTeam.abbr).toBe('MEX');
  });

  it('returns null for an unknown id', async () => {
    const m = await fetchMatchById('does-not-exist');
    expect(m).toBeNull();
  });
});

// Regression guard for the live AUS 1–0 TUR (event 760421) incident on 2026-06-14:
// fetchMatchById used to read ESPN's no-arg "today" board, which lags ~a day behind
// AEST and so omitted both in-progress and upcoming matches — predictions failed with
// "Match not found". It must resolve against the dated board (via fetchFixtures).
// The golden-fixture loader can't model this (it returns one board for every URL), so
// here we drop USE_FIXTURES and stub fetch to mimic ESPN's quirk directly: the no-arg
// board (no `dates=` query) is empty/stale, while the dated boards carry the live match.
describe('fetchMatchById regression: resolves a match absent from the no-arg board', () => {
  const liveEvent = {
    id: '760421',
    date: '2026-06-14T04:00Z',
    competitions: [{
      date: '2026-06-14T04:00Z',
      venue: { fullName: 'Allianz Stadium' },
      status: { type: { name: 'STATUS_HALFTIME', state: 'in', completed: false, shortDetail: 'HT' } },
      competitors: [
        { homeAway: 'home', team: { abbreviation: 'AUS', displayName: 'Australia' }, score: '1' },
        { homeAway: 'away', team: { abbreviation: 'TUR', displayName: 'Türkiye' }, score: '0' },
      ],
    }],
  };

  let savedUseFixtures: string | undefined;
  beforeAll(() => {
    savedUseFixtures = process.env.USE_FIXTURES;
    delete process.env.USE_FIXTURES; // force the real fetch path so the stub is hit
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      // Only the dated boards (the schedule range + the live ±1-day window) carry
      // the match; the no-arg "today" board is empty, as ESPN's was during the game.
      const events = String(url).includes('dates=') ? [liveEvent] : [];
      return { ok: true, json: async () => ({ events }) };
    }));
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    if (savedUseFixtures === undefined) delete process.env.USE_FIXTURES;
    else process.env.USE_FIXTURES = savedUseFixtures;
  });

  it('finds the in-progress match the no-arg board omits', async () => {
    const m = await fetchMatchById('760421');
    expect(m).not.toBeNull();
    expect(m!.homeTeam.abbr).toBe('AUS');
    expect(m!.awayTeam.abbr).toBe('TUR');
    expect(m!.score).toEqual({ home: 1, away: 0 });
    expect(m!.status).toBe('STATUS_HALFTIME');
  });
});

describe('fetchStandings (golden standings)', () => {
  it('parses all 12 groups', async () => {
    const standings = await fetchStandings();
    expect(standings).toHaveLength(12);
  });

  it('strips the "Group " prefix from group names', async () => {
    const standings = await fetchStandings();
    expect(standings[0].group).toBe('A');
  });

  it('parses Group A leaders into concrete rows from the golden fixture', async () => {
    const standings = await fetchStandings();
    const groupA = standings.find((g) => g.group === 'A')!;

    // MEX: 1 played, 1 win, 2 for / 0 against → GD +2, 3 points, owned by Dan.
    const mex = groupA.table.find((r) => r.team.abbr === 'MEX')!;
    expect(mex).toMatchObject({
      position: 1,
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
      points: 3,
    });
    expect(mex.team.friendId).toBe('dan');

    // CZE: 1 played, 1 loss, 1 for / 2 against → GD −1, 0 points.
    const cze = groupA.table.find((r) => r.team.abbr === 'CZE')!;
    expect(cze).toMatchObject({
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalsFor: 1,
      goalsAgainst: 2,
      goalDifference: -1,
      points: 0,
    });
  });

  it('orders each group by points then goal difference, not ESPN entry order', async () => {
    const standings = await fetchStandings();
    const groupA = standings.find((g) => g.group === 'A')!;
    // The golden fixture lists Group A in ESPN's raw order — MEX, CZE, KOR, RSA —
    // but KOR (3 pts, +1) must rank above CZE (0 pts, -1). Sorting is ours to do.
    expect(groupA.table.map((r) => r.team.abbr)).toEqual(['MEX', 'KOR', 'CZE', 'RSA']);
    expect(groupA.table.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it('numbers positions sequentially within each group', async () => {
    const standings = await fetchStandings();
    for (const g of standings) {
      expect(g.table.map((r) => r.position)).toEqual(g.table.map((_, i) => i + 1));
    }
  });
});
