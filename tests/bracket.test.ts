import { describe, it, expect } from 'vitest';
import { buildBracket, type BracketSlot } from '@/lib/data/bracket';
import { DISPLAY_ORDER } from '@/lib/data/bracket/structure';
import type { GroupStanding } from '@/types';
import { groupStanding, standingRow } from './helpers/factories';
import { final } from './helpers/match';

// Real 2026 draw (lib/data/friends.ts COUNTRY_GROUP), position order 1..4 as listed.
const GROUPS: Record<string, [string, string, string, string]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

// A finished group: positions 1..4, all played 3. Identical third-place stats across groups so
// the best-8 tiebreak falls to the group letter (A–H qualify → Annex C key "ABCDEFGH").
function completeGroup(group: string): GroupStanding {
  const teams = GROUPS[group];
  return groupStanding(
    group,
    teams.map((abbr, i) =>
      standingRow(abbr, { position: i + 1, played: 3, points: 9 - i * 3, goalsFor: 4 - i, goalDifference: 4 - i }),
    ),
  );
}

function allComplete(): GroupStanding[] {
  return Object.keys(GROUPS).map(completeGroup);
}

function matchNo(bracket: ReturnType<typeof buildBracket>, no: number) {
  return bracket.rounds.flatMap((r) => r.matches).find((m) => m.matchNo === no)!;
}

const label = (s: BracketSlot) => (s.kind === 'placeholder' ? s.label : `team:${s.team.abbr}`);

describe('buildBracket', () => {
  it('renders every slot as a placeholder before any group has started', () => {
    const b = buildBracket([], []);
    expect(b.rounds.map((r) => r.stage)).toEqual([
      'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL',
    ]);

    const m73 = matchNo(b, 73); // runner A vs runner B
    expect(label(m73.home)).toBe('2A');
    expect(label(m73.away)).toBe('2B');

    const m74 = matchNo(b, 74); // winner E vs best-third (candidates of E)
    expect(label(m74.home)).toBe('1E');
    expect(label(m74.away)).toBe('3RD A/B/C/D/F');

    // Even an undecided match shows its fixed kickoff time from the 2026 schedule.
    expect(m73.kickoff).toBe('2026-06-28T19:00:00Z');

    const fin = matchNo(b, 104);
    expect(label(fin.home)).toBe('SF W1');
    expect(label(fin.away)).toBe('SF W2');
    const third = matchNo(b, 103);
    expect(label(third.home)).toBe('SF L1');
    expect(label(third.away)).toBe('SF L2');
  });

  it('lays out the round of 32 in ESPN card order', () => {
    const b = buildBracket(allComplete(), []);
    expect(b.rounds[0].matches.map((m) => m.matchNo)).toEqual(DISPLAY_ORDER.ROUND_OF_32);
  });

  it('shows a group leader provisionally until the group is mathematically over', () => {
    // Only group A has kicked off (one round played); everyone else is untouched.
    const groupA = groupStanding('A', GROUPS.A.map((abbr, i) =>
      standingRow(abbr, { position: i + 1, played: 1, points: i === 0 ? 3 : 0 }),
    ));
    const b = buildBracket([groupA], []);

    const m73 = matchNo(b, 73); // runner A (started → provisional team) vs runner B (untouched → placeholder)
    expect(m73.home.kind).toBe('team');
    expect(m73.home).toMatchObject({ kind: 'team', provisional: true });
    if (m73.home.kind === 'team') expect(m73.home.team.abbr).toBe('RSA');
    expect(label(m73.away)).toBe('2B');
  });

  it('resolves winners, runners-up and best-third slots once all groups finish', () => {
    const b = buildBracket(allComplete(), []);

    const m74 = matchNo(b, 74); // winner E = GER, best-third assigned to E
    expect(m74.home).toMatchObject({ kind: 'team', provisional: false });
    if (m74.home.kind === 'team') {
      expect(m74.home.team.abbr).toBe('GER');
      expect(m74.home.team.friendName).toBe('Jake'); // GER → Jake (lib/data/friends.ts)
    }
    // Annex C key "ABCDEFGH" assigns winner E → third of group C (HAI).
    expect(m74.away.kind).toBe('team');
    if (m74.away.kind === 'team') expect(m74.away.team.abbr).toBe('HAI');

    const m73 = matchNo(b, 73); // runner A = RSA (Boris), runner B = BIH
    if (m73.home.kind === 'team') expect(m73.home.team.friendName).toBe('Boris');
  });

  it('advances a knockout winner into the next round once its score is final', () => {
    const groups = allComplete();
    // M73 resolves to RSA (runner A) vs BIH (runner B); play it out 2–0 to RSA.
    const knockout = [final('RSA', 2, 'BIH', 0, 'ROUND_OF_32')];
    const b = buildBracket(groups, knockout);

    const m73 = matchNo(b, 73);
    expect(m73.winnerAbbr).toBe('RSA');
    expect(m73.match).toBeDefined();
    // A real fixture's date overrides the static schedule.
    expect(m73.kickoff).toBe('2026-06-11T19:00Z');

    // TREE: M90 takes the winners of M73 and M75 → its home slot is now RSA.
    const m90 = matchNo(b, 90);
    expect(m90.home).toMatchObject({ kind: 'team', provisional: false });
    if (m90.home.kind === 'team') expect(m90.home.team.abbr).toBe('RSA');
    // M75 hasn't been played, so M90's away slot is still a placeholder for it.
    expect(label(m90.away)).toBe('RD32 W3');
  });
});
