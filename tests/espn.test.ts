import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

  it('numbers positions sequentially within each group', async () => {
    const standings = await fetchStandings();
    for (const g of standings) {
      expect(g.table.map((r) => r.position)).toEqual(g.table.map((_, i) => i + 1));
    }
  });
});
