// Resolve the fixed 2026 knockout slot tree (lib/data/bracket/structure.ts) against kickpool's
// own group standings + knockout fixtures into a renderable bracket. Pure and framework-free so
// it can be unit-tested without booting Next or hitting ESPN.
//
// "As they are determined": group winners/runners-up fill in from the live standings (shown
// provisionally until the group is mathematically over), best-third slots resolve once all 12
// groups finish (Annex C), and knockout winners advance up the tree as ESPN posts final scores.
import type { GroupStanding, Match, StandingRow, TeamRef, TournamentStage } from '@/types';
import { R32, TREE, DISPLAY_ORDER, KNOCKOUT_DATES, feederLabel, type Slot } from './bracket/structure';
import { ANNEX_C, THIRD_CANDIDATES } from './bracket/annex-c';

export type BracketSlot =
  | { kind: 'team'; team: TeamRef; provisional: boolean }
  | { kind: 'placeholder'; label: string };

export interface BracketMatch {
  matchNo: number;
  stage: TournamentStage;
  home: BracketSlot;
  away: BracketSlot;
  /** The ESPN fixture, when both teams are known and it exists in the schedule. */
  match?: Match;
  /** Kickoff time (UTC ISO): the live fixture's when known, else the fixed 2026 schedule. */
  kickoff?: string;
  /** Abbr of the team that advances, when the match has finished with a decisive score. */
  winnerAbbr?: string;
}

export interface BracketRound {
  stage: TournamentStage;
  matches: BracketMatch[];
}

export interface Bracket {
  rounds: BracketRound[];
}

const ROUND_SEQUENCE: TournamentStage[] = [
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
];

/** Order-independent key for a knockout tie between two teams. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** The team that advances from a finished tie, or undefined if unplayed/level (shootout). */
function decisiveWinner(m: Match): string | undefined {
  if (m.status !== 'STATUS_FINAL') return undefined;
  const { home, away } = m.score;
  if (home == null || away == null || home === away) return undefined;
  return home > away ? m.homeTeam.abbr : m.awayTeam.abbr;
}

/** Rank the 12 third-placed teams (no head-to-head): points → GD → goals → group letter. */
function bestThirdGroups(thirds: { group: string; row: StandingRow }[]): string[] {
  return [...thirds]
    .sort((a, b) =>
      b.row.points - a.row.points ||
      b.row.goalDifference - a.row.goalDifference ||
      b.row.goalsFor - a.row.goalsFor ||
      a.group.localeCompare(b.group)
    )
    .slice(0, 8)
    .map((t) => t.group);
}

export function buildBracket(standings: GroupStanding[], knockout: Match[]): Bracket {
  const byGroup = new Map(standings.map((s) => [s.group, s.table]));

  const rowAt = (group: string, position: number): StandingRow | undefined =>
    byGroup.get(group)?.find((r) => r.position === position);

  const groupComplete = (group: string): boolean => {
    const table = byGroup.get(group);
    return !!table && table.length > 0 && table.every((r) => r.played >= 3);
  };
  const groupStarted = (group: string): boolean =>
    !!byGroup.get(group)?.some((r) => r.played > 0);

  // Best-third assignment is only stable once every group is final; until then the third-placed
  // opponents stay as "3RD A/B/C/D/F" candidate placeholders (matching ESPN).
  const allGroupsComplete = 'ABCDEFGHIJKL'.split('').every((g) => groupComplete(g));

  let thirdAssignment: Record<string, string> | undefined;
  if (allGroupsComplete) {
    const thirds = 'ABCDEFGHIJKL'
      .split('')
      .map((g) => ({ group: g, row: rowAt(g, 3) }))
      .filter((t): t is { group: string; row: StandingRow } => !!t.row);
    if (thirds.length === 12) {
      const key = [...bestThirdGroups(thirds)].sort().join('');
      thirdAssignment = ANNEX_C[key];
    }
  }

  const teamSlot = (team: TeamRef, provisional: boolean): BracketSlot => ({
    kind: 'team',
    team,
    provisional,
  });

  const resolveR32Slot = (slot: Slot): BracketSlot => {
    if ('winner' in slot) {
      const row = rowAt(slot.winner, 1);
      return row && groupStarted(slot.winner)
        ? teamSlot(row.team, !groupComplete(slot.winner))
        : { kind: 'placeholder', label: `1${slot.winner}` };
    }
    if ('runner' in slot) {
      const row = rowAt(slot.runner, 2);
      return row && groupStarted(slot.runner)
        ? teamSlot(row.team, !groupComplete(slot.runner))
        : { kind: 'placeholder', label: `2${slot.runner}` };
    }
    // third: the best-third assigned (via Annex C) to face the winner of group `slot.third`.
    const winnerGroup = slot.third;
    if (thirdAssignment) {
      const fromGroup = thirdAssignment[winnerGroup];
      const row = fromGroup ? rowAt(fromGroup, 3) : undefined;
      if (row) return teamSlot(row.team, false);
    }
    const candidates = THIRD_CANDIDATES[winnerGroup] ?? '';
    return { kind: 'placeholder', label: `3RD ${candidates.split('').join('/')}` };
  };

  // Index played/scheduled knockout fixtures by team pair so resolved ties can attach a score.
  const fixtureByPair = new Map<string, Match>();
  for (const m of knockout) {
    fixtureByPair.set(pairKey(m.homeTeam.abbr, m.awayTeam.abbr), m);
  }

  const built: Record<number, BracketMatch> = {};

  const finalise = (matchNo: number, stage: TournamentStage, home: BracketSlot, away: BracketSlot): BracketMatch => {
    const bm: BracketMatch = { matchNo, stage, home, away };
    if (home.kind === 'team' && away.kind === 'team') {
      const fixture = fixtureByPair.get(pairKey(home.team.abbr, away.team.abbr));
      if (fixture) {
        bm.match = fixture;
        bm.winnerAbbr = decisiveWinner(fixture);
      }
    }
    bm.kickoff = bm.match?.utcDate ?? KNOCKOUT_DATES[matchNo];
    built[matchNo] = bm;
    return bm;
  };

  // Round of 32 from the standings.
  for (const def of R32) {
    finalise(def.match, 'ROUND_OF_32', resolveR32Slot(def.a), resolveR32Slot(def.b));
  }

  // Later rounds: a child contributes its winner (or, for the 3rd-place play-off, its loser)
  // once that tie is decided; otherwise the slot is an ESPN-style "RD32 W2" placeholder.
  const advancing = (childNo: number, takes: 'W' | 'L'): BracketSlot => {
    const child = built[childNo];
    if (child?.winnerAbbr) {
      const slots = [child.home, child.away];
      const target =
        takes === 'W'
          ? slots.find((s) => s.kind === 'team' && s.team.abbr === child.winnerAbbr)
          : slots.find((s) => s.kind === 'team' && s.team.abbr !== child.winnerAbbr);
      if (target && target.kind === 'team') return teamSlot(target.team, false);
    }
    return { kind: 'placeholder', label: feederLabel(childNo, takes) };
  };

  for (const node of TREE) {
    const stage = node.match === 103 ? 'THIRD_PLACE' : node.match === 104 ? 'FINAL'
      : node.match >= 101 ? 'SEMI_FINAL' : node.match >= 97 ? 'QUARTER_FINAL' : 'ROUND_OF_16';
    finalise(node.match, stage, advancing(node.a, node.takes), advancing(node.b, node.takes));
  }

  const rounds: BracketRound[] = ROUND_SEQUENCE.map((stage) => ({
    stage,
    matches: DISPLAY_ORDER[stage].map((no) => built[no]),
  }));

  return { rounds };
}
