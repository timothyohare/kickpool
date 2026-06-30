import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadFixture } from '@/lib/api/espn-fixtures';
import { fetchTodaysMatches } from '@/lib/api/espn';

const prevUse = process.env.USE_FIXTURES;
const prevScenario = process.env.FIXTURE_SCENARIO;

afterEach(() => {
  if (prevUse === undefined) delete process.env.USE_FIXTURES; else process.env.USE_FIXTURES = prevUse;
  if (prevScenario === undefined) delete process.env.FIXTURE_SCENARIO; else process.env.FIXTURE_SCENARIO = prevScenario;
});

describe('loadFixture', () => {
  it('serves the standings blob for a standings URL', () => {
    const data = loadFixture('https://x/standings') as { children: unknown[] };
    expect(Array.isArray(data.children)).toBe(true);
    expect(data.children.length).toBe(12);
  });

  it('returns an isolated copy (mutating one read does not affect the next)', () => {
    const a = loadFixture('https://x/scoreboard') as { events: unknown[] };
    a.events = [];
    const b = loadFixture('https://x/scoreboard') as { events: unknown[] };
    expect(b.events.length).toBe(8); // unaffected by the mutation above
  });
});

describe('FIXTURE_SCENARIO=live', () => {
  beforeEach(() => {
    process.env.USE_FIXTURES = '1';
    process.env.FIXTURE_SCENARIO = 'live';
  });

  it('forces the first scoreboard event to an in-progress 1–0', () => {
    const board = loadFixture('https://x/scoreboard') as {
      events: { competitions: { status: { type: { name: string } }; competitors: { score: string }[] }[] }[];
    };
    const comp = board.events[0].competitions[0];
    expect(comp.status.type.name).toBe('STATUS_IN_PROGRESS');
    expect(comp.competitors[0].score).toBe('1');
    expect(comp.competitors[1].score).toBe('0');
  });

  it('surfaces the live state through the parser', async () => {
    const matches = await fetchTodaysMatches();
    const live = matches.find((m) => m.status === 'STATUS_IN_PROGRESS');
    expect(live).toBeDefined();
    expect(live!.score).toMatchObject({ home: 1, away: 0 });
  });
});
